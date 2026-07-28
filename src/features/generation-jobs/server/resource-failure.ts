import type { GenerationJob } from "../domain/types";
import {
  getSystemProposal,
  saveSystemProposal,
} from "@/features/intelligent-system-proposals/storage/system-proposal-storage";

export async function markGenerationResourceFailed(job: GenerationJob) {
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
