import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scopeAppData, withAppScope } from "@/lib/request-scope";
import type {
  KnowledgeSourceNote,
} from "@/lib/knowledge";
import type { TrainingPackage } from "@/lib/training-packages";
import {
  normalizeProposalBrief,
  type ProposalBrief,
} from "@/lib/proposal-brief";
import {
  normalizeProposalContent,
  proposalContentToMarkdown,
  type ProposalContent,
} from "@/lib/proposal-content";
import {
  calculatePricing,
  defaultPricingInputs,
  normalizePricingInputs,
  type PricingInputs,
} from "@/lib/pricing";

type PackageRow = {
  id: string;
  course_title: string;
  target_learners: string;
  duration: string;
  client_name: string;
  program_goal: string;
  special_requirements: string | null;
  syllabus: string;
  proposal_content: ProposalContent;
  proposal_brief?: Partial<ProposalBrief> | null;
  pricing_inputs?: Partial<PricingInputs> | null;
  knowledge_used?: KnowledgeSourceNote[] | null;
  created_at: string;
  updated_at: string;
};

function toRow(pkg: TrainingPackage) {
  const proposalContent = normalizeProposalContent(pkg.proposalContent, pkg.proposal, {
    title: pkg.title,
    client: pkg.client,
    audience: pkg.audience,
    duration: pkg.duration,
    promise: pkg.promise,
    proposalBrief: pkg.proposalBrief,
  });

  return {
    id: pkg.id,
    course_title: pkg.title,
    target_learners: pkg.audience,
    duration: pkg.duration,
    client_name: pkg.client,
    program_goal: pkg.promise,
    special_requirements: pkg.context,
    syllabus: pkg.syllabus,
    proposal_content: proposalContent,
    proposal_brief: pkg.proposalBrief,
    pricing_inputs: pkg.pricingInputs,
    knowledge_used: pkg.knowledgeUsed ?? [],
    created_at: pkg.createdAt,
    updated_at: pkg.updatedAt,
  };
}

function fromRow(row: PackageRow): TrainingPackage {
  const pricingInputs = normalizePricingInputs(row.pricing_inputs ?? defaultPricingInputs);
  const pricingOutputs = calculatePricing(pricingInputs);
  const proposalBrief = normalizeProposalBrief(row.proposal_brief);
  const proposalContent = normalizeProposalContent(row.proposal_content, "", {
    title: row.course_title,
    client: row.client_name,
    audience: row.target_learners,
    duration: row.duration,
    promise: row.program_goal,
    proposalBrief,
  });

  return {
    id: row.id,
    title: row.course_title,
    audience: row.target_learners,
    duration: row.duration,
    client: row.client_name,
    promise: row.program_goal,
    context: row.special_requirements ?? "",
    tone: "Executive, practical, commercially sharp",
    syllabus: row.syllabus,
    proposal: proposalContentToMarkdown(proposalContent),
    proposalContent,
    proposalBrief,
    commercialProposal: "",
    deckOutline: "",
    workbook: "",
    followUpEmail: "",
    qualityChecklist: [],
    pricingInputs,
    pricingOutputs,
    knowledgeUsed: Array.isArray(row.knowledge_used) ? row.knowledge_used : [],
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

  const scopedRow = withAppScope(toRow(packageToSave));
  const result = await supabase
    .from("training_packages")
    .upsert(scopedRow, { onConflict: "id" })
    .select("*")
    .single();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return {
    package: fromRow(result.data as PackageRow),
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
