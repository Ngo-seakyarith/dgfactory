import { FatalError } from "workflow";

import { executeGenerationJob } from "./execute-generation-job";
import {
  transitionGenerationJob,
} from "../storage/generation-job-storage";
import { GenerationInputError } from "../domain/errors";
import { markGenerationResourceFailed } from "./resource-failure";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Background generation failed.";
}

async function runGenerationStep(jobId: string) {
  "use step";

  const runningJob = await transitionGenerationJob(jobId, "Queued", {
    status: "Running",
    startedAt: new Date().toISOString(),
    errorMessage: "",
  });
  if (!runningJob) {
    throw new FatalError("Generation job is no longer queued.");
  }
  try {
    return await executeGenerationJob(jobId);
  } catch (error) {
    if (error instanceof GenerationInputError) {
      throw new FatalError(error.message);
    }
    throw error;
  }
}

// Generation writes resources and audit records inside this step. Keep retries
// disabled until those writes are idempotent, otherwise one retry can duplicate them.
runGenerationStep.maxRetries = 0;

async function completeGenerationStep(jobId: string) {
  "use step";

  const completedJob = await transitionGenerationJob(jobId, "Running", {
    status: "Completed",
    completedAt: new Date().toISOString(),
    errorMessage: "",
  });
  return Boolean(completedJob);
}

async function failGenerationStep(jobId: string, message: string) {
  "use step";

  const failedJob = await transitionGenerationJob(jobId, "Running", {
    status: "Failed",
    completedAt: new Date().toISOString(),
    errorMessage: message,
  });
  if (!failedJob) return false;
  await markGenerationResourceFailed(failedJob).catch(() => undefined);
  return true;
}

export async function generationWorkflow(jobId: string) {
  "use workflow";

  try {
    await runGenerationStep(jobId);
    const completed = await completeGenerationStep(jobId);
    if (!completed) return;
  } catch (error) {
    const failed = await failGenerationStep(jobId, errorMessage(error));
    if (!failed) return;
    throw error;
  }
}
