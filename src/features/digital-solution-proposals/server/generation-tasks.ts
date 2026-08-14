import { GenerationInputError } from "@/features/generation-jobs/domain/errors";
import { saveAuditLog } from "@/lib/audit";
import { routeBrainTask } from "@/lib/brain/routing/router";

import { combineDatasetProfiles } from "../domain/analysis";
import {
  formatSolutionCommercialSummary,
  normalizeSolutionReview,
  safeEvidenceForBrain,
} from "../domain/proposal";
import type {
  DigitalSolutionProposalBrainOutput,
  SolutionReviewBrainOutput,
} from "../domain/types";
import {
  getSolutionProposal,
  saveSolutionProposal,
} from "../storage/solution-proposal-storage";

export async function runSolutionReviewJob(id: string, actor: string) {
  const proposal = await getSolutionProposal(id);
  if (!proposal) throw new GenerationInputError("Digital solution proposal was not found.");

  const readyProfiles = proposal.files.flatMap((file) =>
    file.status === "Ready" && file.analysis ? [file.analysis] : [],
  );
  proposal.evidenceAnalysis = readyProfiles.length
    ? combineDatasetProfiles(readyProfiles)
    : null;
  proposal.status = "Reviewing";
  await saveSolutionProposal(proposal);

  const result = await routeBrainTask<
    {
      clientName: string;
      projectTitle: string;
      solutionType: typeof proposal.solutionType;
      brief: typeof proposal.brief;
      commercialInputs: typeof proposal.commercialInputs;
      evidenceAnalysis: ReturnType<typeof safeEvidenceForBrain>;
    },
    SolutionReviewBrainOutput
  >({
    taskType: "solution_review",
    input: {
      clientName: proposal.clientName,
      projectTitle: proposal.title,
      solutionType: proposal.solutionType,
      brief: proposal.brief,
      commercialInputs: proposal.commercialInputs,
      evidenceAnalysis: safeEvidenceForBrain(proposal.evidenceAnalysis),
    },
    retries: 1,
  });

  proposal.solutionReview = normalizeSolutionReview(result.output.solutionReview);
  proposal.proposalContent = null;
  proposal.status = "Review Ready";
  await saveSolutionProposal(proposal);
  await saveAuditLog({
    actor,
    action: "solution_review_generated",
    entityType: "digital_solution_proposal",
    entityId: id,
    metadata: {
      model: result.model,
      evidenceFiles: readyProfiles.length,
      solutionType: proposal.solutionType,
    },
  });
}

export async function generateSolutionProposalJob(id: string, actor: string) {
  const proposal = await getSolutionProposal(id);
  if (!proposal) throw new GenerationInputError("Digital solution proposal was not found.");
  if (!proposal.solutionReview) {
    throw new GenerationInputError("Complete the solution review first.");
  }

  const result = await routeBrainTask<
    {
      clientName: string;
      projectTitle: string;
      solutionType: typeof proposal.solutionType;
      brief: typeof proposal.brief;
      evidenceAnalysis: ReturnType<typeof safeEvidenceForBrain>;
      solutionReview: NonNullable<typeof proposal.solutionReview>;
      commercialSummary: string;
    },
    DigitalSolutionProposalBrainOutput
  >({
    taskType: "digital_solution_proposal",
    input: {
      clientName: proposal.clientName,
      projectTitle: proposal.title,
      solutionType: proposal.solutionType,
      brief: proposal.brief,
      evidenceAnalysis: safeEvidenceForBrain(proposal.evidenceAnalysis),
      solutionReview: proposal.solutionReview,
      commercialSummary: formatSolutionCommercialSummary(proposal.commercialInputs),
    },
    retries: 1,
  });

  proposal.proposalContent = {
    ...result.output.proposalContent,
    coverHeading: "Digital Solution Proposal",
    solutionTitle: proposal.title,
    client: proposal.clientName,
  };
  proposal.status = "Generated";
  await saveSolutionProposal(proposal);
  await saveAuditLog({
    actor,
    action: "digital_solution_proposal_generated",
    entityType: "digital_solution_proposal",
    entityId: id,
    metadata: {
      model: result.model,
      title: proposal.title,
      solutionType: proposal.solutionType,
    },
  });
}
