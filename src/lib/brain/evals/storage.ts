import { getSupabaseServerClient } from "@/lib/supabase/server";
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

type EvalStore = {
  datasets: EvalDataset[];
  examples: EvalExample[];
  runs: EvalRun[];
  results: EvalResult[];
  traces: AgentTrace[];
};

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
const globalForEvalStore = globalThis as typeof globalThis & {
  __dgBrainEvalStore?: EvalStore;
};
const localStore =
  globalForEvalStore.__dgBrainEvalStore ??
  (globalForEvalStore.__dgBrainEvalStore = {
    datasets: seed.datasets,
    examples: seed.examples,
    runs: [],
    results: [],
    traces: [],
  });

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
    modelName: row.model_name ?? "mock",
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
    return { storage: "local" as const };
  }

  const { data } = await supabase.from("eval_datasets").select("id").limit(1);

  if (!data?.length) {
    await supabase.from("eval_datasets").upsert(seed.datasets.map(datasetToRow), {
      onConflict: "id",
    });
    await supabase.from("eval_examples").upsert(seed.examples.map(exampleToRow), {
      onConflict: "id",
    });
  }

  return { storage: "supabase" as const };
}

export async function listEvalDatasets() {
  await ensureSeedEvalDatasets();
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return [...localStore.datasets].sort((a, b) => a.name.localeCompare(b.name));
  }

  const { data, error } = await supabase
    .from("eval_datasets")
    .select("*")
    .order("name");

  if (error) {
    return localStore.datasets;
  }

  return (data as EvalDatasetRow[]).map(datasetFromRow);
}

export async function listEvalExamples(datasetId?: string) {
  await ensureSeedEvalDatasets();
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return localStore.examples
      .filter((example) => (datasetId ? example.datasetId === datasetId : true))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  let query = supabase.from("eval_examples").select("*").order("id");
  if (datasetId) {
    query = query.eq("dataset_id", datasetId);
  }
  const { data, error } = await query;

  if (error) {
    return localStore.examples.filter((example) =>
      datasetId ? example.datasetId === datasetId : true,
    );
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
  const index = localStore.datasets.findIndex((item) => item.id === dataset.id);

  if (index >= 0) {
    localStore.datasets[index] = dataset;
  } else {
    localStore.datasets.unshift(dataset);
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { dataset, storage: "local" as const };
  }

  const { data, error } = await supabase
    .from("eval_datasets")
    .upsert(datasetToRow(dataset), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    return { dataset, storage: "local" as const };
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
  const index = localStore.examples.findIndex((item) => item.id === example.id);

  if (index >= 0) {
    localStore.examples[index] = example;
  } else {
    localStore.examples.unshift(example);
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { example, storage: "local" as const };
  }

  const { data, error } = await supabase
    .from("eval_examples")
    .upsert(exampleToRow(example), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    return { example, storage: "local" as const };
  }

  return {
    example: exampleFromRow(data as EvalExampleRow),
    storage: "supabase" as const,
  };
}

export async function saveEvalRun(input: Partial<EvalRun>) {
  const run = normalizeEvalRun(input);
  const index = localStore.runs.findIndex((item) => item.id === run.id);

  if (index >= 0) {
    localStore.runs[index] = run;
  } else {
    localStore.runs.unshift(run);
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { run, storage: "local" as const };
  }

  const { data, error } = await supabase
    .from("eval_runs")
    .upsert(runToRow(run), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    return { run, storage: "local" as const };
  }

  return { run: runFromRow(data as EvalRunRow), storage: "supabase" as const };
}

export async function saveEvalResults(results: EvalResult[]) {
  results.forEach((result) => {
    const index = localStore.results.findIndex((item) => item.id === result.id);
    if (index >= 0) {
      localStore.results[index] = result;
    } else {
      localStore.results.unshift(result);
    }
  });

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { results, storage: "local" as const };
  }

  const { data, error } = await supabase
    .from("eval_results")
    .upsert(results.map(resultToRow), { onConflict: "id" })
    .select("*");

  if (error) {
    return { results, storage: "local" as const };
  }

  return {
    results: (data as EvalResultRow[]).map(resultFromRow),
    storage: "supabase" as const,
  };
}

export async function listEvalRuns(datasetId?: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return localStore.runs
      .filter((run) => (datasetId ? run.datasetId === datasetId : true))
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  let query = supabase.from("eval_runs").select("*").order("started_at", {
    ascending: false,
  });
  if (datasetId) {
    query = query.eq("dataset_id", datasetId);
  }
  const { data, error } = await query;

  if (error) {
    return localStore.runs.filter((run) => (datasetId ? run.datasetId === datasetId : true));
  }

  return (data as EvalRunRow[]).map(runFromRow);
}

export async function listEvalResults(evalRunId?: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return localStore.results
      .filter((result) => (evalRunId ? result.evalRunId === evalRunId : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  let query = supabase.from("eval_results").select("*").order("created_at", {
    ascending: false,
  });
  if (evalRunId) {
    query = query.eq("eval_run_id", evalRunId);
  }
  const { data, error } = await query;

  if (error) {
    return localStore.results.filter((result) =>
      evalRunId ? result.evalRunId === evalRunId : true,
    );
  }

  return (data as EvalResultRow[]).map(resultFromRow);
}

export async function saveAgentTrace(input: Partial<AgentTrace>) {
  const trace = normalizeAgentTrace(input);
  localStore.traces.unshift(trace);
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { trace, storage: "local" as const };
  }

  const { data, error } = await supabase
    .from("agent_traces")
    .insert(traceToRow(trace))
    .select("*")
    .single();

  if (error) {
    return { trace, storage: "local" as const };
  }

  return { trace: traceFromRow(data as AgentTraceRow), storage: "supabase" as const };
}
