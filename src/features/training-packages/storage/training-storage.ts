import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scopeAppData, withAppScope } from "@/lib/request-scope";
import type { TrainingPackage } from "@/features/training-packages";
import {
  normalizeProposalBrief,
  type ProposalBrief,
} from "@/features/training-packages";
import {
  normalizeProposalContent,
  proposalContentToMarkdown,
  proposalContentToSyllabusMarkdown,
  type ProposalContent,
} from "@/features/training-packages";
import {
  calculatePricing,
  normalizePricingInputs,
} from "@/features/training-packages";

type PackageRow = {
  id: string;
  course_title: string;
  target_learners: string;
  duration: string;
  client_id: string | null;
  client_name: string;
  cover_subtitle: string;
  certification_label: string;
  client_background: string;
  training_need: string;
  expected_learning_outcomes: string;
  content_priorities: string;
  training_methodology: string;
  training_tools_materials: string;
  evaluation_approach: string;
  schedule_date: string;
  schedule_time: string;
  schedule_venue: string;
  trainer_id: string;
  second_trainer_id: string;
  included_items: string;
  client_responsibilities: string;
  billing_arrangement: string;
  payment_instructions: string;
  acceptance_deadline: string;
  proposal_date: string;
  participant_count: number;
  professional_fee: number;
  vat_status: string;
  special_requirements: string | null;
  proposal_content: ProposalContent;
  created_at: string;
  updated_at: string;
};

function toRow(pkg: TrainingPackage) {
  const proposalBrief = pkg.proposalBrief;
  const proposalContent = normalizeProposalContent(pkg.proposalContent, pkg.proposal, {
    title: pkg.title,
    client: pkg.client,
    audience: pkg.audience,
    duration: pkg.duration,
    proposalBrief: pkg.proposalBrief,
  });

  return {
    id: pkg.id,
    course_title: pkg.title,
    target_learners: pkg.audience,
    duration: pkg.duration,
    client_id: pkg.clientId,
    client_name: pkg.client,
    cover_subtitle: proposalBrief.coverSubtitle,
    certification_label: proposalBrief.certificationLabel,
    client_background: proposalBrief.clientBackground,
    training_need: proposalBrief.trainingNeed,
    expected_learning_outcomes: proposalBrief.expectedLearningOutcomes,
    content_priorities: proposalBrief.contentPriorities,
    training_methodology: proposalBrief.methodology,
    training_tools_materials: proposalBrief.trainingTools,
    evaluation_approach: proposalBrief.evaluationApproach,
    schedule_date: proposalBrief.scheduleDate,
    schedule_time: proposalBrief.scheduleTime,
    schedule_venue: proposalBrief.scheduleVenue,
    trainer_id: proposalBrief.trainerId,
    second_trainer_id: proposalBrief.secondTrainerId,
    included_items: proposalBrief.includedItems,
    client_responsibilities: proposalBrief.clientResponsibilities,
    billing_arrangement: proposalBrief.billingArrangement,
    payment_instructions: proposalBrief.paymentInstructions,
    acceptance_deadline: proposalBrief.acceptanceDeadline,
    proposal_date: proposalBrief.proposalDate,
    participant_count: pkg.pricingInputs.numberOfParticipants,
    professional_fee: pkg.pricingInputs.professionalFee,
    vat_status: pkg.pricingInputs.vatStatus,
    special_requirements: pkg.context,
    proposal_content: proposalContent,
    created_at: pkg.createdAt,
    updated_at: pkg.updatedAt,
  };
}

function fromRow(row: PackageRow): TrainingPackage {
  const pricingInputs = normalizePricingInputs({
    numberOfParticipants: Number(row.participant_count),
    professionalFee: Number(row.professional_fee),
    vatStatus: row.vat_status,
  });
  const pricingOutputs = calculatePricing(pricingInputs);
  const proposalBrief = normalizeProposalBrief({
    coverSubtitle: row.cover_subtitle,
    certificationLabel: row.certification_label,
    clientBackground: row.client_background,
    trainingNeed: row.training_need,
    expectedLearningOutcomes: row.expected_learning_outcomes,
    contentPriorities: row.content_priorities,
    methodology: row.training_methodology,
    trainingTools: row.training_tools_materials,
    evaluationApproach: row.evaluation_approach,
    scheduleDate: row.schedule_date,
    scheduleTime: row.schedule_time,
    scheduleVenue: row.schedule_venue,
    trainerId: row.trainer_id,
    secondTrainerId: row.second_trainer_id,
    includedItems: row.included_items,
    clientResponsibilities: row.client_responsibilities,
    billingArrangement: row.billing_arrangement,
    paymentInstructions: row.payment_instructions,
    acceptanceDeadline: row.acceptance_deadline,
    proposalDate: row.proposal_date,
  });
  const proposalContent = normalizeProposalContent(row.proposal_content, "", {
    title: row.course_title,
    client: row.client_name,
    audience: row.target_learners,
    duration: row.duration,
    proposalBrief,
  });

  return {
    id: row.id,
    status: proposalContent.generationStatus,
    title: row.course_title,
    audience: row.target_learners,
    duration: row.duration,
    clientId: row.client_id ?? null,
    client: row.client_name,
    context: row.special_requirements ?? "",
    tone: "Executive, practical, commercially sharp",
    syllabus: proposalContentToSyllabusMarkdown(proposalContent),
    proposal: proposalContentToMarkdown(proposalContent),
    proposalContent,
    proposalBrief,
    commercialProposal: "",
    deckOutline: "",
    workbook: "",
    followUpEmail: "",
    pricingInputs,
    pricingOutputs,
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
