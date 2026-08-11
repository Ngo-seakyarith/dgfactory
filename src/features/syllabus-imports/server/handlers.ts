import { NextResponse } from "next/server";
import { z } from "zod";

import type { StartGenerationJob } from "@/features/generation-jobs/domain/types";
import {
  getTrainerById,
  normalizePricingInputs,
  type PricingInputs,
} from "@/features/training-packages";
import { saveAuditLog } from "@/lib/audit";
import { requireApproved } from "@/lib/route-guards";

import { defaultSyllabusMimeType } from "../domain/file-types";
import {
  createSyllabusImport,
  deleteSyllabusImport,
  getSyllabusImport,
  listSyllabusImports,
  saveSyllabusImport,
} from "../storage/syllabus-import-storage";
import { validateSyllabusUpload } from "./parse-syllabus";

const correctionSchema = z.strictObject({
  clientId: z.string().uuid().nullable().optional(),
  clientName: z.string().max(200).optional(),
  trainerId: z.string().max(160).optional(),
  secondTrainerId: z.string().max(160).optional(),
  numberOfParticipants: z.number().int().positive().optional(),
});

function message(error: unknown) {
  return error instanceof Error ? error.message : "The syllabus import request failed.";
}

function validatePricing(pricing: PricingInputs) {
  if (pricing.professionalFee <= 0) {
    throw new Error("Enter a professional fee greater than zero.");
  }
}

export async function createSyllabusImportRequest(request: Request) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const body = (await request.json()) as {
      name?: string;
      mimeType?: string;
      sizeBytes?: number;
      pricingInputs?: Partial<PricingInputs>;
    };
    const name = String(body.name ?? "").trim();
    const mimeType = String(body.mimeType ?? "").trim();
    const sizeBytes = Number(body.sizeBytes ?? 0);
    validateSyllabusUpload({ name, mimeType, sizeBytes });
    const pricingInputs = normalizePricingInputs(body.pricingInputs);
    validatePricing(pricingInputs);
    const created = await createSyllabusImport({
      originalName: name,
      mimeType: mimeType || defaultSyllabusMimeType(name),
      sizeBytes,
      pricingInputs,
      createdBy: auth.user.userId ?? null,
    });
    await saveAuditLog({
      actor: auth.user.actor,
      action: "syllabus_import_created",
      entityType: "syllabus_import",
      entityId: created.import.id,
      metadata: { sourceFilename: name, sizeBytes },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 400 });
  }
}

export async function listSyllabusImportsRequest(request: Request) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ imports: await listSyllabusImports() });
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 500 });
  }
}

export async function getSyllabusImportRequest(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    const value = await getSyllabusImport(id);
    return value
      ? NextResponse.json({ import: value })
      : NextResponse.json({ error: "Syllabus import was not found." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 500 });
  }
}

export async function updateSyllabusImportRequest(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    const value = await getSyllabusImport(id);
    if (!value) {
      return NextResponse.json({ error: "Syllabus import was not found." }, { status: 404 });
    }
    if (value.status === "Completed") {
      return NextResponse.json({ error: "This syllabus import is already complete." }, { status: 409 });
    }
    const { numberOfParticipants, ...corrections } = correctionSchema.parse(
      await request.json(),
    );
    if (corrections.trainerId && !getTrainerById(corrections.trainerId)) {
      return NextResponse.json({ error: "Select an approved DG Academy trainer." }, { status: 400 });
    }
    if (
      corrections.secondTrainerId &&
      (!getTrainerById(corrections.secondTrainerId) ||
        corrections.secondTrainerId === corrections.trainerId)
    ) {
      return NextResponse.json(
        { error: "Select a different approved profile for the second trainer." },
        { status: 400 },
      );
    }
    const nextCorrections = { ...value.corrections };
    for (const [key, correction] of Object.entries(corrections)) {
      if (correction !== undefined) {
        Object.assign(nextCorrections, { [key]: correction });
      }
    }
    if (
      nextCorrections.secondTrainerId &&
      nextCorrections.secondTrainerId === nextCorrections.trainerId
    ) {
      return NextResponse.json(
        { error: "Select a different approved profile for the second trainer." },
        { status: 400 },
      );
    }
    const saved = await saveSyllabusImport({
      ...value,
      corrections: nextCorrections,
      pricingInputs:
        numberOfParticipants === undefined
          ? value.pricingInputs
          : normalizePricingInputs({
              ...value.pricingInputs,
              numberOfParticipants,
            }),
      errorMessage: "",
    });
    return NextResponse.json({ import: saved });
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ error: message(error) }, { status });
  }
}

export async function deleteSyllabusImportRequest(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    await deleteSyllabusImport(id);
    await saveAuditLog({
      actor: auth.user.actor,
      action: "syllabus_import_deleted",
      entityType: "syllabus_import",
      entityId: id,
      metadata: {},
    });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 500 });
  }
}

export async function generateSyllabusImportRequest(
  request: Request,
  context: { params: Promise<{ id: string }> },
  startGenerationJob: StartGenerationJob,
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    const value = await getSyllabusImport(id);
    if (!value) {
      return NextResponse.json({ error: "Syllabus import was not found." }, { status: 404 });
    }
    if (value.status === "Completed") {
      return NextResponse.json({ import: value });
    }
    validatePricing(value.pricingInputs);
    const job = await startGenerationJob({
      jobType: "syllabus_proposal",
      resourceType: "syllabus_import",
      resourceId: id,
      createdBy: auth.user.userId ?? null,
      createdByActor: auth.user.actor,
    });
    return NextResponse.json({ job }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 500 });
  }
}
