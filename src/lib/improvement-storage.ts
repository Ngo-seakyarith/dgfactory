import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scopeAppData, withAppScope } from "@/lib/request-scope";
import {
  normalizeImprovementOpportunity,
  type ImprovementCategory,
  type ImprovementOpportunity,
  type ImprovementSourceType,
  type ImprovementStatus,
} from "@/lib/improvements";

type ImprovementRow = {
  id: string;
  source_type: ImprovementSourceType | null;
  source_id: string | null;
  title: string;
  description: string | null;
  category: ImprovementCategory | null;
  priority: number | null;
  status: ImprovementStatus | null;
  recommended_action: string | null;
  codex_prompt: string | null;
  suggested_files: string[] | null;
  acceptance_criteria: string[] | null;
  created_at: string;
  updated_at: string;
};

function toRow(opportunity: ImprovementOpportunity) {
  return {
    id: opportunity.id,
    source_type: opportunity.sourceType,
    source_id: opportunity.sourceId,
    title: opportunity.title,
    description: opportunity.description,
    category: opportunity.category,
    priority: opportunity.priority,
    status: opportunity.status,
    recommended_action: opportunity.recommendedAction,
    codex_prompt: opportunity.codexPrompt,
    suggested_files: opportunity.suggestedFiles,
    acceptance_criteria: opportunity.acceptanceCriteria,
    created_at: opportunity.createdAt,
    updated_at: opportunity.updatedAt,
  };
}

function fromRow(row: ImprovementRow) {
  return normalizeImprovementOpportunity({
    id: row.id,
    sourceType: row.source_type ?? "Other",
    sourceId: row.source_id,
    title: row.title,
    description: row.description ?? "",
    category: row.category ?? "Other",
    priority: row.priority ?? 3,
    status: row.status ?? "Suggested",
    recommendedAction: row.recommended_action ?? "",
    codexPrompt: row.codex_prompt ?? "",
    suggestedFiles: row.suggested_files ?? [],
    acceptanceCriteria: row.acceptance_criteria ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export async function listImprovementOpportunities(filters: {
  sourceType?: ImprovementSourceType;
  category?: ImprovementCategory;
  status?: ImprovementStatus;
} = {}) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to list improvement opportunities.");
  }

  let query = scopeAppData(supabase
    .from("improvement_opportunities")
    .select("*")
    .order("priority", { ascending: true })
    .order("updated_at", { ascending: false }));

  if (filters.sourceType) query = query.eq("source_type", filters.sourceType);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data as ImprovementRow[]).map(fromRow);
}

export async function getImprovementOpportunity(id: string) {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await scopeAppData(
      supabase.from("improvement_opportunities").select("*").eq("id", id),
    ).maybeSingle();

    if (!error && data) {
      return fromRow(data as ImprovementRow);
    }
  }

  throw new Error("Supabase is required to load improvement opportunities.");
}

export async function saveImprovementOpportunity(
  input: Partial<ImprovementOpportunity>,
) {
  const opportunity = normalizeImprovementOpportunity({
    ...input,
    updatedAt: new Date().toISOString(),
  });
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to save improvement opportunities.");
  }

  const { data, error } = await supabase
    .from("improvement_opportunities")
    .upsert(withAppScope(toRow(opportunity)), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    opportunity: fromRow(data as ImprovementRow),
    storage: "supabase" as const,
  };
}

export async function updateImprovementStatus({
  id,
  status,
}: {
  id: string;
  status: ImprovementStatus;
}) {
  const current = await getImprovementOpportunity(id);

  if (!current) {
    throw new Error("Improvement opportunity not found.");
  }

  return saveImprovementOpportunity({ ...current, status });
}
