import { calculateOfferFitness } from "@/lib/adaptive-growth/fitness";

export const growthSourceTypes = [
  "Client Conversation",
  "LinkedIn",
  "Competitor",
  "Policy",
  "News",
  "Internal Observation",
  "Training Feedback",
  "Sales Call",
  "Partner",
  "Other",
] as const;

export const marketSignalStatuses = [
  "New",
  "Reviewed",
  "Converted to Offer",
  "Archived",
] as const;

export const offerVariantStatuses = [
  "Draft",
  "Testing",
  "Selected",
  "Iterating",
  "Scaling",
  "Parked",
  "Killed",
] as const;

export const offerFormats = [
  "Briefing",
  "Workshop",
  "Masterclass",
  "Online Cohort",
  "In-house Training",
  "Coaching Package",
  "Digital Product",
  "Consulting Package",
  "Other",
] as const;

export const growthExperimentStatuses = [
  "Planned",
  "Running",
  "Completed",
  "Paused",
  "Cancelled",
] as const;

export const selectionDecisions = [
  "Scale",
  "Iterate",
  "Park",
  "Kill",
  "Bundle",
  "Partner",
  "Productize",
] as const;

export const genomeItemTypes = [
  "Winning Pattern",
  "Failed Pattern",
  "Proposal Language",
  "Pricing Insight",
  "Client Objection",
  "Sector Insight",
  "Delivery Lesson",
  "Prompt Improvement",
  "Sales Message",
  "Training Activity",
  "Other",
] as const;

export const genomeItemStatuses = ["Draft", "Active", "Archived"] as const;

export type GrowthSourceType = (typeof growthSourceTypes)[number];
export type MarketSignalStatus = (typeof marketSignalStatuses)[number];
export type OfferVariantStatus = (typeof offerVariantStatuses)[number];
export type OfferFormat = (typeof offerFormats)[number];
export type GrowthExperimentStatus = (typeof growthExperimentStatuses)[number];
export type SelectionDecisionValue = (typeof selectionDecisions)[number];
export type GenomeItemType = (typeof genomeItemTypes)[number];
export type GenomeItemStatus = (typeof genomeItemStatuses)[number];

export type MarketSignal = {
  id: string;
  title: string;
  description: string;
  sourceType: GrowthSourceType;
  sourceName: string;
  sector: string;
  audience: string;
  urgencyScore: number | null;
  confidenceScore: number | null;
  tags: string[];
  status: MarketSignalStatus;
  createdAt: string;
  updatedAt: string;
};

export type OfferVariant = {
  id: string;
  signalId: string | null;
  title: string;
  description: string;
  targetAudience: string;
  sector: string;
  format: OfferFormat;
  duration: string;
  promise: string;
  priceAssumption: number | null;
  status: OfferVariantStatus;
  createdAt: string;
  updatedAt: string;
};

export type GrowthExperiment = {
  id: string;
  offerVariantId: string;
  hypothesis: string;
  testMethod: string;
  channel: string;
  startDate: string;
  endDate: string;
  successCriteria: string;
  owner: string;
  status: GrowthExperimentStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ExperimentMetrics = {
  id: string;
  experimentId: string;
  impressions: number;
  inquiries: number;
  meetings: number;
  proposalsSent: number;
  dealsWon: number;
  revenue: number;
  estimatedMargin: number | null;
  deliveryQualityScore: number | null;
  clientInterestScore: number | null;
  strategicFitScore: number | null;
  reusabilityScore: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type SelectionDecision = {
  id: string;
  offerVariantId: string;
  experimentId: string | null;
  decision: SelectionDecisionValue;
  fitnessScore: number;
  rationale: string;
  nextAction: string;
  decidedBy: string;
  createdAt: string;
};

export type LearningGenomeItem = {
  id: string;
  title: string;
  type: GenomeItemType;
  content: string;
  sourceOfferVariantId: string | null;
  sourceExperimentId: string | null;
  tags: string[];
  confidenceScore: number | null;
  status: GenomeItemStatus;
  createdAt: string;
  updatedAt: string;
};

export type AdaptiveGrowthData = {
  signals: MarketSignal[];
  offers: OfferVariant[];
  experiments: GrowthExperiment[];
  metrics: ExperimentMetrics[];
  decisions: SelectionDecision[];
  genomeItems: LearningGenomeItem[];
};

export type AdaptiveGrowthKind =
  | "signal"
  | "offer"
  | "experiment"
  | "metric"
  | "decision"
  | "genome";

export type GrowthDashboardMetrics = {
  activeSignals: number;
  offerVariants: number;
  runningExperiments: number;
  offersSelectedToScale: number;
  offersKilled: number;
  averageFitnessScore: number;
  topOffersByFitness: Array<{
    offer: OfferVariant;
    score: number;
    decision: SelectionDecisionValue;
  }>;
  latestGenomeItems: LearningGenomeItem[];
};

export function normalizeTags(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 24);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 24);
  }

  return [];
}

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function nullableNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

function isOneOf<T extends readonly string[]>(options: T, value: unknown): value is T[number] {
  return typeof value === "string" && options.includes(value);
}

export function normalizeMarketSignal(input: Partial<MarketSignal>): MarketSignal {
  const now = new Date().toISOString();

  return {
    id: input.id || crypto.randomUUID(),
    title: stringValue(input.title),
    description: stringValue(input.description),
    sourceType: isOneOf(growthSourceTypes, input.sourceType)
      ? input.sourceType
      : "Other",
    sourceName: stringValue(input.sourceName),
    sector: stringValue(input.sector),
    audience: stringValue(input.audience),
    urgencyScore: nullableNumber(input.urgencyScore),
    confidenceScore: nullableNumber(input.confidenceScore),
    tags: normalizeTags(input.tags),
    status: isOneOf(marketSignalStatuses, input.status) ? input.status : "New",
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  };
}

