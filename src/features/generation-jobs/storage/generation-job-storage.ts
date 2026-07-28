import { getSupabaseServerClient } from "@/lib/supabase/server";

import type {
  GenerationJob,
  GenerationJobStatus,
  StartGenerationJobInput,
} from "../domain/types";
import { isActiveGenerationJob } from "../domain/types";
import { markGenerationResourceFailed } from "../server/resource-failure";

const QUEUED_TIMEOUT_MS = 5 * 60 * 1_000;
const RUNNING_TIMEOUT_MS = 30 * 60 * 1_000;
const RETENTION_MS = 90 * 24 * 60 * 60 * 1_000;

type GenerationJobRow = {
  id: string;
  job_type: GenerationJob["jobType"];
  resource_type: string;
  resource_id: string;
  target: string;
  status: GenerationJobStatus;
  workflow_run_id: string;
  error_message: string;
  created_by: string | null;
  created_by_actor: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function fromRow(row: GenerationJobRow): GenerationJob {
  return {
    id: row.id,
    jobType: row.job_type,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    target: row.target,
    status: row.status,
    workflowRunId: row.workflow_run_id,
    errorMessage: row.error_message,
    createdBy: row.created_by,
    createdByActor: row.created_by_actor,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function staleReason(job: GenerationJob, now = Date.now()) {
  if (job.status === "Queued") {
    const queuedAt = new Date(job.createdAt).getTime();
    if (Number.isFinite(queuedAt) && now - queuedAt > QUEUED_TIMEOUT_MS) {
      return "Generation did not start within 5 minutes. Start it again.";
    }
  }
  if (job.status === "Running") {
    const startedAt = new Date(job.startedAt ?? job.updatedAt).getTime();
    if (Number.isFinite(startedAt) && now - startedAt > RUNNING_TIMEOUT_MS) {
      return "Generation stopped responding after 30 minutes. Start it again.";
    }
  }
  return "";
}

async function expireStaleJob(job: GenerationJob) {
  const reason = staleReason(job);
  if (!reason) return job;
  const expired = await transitionGenerationJob(job.id, job.status, {
    status: "Failed",
    completedAt: new Date().toISOString(),
    errorMessage: reason,
  });
  if (!expired) return (await readGenerationJob(job.id)) ?? job;
  await markGenerationResourceFailed(expired).catch(() => undefined);
  return expired;
}

async function pruneOldGenerationJobs() {
  const cutoff = new Date(Date.now() - RETENTION_MS).toISOString();
  const { error } = await client()
    .from("generation_jobs")
    .delete()
    .in("status", ["Completed", "Failed"])
    .lt("created_at", cutoff);
  if (error) throw new Error(error.message);
}

function client() {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is required for background generation jobs.");
  return supabase;
}

export async function createGenerationJob(input: StartGenerationJobInput) {
  await pruneOldGenerationJobs().catch(() => undefined);

  const active = await findLatestGenerationJob({
    jobType: input.jobType,
    resourceId: input.resourceId,
    target: input.target ?? "",
    activeOnly: true,
  });
  if (isActiveGenerationJob(active)) {
    return { job: active, created: false as const };
  }

  const now = new Date().toISOString();
  const row = {
    id: crypto.randomUUID(),
    job_type: input.jobType,
    resource_type: input.resourceType,
    resource_id: input.resourceId,
    target: input.target ?? "",
    status: "Queued" as const,
    workflow_run_id: "",
    error_message: "",
    created_by: input.createdBy ?? null,
    created_by_actor: input.createdByActor,
    started_at: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
  };
  const insert = () =>
    client().from("generation_jobs").insert(row).select("*").single();
  let { data, error } = await insert();

  if (error) {
    if (error.code === "23505") {
      const existing = await findLatestGenerationJob({
        jobType: input.jobType,
        resourceId: input.resourceId,
        target: input.target ?? "",
        activeOnly: true,
      });
      if (isActiveGenerationJob(existing)) {
        return { job: existing, created: false as const };
      }

      const retry = await insert();
      data = retry.data;
      error = retry.error;
      if (error?.code === "23505") {
        throw new Error("Another generation job started at the same time. Try again.");
      }
    }
    if (error) throw new Error(error.message);
  }

  if (!data) throw new Error("The generation job could not be created.");
  return { job: fromRow(data as GenerationJobRow), created: true as const };
}

export async function getGenerationJob(id: string) {
  const job = await readGenerationJob(id);
  return job ? expireStaleJob(job) : null;
}

async function readGenerationJob(id: string) {
  const { data, error } = await client()
    .from("generation_jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return fromRow(data as GenerationJobRow);
}

export async function findLatestGenerationJob({
  jobType,
  resourceId,
  target,
  activeOnly = false,
}: {
  jobType: GenerationJob["jobType"];
  resourceId: string;
  target?: string;
  activeOnly?: boolean;
}) {
  let query = client()
    .from("generation_jobs")
    .select("*")
    .eq("job_type", jobType)
    .eq("resource_id", resourceId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (target !== undefined) query = query.eq("target", target);
  if (activeOnly) query = query.in("status", ["Queued", "Running"]);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return expireStaleJob(fromRow(data as GenerationJobRow));
}

export async function updateGenerationJob(
  id: string,
  values: Partial<{
    status: GenerationJobStatus;
    workflowRunId: string;
    errorMessage: string;
    startedAt: string | null;
    completedAt: string | null;
  }>,
) {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (values.status !== undefined) row.status = values.status;
  if (values.workflowRunId !== undefined) row.workflow_run_id = values.workflowRunId;
  if (values.errorMessage !== undefined) row.error_message = values.errorMessage;
  if (values.startedAt !== undefined) row.started_at = values.startedAt;
  if (values.completedAt !== undefined) row.completed_at = values.completedAt;
  const { data, error } = await client()
    .from("generation_jobs")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data as GenerationJobRow);
}

export async function transitionGenerationJob(
  id: string,
  expectedStatus: GenerationJobStatus,
  values: Partial<{
    status: GenerationJobStatus;
    workflowRunId: string;
    errorMessage: string;
    startedAt: string | null;
    completedAt: string | null;
  }>,
) {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (values.status !== undefined) row.status = values.status;
  if (values.workflowRunId !== undefined) row.workflow_run_id = values.workflowRunId;
  if (values.errorMessage !== undefined) row.error_message = values.errorMessage;
  if (values.startedAt !== undefined) row.started_at = values.startedAt;
  if (values.completedAt !== undefined) row.completed_at = values.completedAt;

  const { data, error } = await client()
    .from("generation_jobs")
    .update(row)
    .eq("id", id)
    .eq("status", expectedStatus)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromRow(data as GenerationJobRow) : null;
}
