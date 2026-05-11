import type {
  ExperimentMetrics,
  GrowthExperiment,
  MarketSignal,
  OfferVariant,
  SelectionDecisionValue,
} from "@/lib/adaptive-growth";

export const fitnessComponentWeights = {
  marketPullScore: 0.25,
  conversionScore: 0.2,
  revenuePotentialScore: 0.15,
  marginPotentialScore: 0.15,
  deliveryQualityScore: 0.1,
  strategicFitScore: 0.1,
  reusabilityScore: 0.05,
} as const;

export type FitnessComponentKey = keyof typeof fitnessComponentWeights;

export type FitnessComponentScore = {
  key: FitnessComponentKey;
  label: string;
  score: number | null;
  weight: number;
  source: string;
  warning?: string;
};

export type FitnessEvaluationInput = {
  offer?: Partial<OfferVariant> | null;
  signal?: Partial<MarketSignal> | null;
  experiment?: Partial<GrowthExperiment> | null;
  metrics?: Partial<ExperimentMetrics> | null;
  manualOverrides?: Partial<Record<FitnessComponentKey, number | null>>;
  manualFitnessOverride?: number | null;
  recommendationOverride?: SelectionDecisionValue | null;
};

export type FitnessEvaluationResult = {
  componentScores: Record<FitnessComponentKey, number | null>;
  componentDetails: FitnessComponentScore[];
  fitnessScore: number;
  recommendation: SelectionDecisionValue;
  recommendationBand: string;
  rationale: string;
  missingDataWarnings: string[];
  isIncomplete: boolean;
  availableWeight: number;
  scoreCompletenessPercent: number;
  manualOverrideUsed: boolean;
};

const labels: Record<FitnessComponentKey, string> = {
  marketPullScore: "Market pull",
  conversionScore: "Conversion",
  revenuePotentialScore: "Revenue potential",
  marginPotentialScore: "Margin potential",
  deliveryQualityScore: "Delivery quality",
  strategicFitScore: "Strategic fit",
  reusabilityScore: "Reusability",
};

