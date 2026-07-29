import type { GenerationJob } from "../domain/types";
import {
  getSystemProposal,
  saveSystemProposal,
} from "@/features/intelligent-system-proposals/storage/system-proposal-storage";
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
    job.jobType !== "system_discovery" &&
    job.jobType !== "system_proposal"
  ) {
    return;
  }

  const proposal = await getSystemProposal(job.resourceId);
  if (!proposal || proposal.status === "Generated") return;
  await saveSystemProposal({ ...proposal, status: "Failed" });
}
