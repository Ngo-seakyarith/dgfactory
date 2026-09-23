export const proposalStages = ["Not Sent", "Sent", "Won", "Delivered", "Lost"] as const;

export type ProposalStage = (typeof proposalStages)[number];

export function isProposalStage(value: unknown): value is ProposalStage {
  return typeof value === "string" && proposalStages.includes(value as ProposalStage);
}

type TrainingOverviewSource = {
  client: string;
  clientId: string | null;
  salesStatus: ProposalStage;
  pricingInputs: { professionalFee: number };
};

function normalizedName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function trainingOverview(packages: TrainingOverviewSource[]) {
  const clients = new Set<string>();
  let bookedFeeCents = 0;

  for (const pkg of packages) {
    const client = normalizedName(pkg.client);
    if (client) clients.add(client);
    else if (pkg.clientId) clients.add(pkg.clientId);
    if (
      (pkg.salesStatus === "Won" || pkg.salesStatus === "Delivered") &&
      Number.isFinite(pkg.pricingInputs.professionalFee)
    ) {
      bookedFeeCents += Math.round(Math.max(0, pkg.pricingInputs.professionalFee) * 100);
    }
  }

  return {
    trainingProposals: packages.length,
    bookedRevenue: bookedFeeCents / 100,
    clientsInProposals: clients.size,
  };
}
