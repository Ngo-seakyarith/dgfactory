import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import { routeBrainTask } from "@/lib/brain/routing/router";
import { requireApproved } from "@/lib/route-guards";
import {
  calculatePricing,
  defaultPricingInputs,
  emptyProposalBrief,
  type TrainingPackage,
} from "@/features/training-packages";
import { exportTrainingPackage } from "@/features/training-packages/export/export-package";
import {
  serializeSlideDeckPlan,
  slideDeckGenerationRules,
  type SlideDeckBrainOutput,
} from "@/features/training-packages/export/slide-deck-plan";
import {
  facilitatorGuideGenerationRules,
  promptLibraryGenerationRules,
  serializeFacilitatorGuidePlan,
  serializePromptLibraryPlan,
  serializeWorkbookPlan,
  workbookGenerationRules,
  type FacilitatorGuideBrainOutput,
  type PromptLibraryBrainOutput,
  type WorkbookBrainOutput,
} from "@/features/training-packages/export/material-document-plans";
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
    task: "Create a complete, trainer-ready slide deck for this confirmed training delivery. Develop the requested subject deeply, choose the teaching flow yourself, and match each slide to a supported export layout.",
  },
  workbook: {
    taskType: "workbook",
    task: "Create a complete participant workbook for this confirmed training delivery, with practical activities, reusable workplace templates, response space, reflection, and an action plan.",
  },
  facilitatorGuide: {
    taskType: "facilitator_guide",
    task: "Create a complete facilitator guide for this confirmed training delivery, with a coherent agenda and trainer-ready run instructions.",
  },
  promptLibrary: {
    taskType: "prompt_library",
    task: "Create a copy-ready AI prompt library aligned with this confirmed training delivery and the participants' actual workflows.",
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

    const commonInput = {
      task: definition.task,
      input: materialBrainInput(trainingPackage),
      rules: [
        "Treat the original saved package inputs and proposal brief as authoritative.",
        "Ground all content in the supplied course context; do not invent client-specific facts or missing course details.",
        "Do not assume access to a generated syllabus or proposal.",
        "Write in clear professional English suitable for Cambodia corporate training.",
      ],
    };

    let generatedContent: string;
    let resultMeta: {
      mode: "openai";
      model: string;
      notice?: string;
    };

    if (target === "slides") {
      const result = await routeBrainTask<
        Record<string, unknown>,
        SlideDeckBrainOutput
      >({
        taskType: "slide_outline",
        input: {
          ...commonInput,
          rules: [...commonInput.rules, ...slideDeckGenerationRules],
        },
        retries: 1,
      });
      generatedContent = serializeSlideDeckPlan(result.output.deck);
      resultMeta = result;
    } else if (target === "workbook") {
      const result = await routeBrainTask<Record<string, unknown>, WorkbookBrainOutput>({
        taskType: "workbook",
        input: {
          ...commonInput,
          rules: [...commonInput.rules, ...workbookGenerationRules],
        },
        retries: 1,
      });
      generatedContent = serializeWorkbookPlan(result.output.workbook);
      resultMeta = result;
    } else if (target === "facilitatorGuide") {
      const result = await routeBrainTask<
        Record<string, unknown>,
        FacilitatorGuideBrainOutput
      >({
        taskType: "facilitator_guide",
        input: {
          ...commonInput,
          rules: [...commonInput.rules, ...facilitatorGuideGenerationRules],
        },
        retries: 1,
      });
      generatedContent = serializeFacilitatorGuidePlan(result.output.guide);
      resultMeta = result;
    } else {
      const result = await routeBrainTask<
        Record<string, unknown>,
        PromptLibraryBrainOutput
      >({
        taskType: "prompt_library",
        input: {
          ...commonInput,
          rules: [...commonInput.rules, ...promptLibraryGenerationRules],
        },
        retries: 1,
      });
      generatedContent = serializePromptLibraryPlan(result.output.library);
      resultMeta = result;
    }

    const saved = await saveDeliveryProject({
      ...project,
      materials: { ...project.materials, [target]: generatedContent },
    });

    await saveAuditLog({
      actor: auth.user.actor,
      action: "delivery_material_generated",
      entityType: "delivery_project",
      entityId: project.id,
      metadata: {
        target,
        label: materialLabels[target],
        model: resultMeta.model,
      },
    });

    return NextResponse.json({
      project: saved.project,
      mode: resultMeta.mode,
      model: resultMeta.model,
      notice: resultMeta.notice,
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
