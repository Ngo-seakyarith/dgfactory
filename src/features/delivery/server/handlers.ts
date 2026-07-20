import { NextResponse } from "next/server";

import { routeBrainTask } from "@/lib/brain/routing/router";
import { requireApproved } from "@/lib/route-guards";
import type { ExportFormat } from "@/features/training-packages/export/export-package";
import type { TrainingPackage } from "@/features/training-packages";
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
  summarizeEvaluationResponses,
  type DeliveryDraft,
  type DeliveryProject,
  type DeliveryTask,
} from "@/features/delivery";
import {
  getEvaluationFormByDelivery,
  listEvaluationResponses,
} from "@/features/delivery/storage/evaluation-storage";
import { getTrainingPackage } from "@/features/training-packages/storage/training-storage";
import { packageGenerationContext } from "@/features/delivery/server/package-generation-context";
import { createPostTrainingReportDocx } from "@/features/delivery/export/post-training-report-docx";

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
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as {
    project?: Partial<DeliveryProject>;
  };
  const project = normalizeDeliveryProject(body.project ?? {});

  if (!project.packageId) {
    return NextResponse.json(
      { error: "A linked saved package is required before generating a post-training report." },
      { status: 400 },
    );
  }

  let trainingPackage: TrainingPackage;
  try {
    trainingPackage = await getTrainingPackage(project.packageId);
  } catch (error) {
    return NextResponse.json(
      { error: friendlyError(error, "The linked saved package could not be loaded.") },
      { status: 500 },
    );
  }

  let participantEvaluation: Record<string, unknown> | null = null;
  try {
    const form = project.id ? await getEvaluationFormByDelivery(project.id) : null;
    const responses = form ? await listEvaluationResponses(form.id) : [];
    const summary = form ? summarizeEvaluationResponses(form, responses) : null;

    if (summary && summary.responseCount > 0) {
      participantEvaluation = {
        responseCount: summary.responseCount,
        averageSatisfactionScore: summary.ratingQuestionCount
          ? Math.round(summary.overallAverage * 10) / 10
          : null,
        ratingResults: summary.questions
          .filter((question) => question.type === "rating")
          .map((question) => ({
            question: question.label,
            answered: question.answered,
            average:
              question.type === "rating"
                ? Math.round(question.average * 10) / 10
                : 0,
          })),
        choiceResults: summary.questions
          .filter((question) => question.type === "choice")
          .map((question) => ({
            question: question.label,
            counts: question.type === "choice" ? question.options : [],
          })),
        participantComments: summary.questions
          .filter((question) => question.type === "text")
          .flatMap((question) =>
            question.type === "text"
              ? question.answers.map((answer) => ({
                  question: question.label,
                  answer,
                }))
              : [],
          ),
      };
    }
  } catch {
    participantEvaluation = null;
  }

  const input = {
    packageContext: packageGenerationContext(trainingPackage),
    scheduledDelivery: {
      date: trainingPackage.proposalBrief.scheduleDate,
      time: trainingPackage.proposalBrief.scheduleTime,
      venue: trainingPackage.proposalBrief.scheduleVenue,
      trainer: trainingPackage.proposalBrief.trainerName,
    },
    deliveryEvidence: {
      status: project.deliveryStatus,
      actualParticipantCount: project.participantCount,
      trainingDayNotes: project.notes,
      recordedSatisfactionScore: project.evaluation.averageSatisfactionScore,
      recordedKeyComments: project.evaluation.keyComments,
      clientFeedback: project.evaluation.clientFeedback,
      trainerReflection: project.evaluation.trainerReflection,
      learnerFeedback: project.evaluation.learnerFeedback,
      improvementSuggestions: project.evaluation.improvementSuggestions,
    },
    participantEvaluation,
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
          "Generate a client-ready post-training report for a completed DG Academy training delivery.",
        input,
        rules: [
          "Suitable for corporate training delivery in Cambodia.",
          "Use a professional, concise, client-ready tone where relevant.",
          "Treat packageContext as the original planned course context and deliveryEvidence plus participantEvaluation as evidence of what happened.",
          "Do not claim that planned content was delivered unless the recorded evidence supports it.",
          "The generated syllabus, generated materials, and any previous report draft are intentionally excluded.",
          "Do not invent attendance or evaluation facts beyond provided inputs.",
          "Do not send messages or imply messages were sent.",
          "participantEvaluation contains aggregated results from the digital participant evaluation form: use its averageSatisfactionScore, rating results, choice counts, and participant comments as the evaluation evidence when it is present.",
          "When participantEvaluation is null, state that participant evaluation results are not recorded yet instead of inventing them.",
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
