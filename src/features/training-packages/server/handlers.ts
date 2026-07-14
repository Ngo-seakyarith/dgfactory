import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import { routeBrainTask } from "@/lib/brain/routing/router";
import type { CoursePackageBrainInput } from "@/lib/brain/agents";
import type { KnowledgeSourceNote } from "@/lib/knowledge";
import { knowledgeSourceNotesFromResults } from "@/lib/knowledge";
import {
  formatKnowledgeForBrain,
  retrieveKnowledge,
} from "@/lib/knowledge/retrieve";
import { requireApproved } from "@/lib/route-guards";
import {
  calculatePricing,
  clientPricingSummaryToMarkdown,
  getTrainerById,
  normalizePricingInputs,
  normalizeTrainingInput,
  normalizeTrainingOutputs,
  type ExportFormat,
  type ExportTarget,
  type PricingInputs,
  type TrainingPackage,
  type TrainingPackageOutputs,
} from "@/features/training-packages";
import { exportTrainingPackage } from "@/features/training-packages/export/export-package";
import {
  deleteTrainingPackage,
  getTrainingPackage,
  listTrainingPackages,
  saveTrainingPackage,
} from "@/features/training-packages/storage/training-storage";

const exportFormats: ExportFormat[] = ["docx", "pptx", "md"];
const exportTargets: ExportTarget[] = [
  "full",
  "proposal",
  "syllabus",
  "workbook",
  "follow-up-email",
  "slides",
  "summary",
  "pricing",
];

function packageError(error: unknown) {
  return error instanceof Error ? error.message : "Training package request failed.";
}

function generationError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Training package generation failed.";

  if (message.toLowerCase().includes("missing required fields")) {
    return message;
  }

  if (message.toLowerCase().includes("schema")) {
    return "The Brain Layer returned content in an unexpected structure.";
  }

  return message;
}

export async function listTrainingPackagesRequest(request: Request) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const packages = await listTrainingPackages();
    return NextResponse.json({ packages });
  } catch (error) {
    return NextResponse.json({ error: packageError(error) }, { status: 500 });
  }
}

export async function saveTrainingPackageRequest(request: Request) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as TrainingPackage;

    if (!body.id || !body.title || !body.syllabus) {
      return NextResponse.json(
        { error: "A generated package with id, title, and outputs is required." },
        { status: 400 },
      );
    }

    let existing: TrainingPackage | null = null;
    try {
      existing = await getTrainingPackage(body.id);
    } catch {
      existing = null;
    }

    const result = await saveTrainingPackage(body);
    await saveAuditLog({
      actor: auth.user.actor,
      action: "package_saved",
      entityType: "training_package",
      entityId: result.package.id,
      metadata: {
        title: result.package.title,
        client: result.package.client,
        storage: result.storage,
      },
    });

    if (
      existing &&
      JSON.stringify(existing.pricingInputs) !==
        JSON.stringify(result.package.pricingInputs)
    ) {
      await saveAuditLog({
        actor: auth.user.actor,
        action: "pricing_change",
        entityType: "training_package",
        entityId: result.package.id,
        metadata: {
          title: result.package.title,
          client: result.package.client,
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: packageError(error) }, { status: 500 });
  }
}

export async function getTrainingPackageRequest(
  request: Request,
  params: Promise<{ id: string }>,
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const pkg = await getTrainingPackage(id);

  if (!pkg) {
    return NextResponse.json(
      { error: "Training package was not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ package: pkg });
}

export async function deleteTrainingPackageRequest(
  request: Request,
  params: Promise<{ id: string }>,
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const result = await deleteTrainingPackage(id);

  return NextResponse.json(result);
}

export async function generateTrainingPackageRequest(request: Request) {
  try {
    const body = await request.json();
    const input = normalizeTrainingInput(body);

    if (!getTrainerById(input.proposalBrief?.trainerId ?? "")) {
      return NextResponse.json(
        { error: "Select a DG Academy trainer before generating the package." },
        { status: 400 },
      );
    }

    const pricingInputs = normalizePricingInputs(
      (body as { pricingInputs?: Partial<PricingInputs> }).pricingInputs,
    );
    if (input.proposalBrief) {
      input.proposalBrief.vatStatus = pricingInputs.vatStatus;
    }

    const pricingOutputs = calculatePricing(pricingInputs);
    const knowledgeBriefValues = Object.entries(input.proposalBrief ?? {})
      .filter(
        ([key]) =>
          ![
            "trainerImageUrl",
            "trainerBio",
            "trainerExperience",
            "trainerQualifications",
          ].includes(key),
      )
      .map(([, value]) => value);
    const knowledgeResults = await retrieveKnowledge({
      query: [
        input.courseTitle,
        input.audience,
        input.client,
        input.promise,
        input.context,
        ...knowledgeBriefValues,
      ].join(" "),
      filters: { visibility: "Any" },
      limit: 6,
    });
    const knowledgeContext = formatKnowledgeForBrain(knowledgeResults);
    const knowledgeUsed = knowledgeSourceNotesFromResults(knowledgeResults);
    const brainInput: CoursePackageBrainInput = {
      ...input,
      context: [input.context, knowledgeContext].filter(Boolean).join("\n\n"),
      pricingSummary: clientPricingSummaryToMarkdown(pricingInputs, pricingOutputs),
    };
    const result = await routeBrainTask<CoursePackageBrainInput, TrainingPackageOutputs>({
      taskType: "course_package",
      input: brainInput,
      retries: 1,
    });

    return NextResponse.json({
      outputs: normalizeTrainingOutputs(result.output, input),
      mode: result.mode,
      model: result.model,
      notice: result.notice,
      knowledgeUsed,
    });
  } catch (error) {
    return NextResponse.json({ error: generationError(error) }, { status: 500 });
  }
}

export async function exportTrainingPackageRequest(request: Request) {
  const exportAuth = await requireApproved(request);
  if (!exportAuth.ok) return exportAuth.response;

  try {
    const body = (await request.json()) as {
      format?: ExportFormat;
      target?: ExportTarget;
      package?: TrainingPackage;
    };

    if (!body.format || !exportFormats.includes(body.format)) {
      return NextResponse.json({ error: "Invalid export format." }, { status: 400 });
    }

    if (!body.package?.id || !body.package.title) {
      return NextResponse.json(
        { error: "A saved or generated training package is required." },
        { status: 400 },
      );
    }

    const target = body.target ?? "full";

    if (!exportTargets.includes(target)) {
      return NextResponse.json({ error: "Invalid export target." }, { status: 400 });
    }

    if (body.format === "pptx" && target !== "slides") {
      return NextResponse.json(
        { error: "PPTX export is available for slide deck outlines only." },
        { status: 400 },
      );
    }

    if (
      body.format === "docx" &&
      target === "proposal" &&
      !getTrainerById(body.package.proposalBrief?.trainerId ?? "")
    ) {
      return NextResponse.json(
        { error: "Select a DG Academy trainer before exporting the proposal." },
        { status: 400 },
      );
    }

    const result = await exportTrainingPackage(body.package, body.format, target);

    await saveAuditLog({
      actor: exportAuth.user.actor,
      action: "package_export",
      entityType: "training_package",
      entityId: body.package.id,
      metadata: {
        title: body.package.title,
        format: body.format,
        target,
        filename: result.filename,
      },
    });

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Package export failed.",
      },
      { status: 500 },
    );
  }
}

export type { KnowledgeSourceNote };
