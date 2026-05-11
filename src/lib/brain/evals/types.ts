import type { BrainTaskType } from "@/lib/brain/agents";

export const evalDatasetStatuses = ["Draft", "Active", "Archived"] as const;
export type EvalDatasetStatus = (typeof evalDatasetStatuses)[number];

export const evalRunStatuses = ["Running", "Completed", "Failed"] as const;
export type EvalRunStatus = (typeof evalRunStatuses)[number];

export const agentTraceStatuses = ["Completed", "Failed", "Mock"] as const;
export type AgentTraceStatus = (typeof agentTraceStatuses)[number];

export type EvalDataset = {
  id: string;
  name: string;
  description: string;
  targetAgent: BrainTaskType;
  status: EvalDatasetStatus;
  createdAt: string;
  updatedAt: string;
};

export type EvalExample = {
  id: string;
  datasetId: string;
  input: Record<string, unknown>;
  expectedOutputSummary: string;
  rubric: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type EvalRun = {
  id: string;
  datasetId: string;
  targetAgent: BrainTaskType;
  modelName: string;
  status: EvalRunStatus;
  averageScore: number;
  startedAt: string;
  completedAt: string | null;
  summary: string;
};

export type EvalResult = {
  id: string;
  evalRunId: string;
  evalExampleId: string;
  score: number;
  passed: boolean;
  strengths: string[];
  weaknesses: string[];
  regressionRisk: string;
  output: Record<string, unknown>;
  createdAt: string;
};

export type AgentTrace = {
  id: string;
  workflowId: string | null;
  agentName: string;
  taskType: BrainTaskType;
  inputSummary: string;
  outputSummary: string;
  status: AgentTraceStatus;
  durationMs: number | null;
  createdAt: string;
};

function normalizeString(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizeList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeString(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function isEvalDatasetStatus(value: unknown): value is EvalDatasetStatus {
  return (
    typeof value === "string" &&
    evalDatasetStatuses.includes(value as EvalDatasetStatus)
  );
}

export function isEvalRunStatus(value: unknown): value is EvalRunStatus {
  return typeof value === "string" && evalRunStatuses.includes(value as EvalRunStatus);
}

export function isAgentTraceStatus(value: unknown): value is AgentTraceStatus {
  return (
    typeof value === "string" &&
    agentTraceStatuses.includes(value as AgentTraceStatus)
  );
}

export function normalizeEvalDataset(
  value: Partial<EvalDataset>,
): EvalDataset {
  const now = new Date().toISOString();

  return {
    id: value.id || crypto.randomUUID(),
    name: normalizeString(value.name),
    description: normalizeString(value.description),
    targetAgent: value.targetAgent ?? "course_package",
    status: isEvalDatasetStatus(value.status) ? value.status : "Draft",
    createdAt: value.createdAt || now,
    updatedAt: value.updatedAt || now,
  };
}

export function normalizeEvalExample(value: Partial<EvalExample>): EvalExample {
  const now = new Date().toISOString();

  return {
    id: value.id || crypto.randomUUID(),
    datasetId: normalizeString(value.datasetId),
    input: normalizeRecord(value.input),
    expectedOutputSummary: normalizeString(value.expectedOutputSummary),
    rubric: normalizeRecord(value.rubric),
    tags: normalizeList(value.tags),
    createdAt: value.createdAt || now,
    updatedAt: value.updatedAt || now,
  };
}

export function normalizeEvalRun(value: Partial<EvalRun>): EvalRun {
  const now = new Date().toISOString();

  return {
    id: value.id || crypto.randomUUID(),
    datasetId: normalizeString(value.datasetId),
    targetAgent: value.targetAgent ?? "course_package",
    modelName: normalizeString(value.modelName || "mock"),
    status: isEvalRunStatus(value.status) ? value.status : "Running",
    averageScore: Math.max(0, Math.min(100, Math.round(normalizeNumber(value.averageScore)))),
    startedAt: value.startedAt || now,
    completedAt: value.completedAt ?? null,
    summary: normalizeString(value.summary),
  };
}

export function normalizeEvalResult(value: Partial<EvalResult>): EvalResult {
  return {
    id: value.id || crypto.randomUUID(),
    evalRunId: normalizeString(value.evalRunId),
    evalExampleId: normalizeString(value.evalExampleId),
    score: Math.max(0, Math.min(100, Math.round(normalizeNumber(value.score)))),
    passed: Boolean(value.passed),
    strengths: normalizeList(value.strengths),
    weaknesses: normalizeList(value.weaknesses),
    regressionRisk: normalizeString(value.regressionRisk || "Low"),
    output: normalizeRecord(value.output),
    createdAt: value.createdAt || new Date().toISOString(),
  };
}

export function normalizeAgentTrace(value: Partial<AgentTrace>): AgentTrace {
  return {
    id: value.id || crypto.randomUUID(),
    workflowId: value.workflowId || null,
    agentName: normalizeString(value.agentName),
    taskType: value.taskType ?? "course_package",
    inputSummary: normalizeString(value.inputSummary),
    outputSummary: normalizeString(value.outputSummary),
    status: isAgentTraceStatus(value.status) ? value.status : "Completed",
    durationMs:
      value.durationMs === null || value.durationMs === undefined
        ? null
        : Math.max(0, normalizeNumber(value.durationMs)),
    createdAt: value.createdAt || new Date().toISOString(),
  };
}
