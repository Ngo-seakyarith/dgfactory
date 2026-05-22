import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scopeAppData, withAppScope } from "@/lib/request-scope";
import { createSeedEvalData } from "@/lib/brain/evals/benchmarks";
import {
  normalizeAgentTrace,
  normalizeEvalDataset,
  normalizeEvalExample,
  normalizeEvalResult,
  normalizeEvalRun,
  type AgentTrace,
  type AgentTraceStatus,
  type EvalDataset,
  type EvalDatasetStatus,
  type EvalExample,
  type EvalResult,
  type EvalRun,
  type EvalRunStatus,
} from "@/lib/brain/evals/types";
import type { BrainTaskType } from "@/lib/brain/agents";

type EvalDatasetRow = {
  id: string;
  name: string;
  description: string | null;
  target_agent: BrainTaskType;
  status: EvalDatasetStatus | null;
  created_at: string;
  updated_at: string;
};

type EvalExampleRow = {
  id: string;
  dataset_id: string;
  input: Record<string, unknown> | null;
  expected_output_summary: string | null;
  rubric: Record<string, unknown> | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
};

type EvalRunRow = {
  id: string;
  dataset_id: string;
  target_agent: BrainTaskType;
  model_name: string | null;
  status: EvalRunStatus | null;
  average_score: number | null;
  started_at: string;
  completed_at: string | null;
  summary: string | null;
};

type EvalResultRow = {
  id: string;
  eval_run_id: string;
  eval_example_id: string;
  score: number | null;
  passed: boolean | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  regression_risk: string | null;
  output: Record<string, unknown> | null;
  created_at: string;
};

type AgentTraceRow = {
  id: string;
  workflow_id: string | null;
  agent_name: string;
  task_type: BrainTaskType;
  input_summary: string | null;
  output_summary: string | null;
  status: AgentTraceStatus | null;
  duration_ms: number | null;
  created_at: string;
};

const seed = createSeedEvalData();

function datasetToRow(dataset: EvalDataset) {
  return {
    id: dataset.id,
    name: dataset.name,
    description: dataset.description,
    target_agent: dataset.targetAgent,
    status: dataset.status,
    created_at: dataset.createdAt,
    updated_at: dataset.updatedAt,
  };
}