export function normalizeOfferVariant(input: Partial<OfferVariant>): OfferVariant {
  const now = new Date().toISOString();

  return {
    id: input.id || crypto.randomUUID(),
    signalId: input.signalId || null,
    title: stringValue(input.title),
    description: stringValue(input.description),
    targetAudience: stringValue(input.targetAudience),
    sector: stringValue(input.sector),
    format: isOneOf(offerFormats, input.format) ? input.format : "Workshop",
    duration: stringValue(input.duration),
    promise: stringValue(input.promise),
    priceAssumption: nullableNumber(input.priceAssumption),
    status: isOneOf(offerVariantStatuses, input.status) ? input.status : "Draft",
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  };
}

export function normalizeGrowthExperiment(
  input: Partial<GrowthExperiment>,
): GrowthExperiment {
  const now = new Date().toISOString();

  return {
    id: input.id || crypto.randomUUID(),
    offerVariantId: stringValue(input.offerVariantId),
    hypothesis: stringValue(input.hypothesis),
    testMethod: stringValue(input.testMethod),
    channel: stringValue(input.channel),
    startDate: stringValue(input.startDate),
    endDate: stringValue(input.endDate),
    successCriteria: stringValue(input.successCriteria),
    owner: stringValue(input.owner),
    status: isOneOf(growthExperimentStatuses, input.status)
      ? input.status
      : "Planned",
    notes: stringValue(input.notes),
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  };
}

export function normalizeExperimentMetrics(
  input: Partial<ExperimentMetrics>,
): ExperimentMetrics {
  const now = new Date().toISOString();

  return {
    id: input.id || crypto.randomUUID(),
    experimentId: stringValue(input.experimentId),
    impressions: safeNumber(input.impressions),
    inquiries: safeNumber(input.inquiries),
    meetings: safeNumber(input.meetings),
    proposalsSent: safeNumber(input.proposalsSent),
    dealsWon: safeNumber(input.dealsWon),
    revenue: safeNumber(input.revenue),
    estimatedMargin: nullableNumber(input.estimatedMargin),
    deliveryQualityScore: nullableNumber(input.deliveryQualityScore),
    clientInterestScore: nullableNumber(input.clientInterestScore),
    strategicFitScore: nullableNumber(input.strategicFitScore),
    reusabilityScore: nullableNumber(input.reusabilityScore),
    notes: stringValue(input.notes),
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  };
}

export function calculateFitnessScore(input: Partial<ExperimentMetrics>) {
  return calculateOfferFitness({ metrics: input }).fitnessScore;
}

export function normalizeSelectionDecision(
  input: Partial<SelectionDecision>,
): SelectionDecision {
  return {
    id: input.id || crypto.randomUUID(),
    offerVariantId: stringValue(input.offerVariantId),
    experimentId: input.experimentId || null,
    decision: isOneOf(selectionDecisions, input.decision)
      ? input.decision
      : "Iterate",
    fitnessScore: Math.min(100, safeNumber(input.fitnessScore)),
    rationale: stringValue(input.rationale),
    nextAction: stringValue(input.nextAction),
    decidedBy: stringValue(input.decidedBy),
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

export function normalizeLearningGenomeItem(
  input: Partial<LearningGenomeItem>,
): LearningGenomeItem {
  const now = new Date().toISOString();

  return {
    id: input.id || crypto.randomUUID(),
    title: stringValue(input.title),
    type: isOneOf(genomeItemTypes, input.type) ? input.type : "Other",
    content: stringValue(input.content),
    sourceOfferVariantId: input.sourceOfferVariantId || null,
    sourceExperimentId: input.sourceExperimentId || null,
    tags: normalizeTags(input.tags),
    confidenceScore: nullableNumber(input.confidenceScore),
    status: isOneOf(genomeItemStatuses, input.status) ? input.status : "Draft",
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  };
}

export function calculateGrowthDashboardMetrics(
  data: AdaptiveGrowthData,
): GrowthDashboardMetrics {
  const latestDecisionByOffer = new Map<string, SelectionDecision>();
  data.decisions
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .forEach((decision) => {
      if (!latestDecisionByOffer.has(decision.offerVariantId)) {
        latestDecisionByOffer.set(decision.offerVariantId, decision);
      }
    });

  const topOffersByFitness = [...latestDecisionByOffer.values()]
    .map((decision) => {
      const offer = data.offers.find((item) => item.id === decision.offerVariantId);
      return offer
        ? { offer, score: decision.fitnessScore, decision: decision.decision }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const averageFitnessScore = data.decisions.length
    ? Math.round(
        data.decisions.reduce((total, decision) => total + decision.fitnessScore, 0) /
          data.decisions.length,
      )
    : 0;

  return {
    activeSignals: data.signals.filter((signal) => signal.status !== "Archived").length,
    offerVariants: data.offers.length,
    runningExperiments: data.experiments.filter(
      (experiment) => experiment.status === "Running",
    ).length,
    offersSelectedToScale: data.offers.filter(
      (offer) => offer.status === "Scaling" || offer.status === "Selected",
    ).length,
    offersKilled: data.offers.filter((offer) => offer.status === "Killed").length,
    averageFitnessScore,
    topOffersByFitness,
    latestGenomeItems: data.genomeItems
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5),
  };
}
