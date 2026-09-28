export const proposalStages = ["Prospects", "Warm", "Hot", "Contracted", "Delivered"] as const;

export type ProposalStage = (typeof proposalStages)[number];

export function isProposalStage(value: unknown): value is ProposalStage {
  return typeof value === "string" && proposalStages.includes(value as ProposalStage);
}
