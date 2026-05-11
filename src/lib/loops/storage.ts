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

type LoopStore = {
  runs: LoopRun[];
};

const globalForLoopStore = globalThis as typeof globalThis & {
  __dgLoopStore?: LoopStore;
};

const localStore =
  globalForLoopStore.__dgLoopStore ??
  (globalForLoopStore.__dgLoopStore = {
    runs: [],
  });

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

function upsertLocalRun(run: LoopRun) {
  const index = localStore.runs.findIndex((item) => item.id === run.id);

  if (index >= 0) {
    localStore.runs[index] = run;
  } else {
    localStore.runs.unshift(run);
  }

  return run;
}

export async function listLoopRuns(filters: { loopType?: LoopType } = {}) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return localStore.runs
      .filter((run) => (filters.loopType ? run.loopType === filters.loopType : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
    return localStore.runs;
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

  return localStore.runs.find((run) => run.id === id) ?? null;
}

export async function saveLoopRun(input: Partial<LoopRun>) {
  const run = normalizeLoopRun(input);
  upsertLocalRun(run);
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { run, storage: "local" as const };
  }

  const { data, error } = await supabase
    .from("loop_runs")
    .upsert(runToRow(run), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    return { run, storage: "local" as const };
  }

  return {
    run: runFromRow(data as LoopRunRow),
    storage: "supabase" as const,
  };
}
