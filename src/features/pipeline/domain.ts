export const proposalStages = ["Lead", "Qualified", "Proposal Sent", "Negotiation", "Verbal Commit", "Confirmed", "Delivered", "Lost", "On Hold"] as const;

export type ProposalStage = (typeof proposalStages)[number];

export const stageRules = {
  Lead: { probability: 10, group: "Open" },
  Qualified: { probability: 25, group: "Open" },
  "Proposal Sent": { probability: 40, group: "Open" },
  Negotiation: { probability: 60, group: "Open" },
  "Verbal Commit": { probability: 80, group: "Open" },
  Confirmed: { probability: 95, group: "Committed" },
  Delivered: { probability: 100, group: "Won" },
  Lost: { probability: 0, group: "Lost" },
  "On Hold": { probability: 10, group: "Hold" },
} as const satisfies Record<ProposalStage, { probability: number; group: string }>;

export function isProposalStage(value: unknown): value is ProposalStage {
  return typeof value === "string" && proposalStages.includes(value as ProposalStage);
}
