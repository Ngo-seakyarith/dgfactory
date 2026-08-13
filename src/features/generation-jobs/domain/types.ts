export const generationJobTypes = [
  "training_package",
  "solution_review",
  "solution_proposal",
  "delivery_material",
  "evaluation_questions",
  "delivery_report",
  "syllabus_proposal",
] as const;

export type GenerationJobType = (typeof generationJobTypes)[number];

export const generationJobStatuses = [
  "Queued",
  "Running",
  "Completed",
  "Failed",
] as const;

export type GenerationJobStatus = (typeof generationJobStatuses)[number];

export type GenerationJob = {
  id: string;
  jobType: GenerationJobType;
  resourceType: string;
  resourceId: string;
  target: string;
  status: GenerationJobStatus;
  workflowRunId: string;
  errorMessage: string;
  createdBy: string | null;
  createdByActor: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StartGenerationJobInput = {
  jobType: GenerationJobType;
  resourceType: string;
  resourceId: string;
  target?: string;
  createdBy?: string | null;
  createdByActor: string;
};

export type StartGenerationJob = (
  input: StartGenerationJobInput,
) => Promise<GenerationJob>;

export function isGenerationJobType(value: unknown): value is GenerationJobType {
  return (
    typeof value === "string" &&
    generationJobTypes.includes(value as GenerationJobType)
  );
}

export function isActiveGenerationJob(
  job: GenerationJob | null | undefined,
): job is GenerationJob {
  return job?.status === "Queued" || job?.status === "Running";
}
