import { getGenerationJob } from "../storage/generation-job-storage";
import { generateAndSaveTrainingPackage } from "@/features/training-packages/server/generation-task";
import {
  generateSystemProposalJob,
  runSystemDiscoveryJob,
} from "@/features/intelligent-system-proposals/server/generation-tasks";
import {
  generateDeliveryMaterialJob,
  generateDeliveryReportJob,
  generateEvaluationQuestionsJob,
} from "@/features/delivery/server/generation-tasks";
import {
  isDeliveryMaterialKey,
  isEvaluationFormType,
} from "@/features/delivery";
import { GenerationInputError } from "../domain/errors";
import { generatePackageFromSyllabusImport } from "@/features/syllabus-imports/server/generation-task";

export async function executeGenerationJob(jobId: string) {
  const job = await getGenerationJob(jobId);
  if (!job) throw new Error("Generation job was not found.");

  if (job.jobType === "training_package") {
    return generateAndSaveTrainingPackage(job.resourceId, job.createdByActor);
  }
  if (job.jobType === "system_discovery") {
    return runSystemDiscoveryJob(job.resourceId, job.createdByActor);
  }
  if (job.jobType === "system_proposal") {
    return generateSystemProposalJob(job.resourceId, job.createdByActor);
  }
  if (job.jobType === "delivery_material") {
    if (!isDeliveryMaterialKey(job.target)) {
      throw new GenerationInputError("The delivery material target is invalid.");
    }
    return generateDeliveryMaterialJob(
      job.resourceId,
      job.target,
      job.createdByActor,
      job.id,
    );
  }
  if (job.jobType === "evaluation_questions") {
    if (!isEvaluationFormType(job.target)) {
      throw new GenerationInputError("The assessment type is invalid.");
    }
    return generateEvaluationQuestionsJob(
      job.resourceId,
      job.target,
      job.createdByActor,
    );
  }
  if (job.jobType === "delivery_report") {
    return generateDeliveryReportJob(job.resourceId, job.createdByActor);
  }
  if (job.jobType === "syllabus_proposal") {
    return generatePackageFromSyllabusImport(job.resourceId, job.createdByActor);
  }

  // Feature executors are added as each generation surface is migrated.
  throw new GenerationInputError(
    `Generation job type ${job.jobType} is not implemented.`,
  );
}
