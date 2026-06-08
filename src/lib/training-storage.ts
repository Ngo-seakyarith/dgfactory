import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scopeAppData, withAppScope } from "@/lib/request-scope";
import type {
  KnowledgeSourceNote,
} from "@/lib/knowledge";
import type { TrainingPackage } from "@/lib/training-packages";
import {
  calculatePricing,
  defaultPricingInputs,
  normalizePricingInputs,
  type PricingInputs,
  type PricingOutputs,
} from "@/lib/pricing";

type PackageRow = {
  id: string;
  title: string;
  audience: string;
  duration: string;
  client: string;
  promise: string;
  context: string | null;
  tone: string | null;
  syllabus: string;
  proposal: string;
  pricing_inputs?: Partial<PricingInputs> | null;
  pricing_outputs?: PricingOutputs | null;
  knowledge_used?: KnowledgeSourceNote[] | null;
  generation_mode: "openai" | null;
  created_at: string;
  updated_at: string;
};

function toRow(pkg: TrainingPackage) {
  return {
    id: pkg.id,
    title: pkg.title,
    audience: pkg.audience,
    duration: pkg.duration,
    client: pkg.client,
    promise: pkg.promise,
    context: pkg.context,
    tone: pkg.tone,
    syllabus: pkg.syllabus,
    proposal: pkg.proposal,
    pricing_inputs: pkg.pricingInputs,
    pricing_outputs: pkg.pricingOutputs,
    knowledge_used: pkg.knowledgeUsed ?? [],
    generation_mode: pkg.generationMode ?? "openai",
    created_at: pkg.createdAt,
    updated_at: pkg.updatedAt,
  };
}

function fromRow(row: PackageRow): TrainingPackage {
  const pricingInputs = normalizePricingInputs(row.pricing_inputs ?? defaultPricingInputs);
  const pricingOutputs = row.pricing_outputs ?? calculatePricing(pricingInputs);

  return {
    id: row.id,
    title: row.title,
    audience: row.audience,
    duration: row.duration,
    client: row.client,
    promise: row.promise,
    context: row.context ?? "",
    tone: row.tone ?? "",
    syllabus: row.syllabus,
    proposal: row.proposal,
    commercialProposal: "",
    deckOutline: "",
    workbook: "",
    followUpEmail: "",
    qualityChecklist: [],
    pricingInputs,
    pricingOutputs,
    knowledgeUsed: Array.isArray(row.knowledge_used) ? row.knowledge_used : [],
    generationMode: row.generation_mode ?? "openai",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listTrainingPackages() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to list training packages.");
  }

  const query = supabase
    .from("training_packages")
    .select("*")
    .order("updated_at", { ascending: false });
  const { data, error } = await scopeAppData(query);

  if (error) {
    throw new Error(error.message);
  }

  return (data as PackageRow[]).map(fromRow);
}

export async function getTrainingPackage(id: string) {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await scopeAppData(
      supabase.from("training_packages").select("*").eq("id", id),
    ).maybeSingle();

    if (!error && data) {
      return fromRow(data as PackageRow);
    }
  }

  throw new Error("Supabase is required to load training packages.");
}

export async function saveTrainingPackage(pkg: TrainingPackage) {
  const packageToSave = {
    ...pkg,
    updatedAt: new Date().toISOString(),
  };

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to save training packages.");
  }

  const { data, error } = await supabase
    .from("training_packages")
    .upsert(withAppScope(toRow(packageToSave)), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    package: fromRow(data as PackageRow),
    storage: "supabase" as const,
  };
}

export async function deleteTrainingPackage(id: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to delete training packages.");
  }

  const { error } = await scopeAppData(
    supabase.from("training_packages").delete().eq("id", id),
  );

  if (error) {
    throw new Error(error.message);
  }

  return { deleted: true, storage: "supabase" as const };
}
