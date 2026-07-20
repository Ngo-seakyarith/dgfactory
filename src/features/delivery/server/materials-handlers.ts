import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import { routeBrainTask } from "@/lib/brain/routing/router";
import type { TextAgentOutput } from "@/lib/brain/agents";
import { requireApproved } from "@/lib/route-guards";
import {
  calculatePricing,
  defaultPricingInputs,
  emptyProposalBrief,
  type TrainingPackage,
} from "@/features/training-packages";
import { exportTrainingPackage } from "@/features/training-packages/export/export-package";
import type { ExportFormat, ExportTarget } from "@/features/training-packages/export/types";
import { getTrainingPackage } from "@/features/training-packages/storage/training-storage";
import {
  getDeliveryProject,
  saveDeliveryProject,
} from "@/features/delivery/storage/delivery-storage";
import {
  isDeliveryMaterialKey,
  type DeliveryMaterialKey,
  type DeliveryProject,
} from "@/features/delivery";
import { packageGenerationContext } from "@/features/delivery/server/package-generation-context";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const materialTasks: Record<
  DeliveryMaterialKey,
  { taskType: "slide_outline" | "workbook" | "facilitator_guide" | "prompt_library"; task: string }
> = {
  slides: {
    taskType: "slide_outline",
    task: "Create a complete slide deck outline for this confirmed training delivery: agenda, section-by-section slides with titles and key content points, exercise slides, and closing action-plan slides.",
  },
  workbook: {
    taskType: "workbook",
    task: "Create a participant workbook of roughly 6 to 10 pages in Markdown for this confirmed training delivery: a welcome page, per-module exercises with clear instructions and answer spaces, reflection prompts, practical templates participants reuse at work, and a personal 30-day action plan page.",
  },
  facilitatorGuide: {
    taskType: "facilitator_guide",
    task: "Create the facilitator guide of roughly five pages for this confirmed training delivery.",
  },
  promptLibrary: {
    taskType: "prompt_library",
    task: "Create the AI prompt library for participants of this confirmed training delivery.",
  },
};

const materialLabels: Record<DeliveryMaterialKey, string> = {
  slides: "Slide deck outline",
  workbook: "Participant workbook",
  facilitatorGuide: "Facilitator guide",
  promptLibrary: "AI prompt library",
};

const materialExportTargets: Record<DeliveryMaterialKey, ExportTarget> = {
  slides: "slides",
  workbook: "workbook",
  facilitatorGuide: "facilitator-guide",
  promptLibrary: "prompt-library",
};

function friendlyError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function filePart(value: string) {
  return (
    value
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 72) || "TrainingMaterial"
  );
}

async function loadDeliveryContext(id: string) {
  const project = await getDeliveryProject(id);
  if (!project.packageId) {
    throw new Error(
      "A linked saved package is required before generating delivery materials.",
    );
  }
  const trainingPackage = await getTrainingPackage(project.packageId);

  return { project, trainingPackage };
}

function materialBrainInput(trainingPackage: TrainingPackage) {
  return packageGenerationContext(trainingPackage);
}

function exportPackageForDelivery(
  project: DeliveryProject,
  trainingPackage: TrainingPackage | null,
): TrainingPackage {
  if (trainingPackage) {
    return {
      ...trainingPackage,
      deckOutline: project.materials.slides,
      workbook: project.materials.workbook,
      facilitatorGuide: project.materials.facilitatorGuide,
      promptLibrary: project.materials.promptLibrary,
    };
  }

  return {
    id: project.id,
    clientId: project.clientId,
    title: project.title,
    audience: "Training participants",
    duration: project.trainingDate || "Confirmed training",
    client: "Client",
    promise: "Confirmed training delivery",
    context: project.notes,
    tone: "Professional, clear, executive-friendly",
    syllabus: "",
    proposal: "",
    proposalContent: null,
    proposalBrief: emptyProposalBrief,
    commercialProposal: "",
    deckOutline: project.materials.slides,
    workbook: project.materials.workbook,
    facilitatorGuide: project.materials.facilitatorGuide,
    promptLibrary: project.materials.promptLibrary,
    followUpEmail: "",
    qualityChecklist: [],
    pricingInputs: defaultPricingInputs,
    pricingOutputs: calculatePricing(defaultPricingInputs),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export async function generateDeliveryMaterialHandler(
  request: Request,
  context: RouteContext,
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { target?: unknown };

    if (!isDeliveryMaterialKey(body.target)) {
      return NextResponse.json(
        { error: "A valid material target is required." },
        { status: 400 },
      );
    }

    const target = body.target;
    const { project, trainingPackage } = await loadDeliveryContext(id);
    const definition = materialTasks[target];

    const result = await routeBrainTask<Record<string, unknown>, TextAgentOutput>({
      taskType: definition.taskType,
      input: {
        task: definition.task,
        input: materialBrainInput(trainingPackage),
        rules: [
          "Treat the original saved package inputs and proposal brief as authoritative.",
          "Ground all content in the supplied course context; do not invent client-specific facts or missing course details.",
          "Do not assume access to a generated syllabus or proposal.",
          "Write in clear professional English suitable for Cambodia corporate training.",
          "Return Markdown only.",
        ],
      },
      retries: 1,
    });

    const saved = await saveDeliveryProject({
      ...project,
      materials: { ...project.materials, [target]: result.output.content },
    });

    await saveAuditLog({
      actor: auth.user.actor,
      action: "delivery_material_generated",
      entityType: "delivery_project",
      entityId: project.id,
      metadata: {
        target,
        label: materialLabels[target],
        model: result.model,
      },
    });

    return NextResponse.json({
      project: saved.project,
      mode: result.mode,
      model: result.model,
      notice: result.notice,
    });
  } catch (error) {
    return NextResponse.json(
      { error: friendlyError(error, "Training material generation failed.") },
      { status: 500 },
    );
  }
}

export async function exportDeliveryMaterialHandler(
  request: Request,
  context: RouteContext,
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      target?: unknown;
      format?: ExportFormat;
    };

    if (!isDeliveryMaterialKey(body.target)) {
      return NextResponse.json(
        { error: "A valid material target is required." },
        { status: 400 },
      );
    }

    const target = body.target;
    const format: ExportFormat = target === "slides" ? "pptx" : "docx";

    const { project, trainingPackage } = await loadDeliveryContext(id);

    if (!project.materials[target]?.trim()) {
      return NextResponse.json(
        { error: `Generate the ${materialLabels[target].toLowerCase()} first.` },
        { status: 400 },
      );
    }

    const exportPackage = exportPackageForDelivery(project, trainingPackage);
    const result = await exportTrainingPackage(
      exportPackage,
      format,
      materialExportTargets[target],
    );
    const filename = `DGAcademy_${filePart(project.title)}_${filePart(materialLabels[target])}.${format}`;

    await saveAuditLog({
      actor: auth.user.actor,
      action: "delivery_material_export",
      entityType: "delivery_project",
      entityId: project.id,
      metadata: { target, format, filename },
    });

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: friendlyError(error, "Training material export failed.") },
      { status: 500 },
    );
  }
}
