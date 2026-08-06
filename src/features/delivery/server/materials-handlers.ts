import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
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
  saveDeliverySlideSelection,
  saveDeliveryProject,
} from "@/features/delivery/storage/delivery-storage";
import {
  isDeliveryMaterialKey,
  slideDeckBlueprintSchema,
  type DeliveryMaterialKey,
  type DeliveryProject,
} from "@/features/delivery";
import type { StartGenerationJob } from "@/features/generation-jobs/domain/types";

type RouteContext = {
  params: Promise<{ id: string }>;
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
    status: "Generated",
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
  startGenerationJob: StartGenerationJob,
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      target?: unknown;
      blueprint?: unknown;
    };

    if (!isDeliveryMaterialKey(body.target)) {
      return NextResponse.json(
        { error: "A valid material target is required." },
        { status: 400 },
      );
    }

    if (body.target === "slides") {
      const blueprint = slideDeckBlueprintSchema.safeParse(body.blueprint);
      if (!blueprint.success) {
        return NextResponse.json(
          {
            error:
              blueprint.error.issues[0]?.message ??
              "A valid slide content selection is required.",
          },
          { status: 400 },
        );
      }
      await saveDeliverySlideSelection(id, blueprint.data);
    }

    const job = await startGenerationJob({
      jobType: "delivery_material",
      resourceType: "delivery_project",
      resourceId: id,
      target: body.target,
      createdBy: auth.user.userId ?? null,
      createdByActor: auth.user.actor,
    });
    return NextResponse.json({ job }, { status: 202 });
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
