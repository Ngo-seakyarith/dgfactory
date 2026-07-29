import type { StartGenerationJobInput } from "../domain/types";
import {
  createGenerationJob,
  updateGenerationJob,
} from "../storage/generation-job-storage";
import { markGenerationResourceFailed } from "./resource-failure";

export async function startGenerationJob(input: StartGenerationJobInput) {
  const created = await createGenerationJob(input);
  if (!created.created) return created.job;

  try {
    const [{ start }, { generationWorkflow }] = await Promise.all([
      import("workflow/api"),
      import("./workflow"),
    ]);
    const run = await start(generationWorkflow, [created.job.id]);
    return updateGenerationJob(created.job.id, { workflowRunId: run.runId });
  } catch (error) {
    await markGenerationResourceFailed(created.job).catch(() => undefined);
    await updateGenerationJob(created.job.id, {
      status: "Failed",
      completedAt: new Date().toISOString(),
      errorMessage:
        error instanceof Error ? error.message : "The background job could not start.",
    });
    throw error;
  }
}
