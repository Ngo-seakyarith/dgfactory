export const opportunityStatuses = [
  "Lead",
  "Discovery",
  "Proposal Draft",
  "Proposal Sent",
  "Negotiation",
  "Won",
  "Lost",
  "Dormant",
] as const;

export type OpportunityStatus = (typeof opportunityStatuses)[number];

export type Client = {
  id: string;
  name: string;
  sector: string;
  contactPerson: string;
  email: string;
  phone: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type Opportunity = {
  id: string;
  clientId: string;
  title: string;
  trainingNeed: string;
  estimatedValue: number;
  status: OpportunityStatus;
  probabilityPercent: number;
  expectedCloseDate: string;
  nextFollowUpDate: string;
  notes: string;
  linkedPackageId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PipelineMetrics = {
  totalOpportunities: number;
  totalEstimatedValue: number;
  weightedPipelineValue: number;
  proposalsSent: number;
  wonOpportunities: number;
  lostOpportunities: number;
  upcomingFollowUps: Opportunity[];
};

export type FollowUpDraft = {
  followUpEmail: string;
  shortMessage: string;
  suggestedNextStep: string;
};

export const defaultOpportunityStatus: OpportunityStatus = "Lead";

export function isOpportunityStatus(value: unknown): value is OpportunityStatus {
  return (
    typeof value === "string" &&
    opportunityStatuses.includes(value as OpportunityStatus)
  );
}

export function normalizeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function createEmptyClient(): Client {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name: "",
    sector: "",
    contactPerson: "",
    email: "",
    phone: "",
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function createEmptyOpportunity(
  overrides: Partial<Opportunity> = {},
): Opportunity {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    clientId: "",
    title: "",
    trainingNeed: "",
    estimatedValue: 0,
    status: defaultOpportunityStatus,
    probabilityPercent: 25,
    expectedCloseDate: "",
    nextFollowUpDate: "",
    notes: "",
    linkedPackageId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function normalizeClient(value: Partial<Client>): Client {
  const now = new Date().toISOString();

  return {
    id: value.id || crypto.randomUUID(),
    name: String(value.name ?? "").trim(),
    sector: String(value.sector ?? "").trim(),
    contactPerson: String(value.contactPerson ?? "").trim(),
    email: String(value.email ?? "").trim(),
    phone: String(value.phone ?? "").trim(),
    notes: String(value.notes ?? "").trim(),
    createdAt: value.createdAt || now,
    updatedAt: value.updatedAt || now,
  };
}

export function normalizeOpportunity(value: Partial<Opportunity>): Opportunity {
  const now = new Date().toISOString();

  return {
    id: value.id || crypto.randomUUID(),
    clientId: String(value.clientId ?? "").trim(),
    title: String(value.title ?? "").trim(),
    trainingNeed: String(value.trainingNeed ?? "").trim(),
    estimatedValue: normalizeNumber(value.estimatedValue),
    status: isOpportunityStatus(value.status) ? value.status : defaultOpportunityStatus,
    probabilityPercent: Math.min(
      100,
      Math.max(0, normalizeNumber(value.probabilityPercent, 25)),
    ),
    expectedCloseDate: String(value.expectedCloseDate ?? "").trim(),
    nextFollowUpDate: String(value.nextFollowUpDate ?? "").trim(),
    notes: String(value.notes ?? "").trim(),
    linkedPackageId: value.linkedPackageId || null,
    createdAt: value.createdAt || now,
    updatedAt: value.updatedAt || now,
  };
}

export function calculatePipelineMetrics(
  opportunities: Opportunity[],
): PipelineMetrics {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingLimit = new Date(today);
  upcomingLimit.setDate(today.getDate() + 14);

  const upcomingFollowUps = opportunities
    .filter((opportunity) => {
      if (!opportunity.nextFollowUpDate || opportunity.status === "Won" || opportunity.status === "Lost") {
        return false;
      }

      const followUp = new Date(opportunity.nextFollowUpDate);
      return followUp >= today && followUp <= upcomingLimit;
    })
    .sort((a, b) => a.nextFollowUpDate.localeCompare(b.nextFollowUpDate));

  return {
    totalOpportunities: opportunities.length,
    totalEstimatedValue: opportunities.reduce(
      (sum, item) => sum + item.estimatedValue,
      0,
    ),
    weightedPipelineValue: opportunities.reduce(
      (sum, item) => sum + item.estimatedValue * (item.probabilityPercent / 100),
      0,
    ),
    proposalsSent: opportunities.filter((item) => item.status === "Proposal Sent").length,
    wonOpportunities: opportunities.filter((item) => item.status === "Won").length,
    lostOpportunities: opportunities.filter((item) => item.status === "Lost").length,
    upcomingFollowUps,
  };
}

export function formatCrmMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function createMockFollowUpDraft({
  clientName,
  status,
  trainingNeed,
  lastNotes,
  nextFollowUpDate,
}: {
  clientName: string;
  status: OpportunityStatus;
  trainingNeed: string;
  lastNotes: string;
  nextFollowUpDate: string;
}): FollowUpDraft {
  const dateLine = nextFollowUpDate
    ? `I suggest we reconnect on ${nextFollowUpDate} to confirm the next decision.`
    : "I suggest we confirm the next decision date and owner.";

  return {
    followUpEmail: `Subject: Follow-up on DG Academy training support

Hi ${clientName || "team"},

Thank you for the discussion about ${trainingNeed || "your training priorities"}. Based on the current opportunity status (${status}), DG Academy can help clarify the program scope, participant profile, commercial terms, and implementation next steps.

My suggested next step is a short follow-up conversation to confirm priorities, timeline, and decision process. ${dateLine}

Notes I have captured: ${lastNotes || "No additional notes yet."}

Best,
DG Academy`,
    shortMessage: `Hi ${clientName || "team"}, following up on ${trainingNeed || "the DG Academy training discussion"}. Suggested next step: confirm scope, timing, and decision owner. ${dateLine}`,
    suggestedNextStep:
      "Schedule a short discovery/proposal review call and confirm participant count, budget range, and decision timeline.",
  };
}