function clampScore(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function positiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function nullableNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function average(values: Array<number | null>) {
  const usable = values.filter((value): value is number => value !== null);
  if (!usable.length) return null;
  return Math.round(usable.reduce((total, value) => total + value, 0) / usable.length);
}

function scoreMarketPull(
  signal?: Partial<MarketSignal> | null,
  metrics?: Partial<ExperimentMetrics> | null,
) {
  const inquiries = positiveNumber(metrics?.inquiries);
  const meetings = positiveNumber(metrics?.meetings);
  const impressions = positiveNumber(metrics?.impressions);
  const inquiryRateScore =
    impressions > 0 ? Math.min(100, (inquiries / impressions) * 500) : null;
  const volumeScore =
    inquiries || meetings ? Math.min(100, inquiries * 10 + meetings * 18) : null;
  const urgencyScore = clampScore(signal?.urgencyScore);
  const interestScore = clampScore(metrics?.clientInterestScore);

  return average([inquiryRateScore, volumeScore, urgencyScore, interestScore]);
}

function scoreConversion(metrics?: Partial<ExperimentMetrics> | null) {
  const proposalsSent = positiveNumber(metrics?.proposalsSent);
  const dealsWon = positiveNumber(metrics?.dealsWon);

  if (!proposalsSent && !dealsWon) return null;

  const closeRateScore =
    proposalsSent > 0 ? Math.min(100, (dealsWon / proposalsSent) * 140) : null;
  const tractionScore = Math.min(100, proposalsSent * 8 + dealsWon * 28);

  return average([closeRateScore, tractionScore]);
}

function scoreRevenuePotential(
  offer?: Partial<OfferVariant> | null,
  metrics?: Partial<ExperimentMetrics> | null,
) {
  const revenue = positiveNumber(metrics?.revenue);
  const priceAssumption = positiveNumber(offer?.priceAssumption);
  const value = revenue || priceAssumption;

  if (!value) return null;

  return Math.round(Math.min(100, Math.sqrt(value / 10000) * 100));
}

function componentFromMetric(value: unknown) {
  return clampScore(nullableNumber(value));
}

function applyManualOverride(
  key: FitnessComponentKey,
  score: number | null,
  source: string,
  overrides?: Partial<Record<FitnessComponentKey, number | null>>,
) {
  if (!overrides || !(key in overrides)) {
    return { score, source };
  }

  const override = clampScore(overrides[key]);
  return {
    score: override,
    source: override === null ? source : "Manual override",
  };
}

export function recommendSelection(
  fitnessScore: number,
  componentScores?: Partial<Record<FitnessComponentKey, number | null>>,
): { recommendation: SelectionDecisionValue; band: string } {
  if (fitnessScore >= 80) {
    return { recommendation: "Scale", band: "80-100" };
  }

  if (fitnessScore >= 65) {
    const reusable = componentScores?.reusabilityScore ?? 0;
    const strategic = componentScores?.strategicFitScore ?? 0;
    return {
      recommendation: reusable >= 70 || strategic >= 75 ? "Productize" : "Iterate",
      band: "65-79",
    };
  }

  if (fitnessScore >= 50) {
    return { recommendation: "Iterate", band: "50-64" };
  }

  if (fitnessScore >= 35) {
    return { recommendation: "Park", band: "35-49" };
  }

  return { recommendation: "Kill", band: "0-34" };
}

export function calculateOfferFitness(
  input: FitnessEvaluationInput,
): FitnessEvaluationResult {
  const rawComponents: Record<FitnessComponentKey, { score: number | null; source: string }> = {
    marketPullScore: {
      score: scoreMarketPull(input.signal, input.metrics),
      source: "Inquiries, meetings, client interest, and signal urgency",
    },
    conversionScore: {
      score: scoreConversion(input.metrics),
      source: "Proposals sent and deals won",
    },
    revenuePotentialScore: {
      score: scoreRevenuePotential(input.offer, input.metrics),
      source: "Revenue or offer price assumption",
    },
    marginPotentialScore: {
      score: componentFromMetric(input.metrics?.estimatedMargin),
      source: "Estimated margin",
    },
    deliveryQualityScore: {
      score: componentFromMetric(input.metrics?.deliveryQualityScore),
      source: "Delivery QA, trainer, learner, or manual quality score",
    },
    strategicFitScore: {
      score: componentFromMetric(input.metrics?.strategicFitScore),
      source: "Manual or AI-assisted strategic fit score",
    },
    reusabilityScore: {
      score: componentFromMetric(input.metrics?.reusabilityScore),
      source: "Manual reusability score across clients, sectors, or formats",
    },
  };

  const componentDetails = (Object.keys(fitnessComponentWeights) as FitnessComponentKey[]).map(
    (key) => {
      const overridden = applyManualOverride(
        key,
        rawComponents[key].score,
        rawComponents[key].source,
        input.manualOverrides,
      );
      return {
        key,
        label: labels[key],
        score: overridden.score,
        weight: fitnessComponentWeights[key],
        source: overridden.source,
        warning:
          overridden.score === null
            ? `${labels[key]} is missing; add metrics or a manual override.`
            : undefined,
      };
    },
  );

  const missingDataWarnings = componentDetails
    .map((component) => component.warning)
    .filter((warning): warning is string => Boolean(warning));
  const availableWeight = componentDetails.reduce(
    (total, component) =>
      component.score === null ? total : total + component.weight,
    0,
  );
  const weightedTotal = componentDetails.reduce(
    (total, component) =>
      component.score === null ? total : total + component.score * component.weight,
    0,
  );
  const calculatedScore =
    availableWeight > 0 ? Math.round(weightedTotal / availableWeight) : 0;
  const manualFitnessOverride = clampScore(input.manualFitnessOverride);
  const fitnessScore = manualFitnessOverride ?? calculatedScore;
  const componentScores = componentDetails.reduce(
    (scores, component) => ({
      ...scores,
      [component.key]: component.score,
    }),
    {} as Record<FitnessComponentKey, number | null>,
  );
  const recommendation =
    input.recommendationOverride ??
    recommendSelection(fitnessScore, componentScores).recommendation;
  const recommendationBand = recommendSelection(fitnessScore, componentScores).band;
  const isIncomplete = missingDataWarnings.length > 0;
  const scoreCompletenessPercent = Math.round(availableWeight * 100);
  const manualOverrideUsed =
    manualFitnessOverride !== null ||
    Boolean(input.recommendationOverride) ||
    Boolean(
      input.manualOverrides &&
        Object.values(input.manualOverrides).some((value) => clampScore(value) !== null),
    );

  return {
    componentScores,
    componentDetails,
    fitnessScore,
    recommendation,
    recommendationBand,
    rationale: buildDeterministicFitnessRationale({
      fitnessScore,
      recommendation,
      componentDetails,
      isIncomplete,
      scoreCompletenessPercent,
    }),
    missingDataWarnings,
    isIncomplete,
    availableWeight: Number(availableWeight.toFixed(2)),
    scoreCompletenessPercent,
    manualOverrideUsed,
  };
}

export function buildDeterministicFitnessRationale({
  fitnessScore,
  recommendation,
  componentDetails,
  isIncomplete,
  scoreCompletenessPercent,
}: Pick<
  FitnessEvaluationResult,
  | "fitnessScore"
  | "recommendation"
  | "componentDetails"
  | "isIncomplete"
  | "scoreCompletenessPercent"
>) {
  const strongest = componentDetails
    .filter((component) => component.score !== null)
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, 2)
    .map((component) => `${component.label} ${component.score}/100`);
  const weakest = componentDetails
    .filter((component) => component.score !== null)
    .sort((a, b) => Number(a.score) - Number(b.score))
    .slice(0, 2)
    .map((component) => `${component.label} ${component.score}/100`);

  return [
    `Deterministic fitness score: ${fitnessScore}/100.`,
    `Recommended selection: ${recommendation}.`,
    strongest.length ? `Strongest evidence: ${strongest.join("; ")}.` : "",
    weakest.length ? `Weakest evidence: ${weakest.join("; ")}.` : "",
    isIncomplete
      ? `Score is incomplete because only ${scoreCompletenessPercent}% of weighted evidence is available.`
      : "All weighted evidence components are available.",
  ]
    .filter(Boolean)
    .join(" ");
}
