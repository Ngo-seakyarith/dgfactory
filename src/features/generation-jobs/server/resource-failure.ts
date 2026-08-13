import type { GenerationJob } from "../domain/types";
import {
  getSolutionProposal,
  saveSolutionProposal,
} from "@/features/digital-solution-proposals/storage/solution-proposal-storage";
import {
  getSyllabusImport,
  saveSyllabusImport,
} from "@/features/syllabus-imports/storage/syllabus-import-storage";

export async function markGenerationResourceFailed(job: GenerationJob) {
  if (job.jobType === "syllabus_proposal") {
    const value = await getSyllabusImport(job.resourceId);
    if (!value || value.status === "Completed" || value.status === "Needs Input") return;
    await saveSyllabusImport({
      ...value,
      status: "Failed",
      errorMessage: job.errorMessage || "Syllabus proposal generation failed.",
    });
    return;
  }

  if (
    job.jobType !== "solution_review" &&
    job.jobType !== "solution_proposal"
  ) {
    return;
  }

  const proposal = await getSolutionProposal(job.resourceId);
  if (!proposal || proposal.status === "Generated") return;
  await saveSolutionProposal({ ...proposal, status: "Failed" });
}
