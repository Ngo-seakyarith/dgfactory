import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  KnowledgeSourceNote,
} from "@/lib/knowledge";
import type {
  QualityChecklistItem,
  TrainingPackage,
} from "@/lib/training-packages";
import {
  buildCommercialProposalSection,
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
  commercial_proposal?: string | null;
  deck_outline: string;
  workbook: string;
  follow_up_email?: string;
  quality_checklist?: QualityChecklistItem[] | string | null;
  pricing_inputs?: Partial<PricingInputs> | null;
  pricing_outputs?: PricingOutputs | null;
  knowledge_used?: KnowledgeSourceNote[] | null;
  email?: string;
  checklist?: string;
  generation_mode: "mock" | "openai" | null;
  created_at: string;
  updated_at: string;
};

type TrainingStore = {
  packages: TrainingPackage[];
};

const globalForTrainingStore = globalThis as typeof globalThis & {
  __dgTrainingStore?: TrainingStore;
};

const localStore =
  globalForTrainingStore.__dgTrainingStore ??
  (globalForTrainingStore.__dgTrainingStore = {
    packages: [],
  });

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
    commercial_proposal: pkg.commercialProposal,
    deck_outline: pkg.deckOutline,
    workbook: pkg.workbook,
    follow_up_email: pkg.followUpEmail,
    quality_checklist: pkg.qualityChecklist,
    pricing_inputs: pkg.pricingInputs,
    pricing_outputs: pkg.pricingOutputs,
    knowledge_used: pkg.knowledgeUsed ?? [],
    generation_mode: pkg.generationMode ?? "mock",
    created_at: pkg.createdAt,
    updated_at: pkg.updatedAt,
  };
}

function normalizeChecklist(
  value: QualityChecklistItem[] | string | null | undefined,
): QualityChecklistItem[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is QualityChecklistItem =>
        Boolean(item) &&
        typeof item.category === "string" &&
        typeof item.item === "string" &&
        (item.status === "ready" || item.status === "review"),
    );
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split("\n")
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean)
      .map((item) => ({
        category: "Imported",
        item,
        status: "review" as const,
      }));
  }

  return [];
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
    commercialProposal:
      row.commercial_proposal ??
      buildCommercialProposalSection({
        title: row.title,
        client: row.client,
        inputs: pricingInputs,
        outputs: pricingOutputs,
      }),
    deckOutline: row.deck_outline,
    workbook: row.workbook,
    followUpEmail: row.follow_up_email ?? row.email ?? "",
    qualityChecklist: normalizeChecklist(row.quality_checklist ?? row.checklist),
    pricingInputs,
    pricingOutputs,
    knowledgeUsed: Array.isArray(row.knowledge_used) ? row.knowledge_used : [],
    generationMode: row.generation_mode ?? "mock",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function upsertLocalPackage(pkg: TrainingPackage) {
  const index = localStore.packages.findIndex((item) => item.id === pkg.id);

  if (index >= 0) {
    localStore.packages[index] = pkg;
  } else {
    localStore.packages.unshift(pkg);
  }

  return pkg;
}

export async function listTrainingPackages() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return [...localStore.packages].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  const { data, error } = await supabase
    .from("training_packages")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return [...localStore.packages].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  return (data as PackageRow[]).map(fromRow);
}

export async function getTrainingPackage(id: string) {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("training_packages")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      return fromRow(data as PackageRow);
    }
  }

  return localStore.packages.find((pkg) => pkg.id === id) ?? null;
}

export async function saveTrainingPackage(pkg: TrainingPackage) {
  const packageToSave = {
    ...pkg,
    updatedAt: new Date().toISOString(),
  };

  upsertLocalPackage(packageToSave);

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { package: packageToSave, storage: "local" as const };
  }

  const { data, error } = await supabase
    .from("training_packages")
    .upsert(toRow(packageToSave), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    return { package: packageToSave, storage: "local" as const };
  }

  return {
    package: fromRow(data as PackageRow),
    storage: "supabase" as const,
  };
}

export async function deleteTrainingPackage(id: string) {
  localStore.packages = localStore.packages.filter((pkg) => pkg.id !== id);

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { deleted: true, storage: "local" as const };
  }

  const { error } = await supabase.from("training_packages").delete().eq("id", id);

  if (error) {
    return { deleted: true, storage: "local" as const };
  }

  return { deleted: true, storage: "supabase" as const };
}
