import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scopeByOrganization, withOrganizationId } from "@/lib/organization-scope";
import {
  calculateQualityMetrics,
  normalizeOutputEvaluation,
  normalizePromptImprovementSuggestion,
  type OutputEvaluation,
  type OutputEvaluationType,
  type PromptImprovementSuggestion,
  type PromptSuggestionStatus,
  type ReviewerType,
} from "@/lib/evaluations";

type OutputEvaluationRow = {
  id: string;
  package_id: string | null;
  delivery_project_id: string | null;
  output_type: OutputEvaluationType | null;
  score: number | null;
  reviewer_type: ReviewerType | null;
  feedback: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  improvement_suggestions: string[] | null;
  risks?: string[] | null;
  created_at: string;
};

type PromptImprovementSuggestionRow = {
  id: string;
  source_evaluation_id: string | null;
  target_agent: string;
  current_prompt_summary: string | null;
  suggested_change: string;
  reason: string | null;
  status: PromptSuggestionStatus | null;
  created_at: string;
  updated_at: string;
};

function evaluationToRow(evaluation: OutputEvaluation) {
  return {
    id: evaluation.id,
    package_id: evaluation.packageId,
    delivery_project_id: evaluation.deliveryProjectId,
    output_type: evaluation.outputType,
    score: evaluation.score,
    reviewer_type: evaluation.reviewerType,
    feedback: evaluation.feedback,
    strengths: evaluation.strengths,
    weaknesses: evaluation.weaknesses,
    improvement_suggestions: evaluation.improvementSuggestions,
    risks: evaluation.risks,
    created_at: evaluation.createdAt,
  };
}

function evaluationFromRow(row: OutputEvaluationRow) {
  return normalizeOutputEvaluation({
    id: row.id,
    packageId: row.package_id,
    deliveryProjectId: row.delivery_project_id,
    outputType: row.output_type ?? "full_package",
    score: row.score ?? 0,
    reviewerType: row.reviewer_type ?? "Internal Team",
    feedback: row.feedback ?? "",
    strengths: row.strengths ?? [],
    weaknesses: row.weaknesses ?? [],
    improvementSuggestions: row.improvement_suggestions ?? [],
    risks: row.risks ?? [],
    createdAt: row.created_at,
  });
}

function suggestionToRow(suggestion: PromptImprovementSuggestion) {
  return {
    id: suggestion.id,
    source_evaluation_id: suggestion.sourceEvaluationId,
    target_agent: suggestion.targetAgent,
    current_prompt_summary: suggestion.currentPromptSummary,
    suggested_change: suggestion.suggestedChange,
    reason: suggestion.reason,
    status: suggestion.status,
    created_at: suggestion.createdAt,
    updated_at: suggestion.updatedAt,
  };
}

function suggestionFromRow(row: PromptImprovementSuggestionRow) {
  return normalizePromptImprovementSuggestion({
    id: row.id,
    sourceEvaluationId: row.source_evaluation_id,
    targetAgent: row.target_agent,
    currentPromptSummary: row.current_prompt_summary ?? "",
    suggestedChange: row.suggested_change,
    reason: row.reason ?? "",
    status: row.status ?? "Suggested",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export async function listOutputEvaluations(filters: {
  packageId?: string;
  deliveryProjectId?: string;
} = {}) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to list output evaluations.");
  }

  let query = scopeByOrganization(supabase
    .from("output_evaluations")
    .select("*")
    .order("created_at", { ascending: false }));

  if (filters.packageId) {
    query = query.eq("package_id", filters.packageId);
  }

  if (filters.deliveryProjectId) {
    query = query.eq("delivery_project_id", filters.deliveryProjectId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data as OutputEvaluationRow[]).map(evaluationFromRow);
}

export async function saveOutputEvaluation(input: Partial<OutputEvaluation>) {
  const evaluation = normalizeOutputEvaluation(input);
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to save output evaluations.");
  }

  const { data, error } = await supabase
    .from("output_evaluations")
    .upsert(withOrganizationId(evaluationToRow(evaluation)), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    evaluation: evaluationFromRow(data as OutputEvaluationRow),
    storage: "supabase" as const,
  };
}

export async function listPromptImprovementSuggestions(filters: {
  sourceEvaluationId?: string;
  status?: PromptSuggestionStatus;
} = {}) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to list prompt improvement suggestions.");
  }

  let query = scopeByOrganization(supabase
    .from("prompt_improvement_suggestions")
    .select("*")
    .order("updated_at", { ascending: false }));

  if (filters.sourceEvaluationId) {
    query = query.eq("source_evaluation_id", filters.sourceEvaluationId);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data as PromptImprovementSuggestionRow[]).map(suggestionFromRow);
}

export async function savePromptImprovementSuggestion(
  input: Partial<PromptImprovementSuggestion>,
) {
  const suggestion = normalizePromptImprovementSuggestion(input);
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to save prompt improvement suggestions.");
  }

  const { data, error } = await supabase
    .from("prompt_improvement_suggestions")
    .upsert(withOrganizationId(suggestionToRow(suggestion)), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    suggestion: suggestionFromRow(data as PromptImprovementSuggestionRow),
    storage: "supabase" as const,
  };
}

export async function updatePromptImprovementSuggestionStatus(
  id: string,
  status: PromptSuggestionStatus,
) {
  const current = normalizePromptImprovementSuggestion({ id, status });
  const updated = normalizePromptImprovementSuggestion({
    ...current,
    status,
    updatedAt: new Date().toISOString(),
  });
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to update prompt improvement suggestions.");
  }

  const { data, error } = await scopeByOrganization(
    supabase
      .from("prompt_improvement_suggestions")
      .update({ status, updated_at: updated.updatedAt })
      .eq("id", id),
  )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    suggestion: suggestionFromRow(data as PromptImprovementSuggestionRow),
    storage: "supabase" as const,
  };
}

export async function getQualityDashboardMetrics() {
  const [evaluations, suggestions] = await Promise.all([
    listOutputEvaluations(),
    listPromptImprovementSuggestions(),
  ]);

  return calculateQualityMetrics(evaluations, suggestions);
}