function datasetFromRow(row: EvalDatasetRow) {
  return normalizeEvalDataset({
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    targetAgent: row.target_agent,
    status: row.status ?? "Draft",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function exampleToRow(example: EvalExample) {
  return {
    id: example.id,
    dataset_id: example.datasetId,
    input: example.input,
    expected_output_summary: example.expectedOutputSummary,
    rubric: example.rubric,
    tags: example.tags,
    created_at: example.createdAt,
    updated_at: example.updatedAt,
  };
}

function exampleFromRow(row: EvalExampleRow) {
  return normalizeEvalExample({
    id: row.id,
    datasetId: row.dataset_id,
    input: row.input ?? {},
    expectedOutputSummary: row.expected_output_summary ?? "",
    rubric: row.rubric ?? {},
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function runToRow(run: EvalRun) {
  return {
    id: run.id,
    dataset_id: run.datasetId,
    target_agent: run.targetAgent,
    model_name: run.modelName,
    status: run.status,
    average_score: run.averageScore,
    started_at: run.startedAt,
    completed_at: run.completedAt,
    summary: run.summary,
  };
}

function runFromRow(row: EvalRunRow) {
  return normalizeEvalRun({
    id: row.id,
    datasetId: row.dataset_id,
    targetAgent: row.target_agent,
    modelName: row.model_name ?? "",
    status: row.status ?? "Running",
    averageScore: row.average_score ?? 0,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    summary: row.summary ?? "",
  });
}

function resultToRow(result: EvalResult) {
  return {
    id: result.id,
    eval_run_id: result.evalRunId,
    eval_example_id: result.evalExampleId,
    score: result.score,
    passed: result.passed,
    strengths: result.strengths,
    weaknesses: result.weaknesses,
    regression_risk: result.regressionRisk,
    output: result.output,
    created_at: result.createdAt,
  };
}

function resultFromRow(row: EvalResultRow) {
  return normalizeEvalResult({
    id: row.id,
    evalRunId: row.eval_run_id,
    evalExampleId: row.eval_example_id,
    score: row.score ?? 0,
    passed: Boolean(row.passed),
    strengths: row.strengths ?? [],
    weaknesses: row.weaknesses ?? [],
    regressionRisk: row.regression_risk ?? "Low",
    output: row.output ?? {},
    createdAt: row.created_at,
  });
}

function traceToRow(trace: AgentTrace) {
  return {
    id: trace.id,
    workflow_id: trace.workflowId,
    agent_name: trace.agentName,
    task_type: trace.taskType,
    input_summary: trace.inputSummary,
    output_summary: trace.outputSummary,
    status: trace.status,
    duration_ms: trace.durationMs,
    created_at: trace.createdAt,
  };
}

function traceFromRow(row: AgentTraceRow) {
  return normalizeAgentTrace({
    id: row.id,
    workflowId: row.workflow_id,
    agentName: row.agent_name,
    taskType: row.task_type,
    inputSummary: row.input_summary ?? "",
    outputSummary: row.output_summary ?? "",
    status: row.status ?? "Completed",
    durationMs: row.duration_ms,
    createdAt: row.created_at,
  });
}

export async function ensureSeedEvalDatasets() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to ensure eval datasets.");
  }

  const { data } = await scopeAppData(supabase.from("eval_datasets").select("id").limit(1));

  if (!data?.length) {
    await supabase.from("eval_datasets").upsert(seed.datasets.map((dataset) => withAppScope(datasetToRow(dataset))), {
      onConflict: "id",
    });
    await supabase.from("eval_examples").upsert(seed.examples.map((example) => withAppScope(exampleToRow(example))), {
      onConflict: "id",
    });
  }

  return { storage: "supabase" as const };
}

export async function listEvalDatasets() {
  await ensureSeedEvalDatasets();
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to list eval datasets.");
  }

  const query = supabase
    .from("eval_datasets")
    .select("*")
    .order("name");
  const { data, error } = await scopeAppData(query);

  if (error) {
    throw new Error(error.message);
  }

  return (data as EvalDatasetRow[]).map(datasetFromRow);
}

export async function listEvalExamples(datasetId?: string) {
  await ensureSeedEvalDatasets();
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to list eval examples.");
  }

  let query = scopeAppData(supabase.from("eval_examples").select("*").order("id"));
  if (datasetId) {
    query = query.eq("dataset_id", datasetId);
  }
  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data as EvalExampleRow[]).map(exampleFromRow);
}

export async function getEvalDataset(datasetId: string) {
  const datasets = await listEvalDatasets();
  return datasets.find((dataset) => dataset.id === datasetId) ?? null;
}

export async function saveEvalDataset(input: Partial<EvalDataset>) {
  const dataset = normalizeEvalDataset({
    ...input,
    updatedAt: new Date().toISOString(),
  });

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is required to save eval datasets.");
  }

  const { data, error } = await supabase
    .from("eval_datasets")
    .upsert(withAppScope(datasetToRow(dataset)), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    dataset: datasetFromRow(data as EvalDatasetRow),
    storage: "supabase" as const,
  };
}

export async function saveEvalExample(input: Partial<EvalExample>) {
  const example = normalizeEvalExample({
    ...input,
    updatedAt: new Date().toISOString(),
  });

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is required to save eval examples.");
  }

  const { data, error } = await supabase
    .from("eval_examples")
    .upsert(withAppScope(exampleToRow(example)), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    example: exampleFromRow(data as EvalExampleRow),
    storage: "supabase" as const,
  };
}

export async function saveEvalRun(input: Partial<EvalRun>) {
  const run = normalizeEvalRun(input);

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is required to save eval runs.");
  }

  const { data, error } = await supabase
    .from("eval_runs")
    .upsert(withAppScope(runToRow(run)), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { run: runFromRow(data as EvalRunRow), storage: "supabase" as const };
}

export async function saveEvalResults(results: EvalResult[]) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is required to save eval results.");
  }

  const { data, error } = await supabase
    .from("eval_results")
    .upsert(results.map((result) => withAppScope(resultToRow(result))), { onConflict: "id" })
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  return {
    results: (data as EvalResultRow[]).map(resultFromRow),
    storage: "supabase" as const,
  };
}

export async function listEvalRuns(datasetId?: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to list eval runs.");
  }

  let query = scopeAppData(supabase.from("eval_runs").select("*").order("started_at", {
    ascending: false,
  }));
  if (datasetId) {
    query = query.eq("dataset_id", datasetId);
  }
  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data as EvalRunRow[]).map(runFromRow);
}

export async function listEvalResults(evalRunId?: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to list eval results.");
  }

  let query = scopeAppData(supabase.from("eval_results").select("*").order("created_at", {
    ascending: false,
  }));
  if (evalRunId) {
    query = query.eq("eval_run_id", evalRunId);
  }
  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data as EvalResultRow[]).map(resultFromRow);
}

export async function saveAgentTrace(input: Partial<AgentTrace>) {
  const trace = normalizeAgentTrace(input);
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to save agent traces.");
  }

  const { data, error } = await supabase
    .from("agent_traces")
    .insert(withAppScope(traceToRow(trace)))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { trace: traceFromRow(data as AgentTraceRow), storage: "supabase" as const };
}
