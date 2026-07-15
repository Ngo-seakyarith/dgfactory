import { NextResponse } from "next/server";

import { routeBrainTask } from "@/lib/brain/routing/router";
import { requireApproved } from "@/lib/route-guards";
import {
  exportTrainingPackage,
  type ExportFormat,
} from "@/features/training-packages/export/export-package";
import {
  calculatePricing,
  defaultPricingInputs,
  emptyProposalBrief,
  type TrainingPackage,
} from "@/features/training-packages";
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
  type DeliveryDraft,
  type DeliveryDraftKind,
  type DeliveryProject,
  type DeliveryTask,
} from "@/features/delivery";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const draftKinds: DeliveryDraftKind[] = [
  "trainer-checklist",
  "participant-email",
  "training-day-agenda",
  "post-training-report",
];

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

    return NextResponse.json({ project });
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

export async function generateDeliveryDraftHandler(request: Request) {
  const body = (await request.json()) as {
    kind?: DeliveryDraftKind;
    project?: Partial<DeliveryProject>;
    tasks?: DeliveryTask[];
    clientName?: string;
    packageTitle?: string;
    learningObjectives?: string;
  };
  const kind = draftKinds.includes(body.kind as DeliveryDraftKind)
    ? (body.kind as DeliveryDraftKind)
    : "post-training-report";
  const project = normalizeDeliveryProject(body.project ?? {});
  const input = {
    kind,
    project,
    tasks: body.tasks ?? [],
    clientName: String(body.clientName ?? "").trim(),
    packageTitle: String(body.packageTitle ?? "").trim(),
    learningObjectives: String(body.learningObjectives ?? "").trim(),
  };

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is required for delivery draft generation." },
      { status: 503 },
    );
  }

  try {
    const result = await routeBrainTask<Record<string, unknown>, DeliveryDraft>({
      taskType: "delivery_report",
      input: {
        task:
          "Generate a practical delivery support draft for an internal DG Academy training project.",
        input,
        rules: [
          "Suitable for corporate training delivery in Cambodia.",
          "Use a professional, concise, client-ready tone where relevant.",
          "Do not invent attendance or evaluation facts beyond provided inputs.",
          "Do not send messages or imply messages were sent.",
          "For post-training reports, include overview, participant count, objectives, delivery summary, evaluation result, feedback, recommendations, and next opportunities.",
        ],
      },
    });

    return NextResponse.json({
      draft: result.output,
      mode: result.mode,
      model: result.model,
    });
  } catch (error) {
    return NextResponse.json(
      { error: safeGenerationError(error) },
      { status: 500 },
    );
  }
}

export async function exportDeliveryReportHandler(request: Request) {
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

    const pricingOutputs = calculatePricing(defaultPricingInputs);
    const reportPackage: TrainingPackage = {
      id: project.id,
      clientId: project.clientId,
      title: body.packageTitle || project.title,
      audience: "Training participants",
      duration: project.trainingDate || "Completed training",
      client: body.clientName || "Client",
      promise: "Post-training reporting and follow-up recommendations",
      context: project.notes,
      tone: "Professional, clear, executive-friendly",
      syllabus: "",
      proposal: project.postTrainingReport,
      proposalContent: null,
      proposalBrief: emptyProposalBrief,
      commercialProposal: "",
      deckOutline: "",
      workbook: "",
      followUpEmail: "",
      qualityChecklist: [],
      pricingInputs: defaultPricingInputs,
      pricingOutputs,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
    const result = await exportTrainingPackage(reportPackage, body.format, "proposal");
    const filename = `DGAcademy_${filePart(reportPackage.title)}_${filePart(reportPackage.client)}_PostTrainingReport.${body.format}`;

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": result.contentType,
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
