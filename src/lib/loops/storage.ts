import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  isLoopStatus,
  isLoopType,
  normalizeLoopPayload,
  normalizeLoopRun,
  type LoopRun,
  type LoopStatus,
  type LoopType,
} from "@/lib/loops/types";

type LoopRunRow = {
  id: string;
  loop_type: LoopType | null;
  status: LoopStatus | null;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  summary: string | null;
  recommendations: string[] | null;
  created_at: string;
  completed_at: string | null;
};

function runToRow(run: LoopRun) {
  return {
    id: run.id,
    loop_type: run.loopType,
    status: run.status,
    input: run.input,
    output: run.output,
    summary: run.summary,
    recommendations: run.recommendations,
    created_at: run.createdAt,
    completed_at: run.completedAt,
  };
}

function runFromRow(row: LoopRunRow) {
  return normalizeLoopRun({
    id: row.id,
    loopType: isLoopType(row.loop_type) ? row.loop_type : "weekly_pipeline_review",
    status: isLoopStatus(row.status) ? row.status : "Completed",
    input: normalizeLoopPayload(row.input),
    output: normalizeLoopPayload(row.output),
    summary: row.summary ?? "",
    recommendations: row.recommendations ?? [],
    createdAt: row.created_at,
    completedAt: row.completed_at,
  });
}

export async function listLoopRuns(filters: { loopType?: LoopType } = {}) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to list loop runs.");
  }

  let query = supabase
    .from("loop_runs")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.loopType) {
    query = query.eq("loop_type", filters.loopType);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data as LoopRunRow[]).map(runFromRow);
}

export async function getLoopRun(id: string) {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("loop_runs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      return runFromRow(data as LoopRunRow);
    }
  }

  throw new Error("Supabase is required to load loop runs.");
}

export async function saveLoopRun(input: Partial<LoopRun>) {
  const run = normalizeLoopRun(input);
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to save loop runs.");
  }

  const { data, error } = await supabase
    .from("loop_runs")
    .upsert(runToRow(run), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    run: runFromRow(data as LoopRunRow),
    storage: "supabase" as const,
  };
}
