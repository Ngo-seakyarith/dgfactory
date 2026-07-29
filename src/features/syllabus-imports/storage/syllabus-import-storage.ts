import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  normalizePricingInputs,
  type PricingInputs,
} from "@/features/training-packages";

import type {
  SyllabusImportCorrections,
  SyllabusImportStatus,
  SyllabusProposalImport,
  SyllabusProposalMapping,
} from "../domain/types";

export const SYLLABUS_IMPORT_BUCKET = "syllabus-proposal-inputs";
const ABANDONED_IMPORT_DAYS = 7;

type SyllabusImportRow = {
  id: string;
  status: SyllabusImportStatus;
  original_name: string;
  storage_path: string | null;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  pricing_inputs: PricingInputs;
  mapping: SyllabusProposalMapping | null;
  corrections: SyllabusImportCorrections;
  missing_fields: Array<"client" | "trainer" | "participants">;
  package_id: string | null;
  error_message: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

const emptyCorrections: SyllabusImportCorrections = {
  clientId: null,
  clientName: "",
  trainerId: "",
  secondTrainerId: "",
};

function requireSupabase() {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is required for syllabus imports.");
  return supabase;
}

function fromRow(row: SyllabusImportRow): SyllabusProposalImport {
  return {
    id: row.id,
    status: row.status,
    originalName: row.original_name,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    sha256: row.sha256,
    pricingInputs: normalizePricingInputs(row.pricing_inputs),
    mapping: row.mapping,
    corrections: { ...emptyCorrections, ...(row.corrections ?? {}) },
    missingFields: Array.isArray(row.missing_fields) ? row.missing_fields : [],
    packageId: row.package_id,
    errorMessage: row.error_message,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(value: SyllabusProposalImport): SyllabusImportRow {
  return {
    id: value.id,
    status: value.status,
    original_name: value.originalName,
    storage_path: value.storagePath,
    mime_type: value.mimeType,
    size_bytes: value.sizeBytes,
    sha256: value.sha256,
    pricing_inputs: value.pricingInputs,
    mapping: value.mapping,
    corrections: value.corrections,
    missing_fields: value.missingFields,
    package_id: value.packageId,
    error_message: value.errorMessage,
    created_by: value.createdBy,
    created_at: value.createdAt,
    updated_at: value.updatedAt,
  };
}

async function pruneAbandonedImports() {
  const supabase = requireSupabase();
  const cutoff = new Date(
    Date.now() - ABANDONED_IMPORT_DAYS * 24 * 60 * 60 * 1_000,
  ).toISOString();
  const { data, error } = await supabase
    .from("syllabus_imports")
    .select("id, storage_path")
    .neq("status", "Completed")
    .lt("updated_at", cutoff);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{ id: string; storage_path: string | null }>;
  const paths = rows.flatMap((row) => (row.storage_path ? [row.storage_path] : []));
  if (paths.length) {
    const removal = await supabase.storage.from(SYLLABUS_IMPORT_BUCKET).remove(paths);
    if (removal.error) throw new Error(removal.error.message);
  }
  if (rows.length) {
    const deletion = await supabase
      .from("syllabus_imports")
      .delete()
      .in("id", rows.map((row) => row.id));
    if (deletion.error) throw new Error(deletion.error.message);
  }
}

export async function createSyllabusImport({
  originalName,
  mimeType,
  sizeBytes,
  pricingInputs,
  createdBy,
}: {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  pricingInputs: PricingInputs;
  createdBy: string | null;
}) {
  await pruneAbandonedImports().catch(() => undefined);
  const supabase = requireSupabase();
  const id = crypto.randomUUID();
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120);
  const storagePath = `${id}/${safeName}`;
  const now = new Date().toISOString();
  const value: SyllabusProposalImport = {
    id,
    status: "Uploaded",
    originalName,
    storagePath,
    mimeType,
    sizeBytes,
    sha256: "",
    pricingInputs: normalizePricingInputs(pricingInputs),
    mapping: null,
    corrections: emptyCorrections,
    missingFields: [],
    packageId: null,
    errorMessage: "",
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
  const { data, error } = await supabase
    .from("syllabus_imports")
    .insert(toRow(value))
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const signed = await supabase.storage
    .from(SYLLABUS_IMPORT_BUCKET)
    .createSignedUploadUrl(storagePath);
  if (signed.error || !signed.data) {
    await supabase.from("syllabus_imports").delete().eq("id", id);
    throw new Error(signed.error?.message ?? "Unable to create the upload token.");
  }

  return {
    import: fromRow(data as SyllabusImportRow),
    path: signed.data.path,
    token: signed.data.token,
  };
}

export async function getSyllabusImport(id: string) {
  const { data, error } = await requireSupabase()
    .from("syllabus_imports")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromRow(data as SyllabusImportRow) : null;
}

export async function listSyllabusImports() {
  const { data, error } = await requireSupabase()
    .from("syllabus_imports")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => fromRow(row as SyllabusImportRow));
}

export async function saveSyllabusImport(value: SyllabusProposalImport) {
  const next = { ...value, updatedAt: new Date().toISOString() };
  const { data, error } = await requireSupabase()
    .from("syllabus_imports")
    .upsert(toRow(next), { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data as SyllabusImportRow);
}

export async function downloadSyllabusImport(value: SyllabusProposalImport) {
  if (!value.storagePath) throw new Error("The uploaded syllabus is no longer available.");
  const { data, error } = await requireSupabase().storage
    .from(SYLLABUS_IMPORT_BUCKET)
    .download(value.storagePath);
  if (error || !data) throw new Error(error?.message ?? "Unable to download the syllabus.");
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteSyllabusImportSource(value: SyllabusProposalImport) {
  if (!value.storagePath) return value;
  const removal = await requireSupabase().storage
    .from(SYLLABUS_IMPORT_BUCKET)
    .remove([value.storagePath]);
  if (removal.error) throw new Error(removal.error.message);
  return saveSyllabusImport({ ...value, storagePath: null });
}

export async function deleteSyllabusImport(id: string) {
  const value = await getSyllabusImport(id);
  if (!value) return;
  if (value.storagePath) {
    const removal = await requireSupabase().storage
      .from(SYLLABUS_IMPORT_BUCKET)
      .remove([value.storagePath]);
    if (removal.error) throw new Error(removal.error.message);
  }
  const { error } = await requireSupabase()
    .from("syllabus_imports")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
