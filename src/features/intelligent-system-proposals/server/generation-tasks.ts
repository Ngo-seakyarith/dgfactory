import { saveAuditLog } from "@/lib/audit";
import { routeBrainTask } from "@/lib/brain/routing/router";
import { GenerationInputError } from "@/features/generation-jobs/domain/errors";

import { combineDatasetProfiles } from "../domain/analysis";
import {
  formatSystemCommercialSummary,
  normalizeAnalystReview,
  safeAnalysisForBrain,
} from "../domain/proposal";
import type {
  DataDiscoveryBrainOutput,
  IntelligentSystemProposal,
  SystemProposalBrainOutput,
} from "../domain/types";
import {
  getSystemProposal,
  saveSystemProposal,
} from "../storage/system-proposal-storage";

export async function runSystemDiscoveryJob(id: string, actor: string) {
  const proposal = await getSystemProposal(id);
  if (!proposal?.files.some((file) => file.status === "Ready")) {
    throw new GenerationInputError("Analyze at least one source file first.");
  }
  proposal.combinedAnalysis = combineDatasetProfiles(
    proposal.files.flatMap((file) => (file.analysis ? [file.analysis] : [])),
  );
  proposal.status = "Analyzing";
  await saveSystemProposal(proposal);
  const result = await routeBrainTask<
    {
      brief: IntelligentSystemProposal["brief"];
      analysis: ReturnType<typeof safeAnalysisForBrain>;
    },
    DataDiscoveryBrainOutput
  >({
    taskType: "data_discovery",
    input: {
      brief: proposal.brief,
      analysis: safeAnalysisForBrain(proposal.combinedAnalysis),
    },
    retries: 1,
  });
  proposal.analystReview = normalizeAnalystReview(result.output.analystReview);
  proposal.status = "Analysis Ready";
  await saveSystemProposal(proposal);
  await saveAuditLog({
    actor,
    action: "system_data_discovery_generated",
    entityType: "intelligent_system_proposal",
    entityId: id,
    metadata: { model: result.model, files: proposal.files.length },
  });
}

export async function generateSystemProposalJob(id: string, actor: string) {
  const proposal = await getSystemProposal(id);
  if (!proposal) throw new GenerationInputError("System proposal was not found.");
  if (!proposal.combinedAnalysis || !proposal.analystReview) {
    throw new GenerationInputError(
      "Complete and review the data analysis first.",
    );
  }
  const result = await routeBrainTask<
    {
      brief: IntelligentSystemProposal["brief"];
      analysis: ReturnType<typeof safeAnalysisForBrain>;
      analystReview: NonNullable<IntelligentSystemProposal["analystReview"]>;
      commercialSummary: string;
    },
    SystemProposalBrainOutput
  >({
    taskType: "intelligent_system_proposal",
    input: {
      brief: proposal.brief,
      analysis: safeAnalysisForBrain(proposal.combinedAnalysis),
      analystReview: proposal.analystReview,
      commercialSummary: formatSystemCommercialSummary(proposal.commercialInputs),
    },
    retries: 1,
  });
  proposal.proposalContent = {
    ...result.output.proposalContent,
    coverHeading: "Intelligent System Proposal",
    solutionTitle: proposal.brief.projectTitle,
    client: proposal.brief.clientName,
  };
  proposal.status = "Generated";
  await saveSystemProposal(proposal);
  await saveAuditLog({
    actor,
    action: "system_proposal_generated",
    entityType: "intelligent_system_proposal",
    entityId: id,
    metadata: { model: result.model, title: proposal.brief.projectTitle },
  });
}
