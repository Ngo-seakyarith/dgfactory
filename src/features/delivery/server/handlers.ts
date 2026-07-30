import { NextResponse } from "next/server";

import { requireApproved } from "@/lib/route-guards";
import type { ExportFormat } from "@/features/training-packages/export/export-package";
import {
  deleteDeliveryProject,
  deleteDeliveryTask,
  getDeliveryProject,
  listDeliveryProjects,
  listDeliveryTasks,
  saveDeliveryProject,
  saveDeliveryTask,
} from "@/features/delivery/storage/delivery-storage";
import {
  normalizeDeliveryProject,
  type DeliveryProject,
  type DeliveryTask,
} from "@/features/delivery";
import { getTrainingPackage } from "@/features/training-packages/storage/training-storage";
import { createPostTrainingReportDocx } from "@/features/delivery/export/post-training-report-docx";
import type { StartGenerationJob } from "@/features/generation-jobs/domain/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const reportExportFormats: ExportFormat[] = ["docx"];

function friendlyError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function safeGenerationError(error: unknown) {
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : undefined;

  if (status === 401) {
    return "OpenRouter key was rejected. Delivery draft generation failed.";
  }

  if (status === 429) {
    return "OpenRouter rate limit or quota was reached. Delivery draft generation failed.";
  }

  return error instanceof Error
    ? error.message
    : "OpenRouter delivery generation failed.";
}

function filePart(value: string) {
  return (
    value
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 72) || "DeliveryReport"
  );
}

export async function listDeliveryProjectsHandler(request: Request) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const projects = await listDeliveryProjects();
    return NextResponse.json({ projects });
  } catch (error) {
    return NextResponse.json(
      { error: friendlyError(error, "Delivery project request failed.") },
      { status: 500 },
    );
  }
}

export async function saveDeliveryProjectHandler(request: Request) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as Partial<DeliveryProject>;

    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: "Delivery project title is required." },
        { status: 400 },
      );
    }

    const result = await saveDeliveryProject(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: friendlyError(error, "Delivery project request failed.") },
      { status: 500 },
    );
  }
}

export async function getDeliveryProjectHandler(
  request: Request,
  context: RouteContext,
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const project = await getDeliveryProject(id);

    if (!project) {
      return NextResponse.json(
        { error: "Delivery project not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { project },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: friendlyError(error, "Delivery project request failed.") },
      { status: 500 },
    );
  }
}

export async function deleteDeliveryProjectHandler(
  request: Request,
  context: RouteContext,
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const result = await deleteDeliveryProject(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: friendlyError(error, "Delivery project request failed.") },
      { status: 500 },
    );
  }
}

export async function generateDeliveryDraftHandler(
  request: Request,
  startGenerationJob: StartGenerationJob,
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as { projectId?: string };
    const projectId = body.projectId?.trim();
    if (!projectId) {
      return NextResponse.json(
        { error: "Save the delivery record before generating its report." },
        { status: 400 },
      );
    }
    const project = await getDeliveryProject(projectId);
    if (!project.packageId) {
      return NextResponse.json(
        { error: "A linked saved package is required before generating a post-training report." },
        { status: 400 },
      );
    }
    const job = await startGenerationJob({
      jobType: "delivery_report",
      resourceType: "delivery_project",
      resourceId: projectId,
      createdBy: auth.user.userId ?? null,
      createdByActor: auth.user.actor,
    });
    return NextResponse.json({ job }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: safeGenerationError(error) },
      { status: 500 },
    );
  }
}

export async function exportDeliveryReportHandler(request: Request) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      format?: ExportFormat;
      project?: Partial<DeliveryProject>;
      clientName?: string;
      packageTitle?: string;
    };

    if (!body.format || !reportExportFormats.includes(body.format)) {
      return NextResponse.json(
        { error: "Post-training report export supports DOCX." },
        { status: 400 },
      );
    }

    const project = normalizeDeliveryProject(body.project ?? {});

    if (!project.title || !project.postTrainingReport) {
      return NextResponse.json(
        { error: "A delivery project with a report draft is required." },
        { status: 400 },
      );
    }

    const linkedPackage = project.packageId
      ? await getTrainingPackage(project.packageId).catch(() => null)
      : null;
    const title = linkedPackage?.title || body.packageTitle || project.title;
    const client = linkedPackage?.client || body.clientName || "Client";
    const buffer = await createPostTrainingReportDocx({
      title,
      client,
      reportMarkdown: project.postTrainingReport,
      updatedAt: project.updatedAt,
      participantCount: project.participantCount,
      trainingDate:
        project.trainingDate || linkedPackage?.proposalBrief.scheduleDate || "",
      trainingTime: linkedPackage?.proposalBrief.scheduleTime || "",
      venue: project.location || linkedPackage?.proposalBrief.scheduleVenue || "",
      trainerName:
        project.trainerName || linkedPackage?.proposalBrief.trainerName || "",
    });
    const filename = `DGAcademy_${filePart(title)}_${filePart(client)}_PostTrainingReport.${body.format}`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: friendlyError(error, "Post-training report export failed."),
      },
      { status: 500 },
    );
  }
}

export async function listDeliveryTasksHandler(request: Request) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const deliveryProjectId = url.searchParams.get("deliveryProjectId") ?? undefined;
    const tasks = await listDeliveryTasks(deliveryProjectId);
    return NextResponse.json({ tasks });
  } catch (error) {
    return NextResponse.json(
      { error: friendlyError(error, "Delivery task request failed.") },
      { status: 500 },
    );
  }
}

export async function saveDeliveryTaskHandler(request: Request) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as Partial<DeliveryTask>;

    if (!body.deliveryProjectId?.trim() || !body.title?.trim()) {
      return NextResponse.json(
        { error: "Delivery project and task title are required." },
        { status: 400 },
      );
    }

    const result = await saveDeliveryTask(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: friendlyError(error, "Delivery task request failed.") },
      { status: 500 },
    );
  }
}

export async function deleteDeliveryTaskHandler(
  request: Request,
  context: RouteContext,
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const result = await deleteDeliveryTask(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: friendlyError(error, "Delivery task request failed.") },
      { status: 500 },
    );
  }
}
