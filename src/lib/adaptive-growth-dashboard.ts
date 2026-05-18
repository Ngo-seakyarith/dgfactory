import type {
  AdaptiveGrowthData,
  ExperimentMetrics,
  GrowthExperiment,
  LearningGenomeItem,
  MarketSignal,
  OfferFormat,
  OfferVariant,
} from "@/lib/adaptive-growth";
import {
  calculateOfferFitness,
  type FitnessEvaluationResult,
} from "@/lib/adaptive-growth/fitness";
import { listAdaptiveGrowthData } from "@/lib/adaptive-growth-storage";
import { listImprovementOpportunities } from "@/lib/improvement-storage";
import type { ImprovementOpportunity } from "@/lib/improvements";
import { listLoopRuns } from "@/lib/loops/storage";
import type { LoopRun, LoopType } from "@/lib/loops/types";
import { listApprovalRequests } from "@/lib/approvals";

export const adaptiveDashboardRanges = [
  "this_week",
  "last_30_days",
  "this_quarter",
  "custom",
] as const;

export type AdaptiveDashboardRange = (typeof adaptiveDashboardRanges)[number];

export type AdaptiveDashboardFilters = {
  range?: AdaptiveDashboardRange;
  startDate?: string;
  endDate?: string;
};

export type AdaptiveGrowthScore = {
  score: number;
  interpretation:
    | "Highly adaptive"
    | "Adaptive but inconsistent"
    | "Sensing without enough selection"
    | "Slow adaptation";
  components: Array<{
    key:
      | "signalFreshness"
      | "variantGeneration"
      | "experimentActivity"
      | "selectionDiscipline"
      | "replicationRate"
      | "learningCapture";
    label: string;
    score: number;
    weight: number;
    evidence: string;
  }>;
};

export type OfferFitnessSummary = {
  offer: OfferVariant;
  experiment: GrowthExperiment | null;
  metrics: ExperimentMetrics | null;
  signal: MarketSignal | null;
  fitness: FitnessEvaluationResult;
};

export type AdaptiveGrowthExecutiveReport = {
  generatedAt: string;
  filters: Required<Pick<AdaptiveDashboardFilters, "range">> & {
    startDate: string;
    endDate: string;
  };
  adaptationScore: AdaptiveGrowthScore;
  velocity: {
    newSignals: number;
    newOfferVariants: number;
    experimentsLaunched: number;
    experimentsCompleted: number;
    selectionDecisionsMade: number;
    genomeItemsAdded: number;
  };
  offerFitness: {
    topOffers: OfferFitnessSummary[];
    bottomOffers: OfferFitnessSummary[];
    scaleCandidates: OfferFitnessSummary[];
    killCandidates: OfferFitnessSummary[];
    offersWithMissingData: OfferFitnessSummary[];
  };
  experimentFunnel: {
    signals: number;
    offers: number;
    experiments: number;
    proposals: number;
    dealsWon: number;
    replicatedTemplates: number;
  };
  learningGenome: {
    newWinningPatterns: LearningGenomeItem[];
    newFailedPatterns: LearningGenomeItem[];
    mostReusedGenomeItems: Array<LearningGenomeItem & { reuseProxyScore: number }>;
    promptImprovementSuggestions: Array<
      | { kind: "genome"; title: string; status: string; source: string }
      | { kind: "improvement"; title: string; status: string; source: string }
    >;
  };
  expansionMap: {
    strongestSectors: Array<{ name: string; score: number; evidence: string }>;
    strongestAudiences: Array<{ name: string; score: number; evidence: string }>;
    bestFormats: Array<{ name: OfferFormat | string; score: number; evidence: string }>;
    recommendedNextNiches: string[];
  };
  openClawLoopStatus: {
    latestMarketSensingLoop: LoopRun | null;
    latestExperimentReview: LoopRun | null;
    latestSelectionReview: LoopRun | null;
    latestGenomeUpdate: LoopRun | null;
    pendingApprovals: number;
  };
  improvementStatus: {
    approvedImprovementTasks: ImprovementOpportunity[];
    implementedImprovements: ImprovementOpportunity[];
  };
};

const oneDayMs = 24 * 60 * 60 * 1000;

function startOfToday(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date = new Date()) {
  const today = startOfToday(date);
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return new Date(today.getTime() + mondayOffset * oneDayMs);
}

function startOfQuarter(date = new Date()) {
  const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3;
  return new Date(date.getFullYear(), quarterStartMonth, 1);
}

function parseDate(value: string | undefined, defaultValue: Date) {
  if (!value) return defaultValue;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? defaultValue : parsed;
}

export function resolveAdaptiveDashboardFilters(
  filters: AdaptiveDashboardFilters = {},
) {
  const now = new Date();
  const range =
    filters.range && adaptiveDashboardRanges.includes(filters.range)
      ? filters.range
      : "last_30_days";
  const defaultStart =
    range === "this_week"
      ? startOfWeek(now)
      : range === "this_quarter"
        ? startOfQuarter(now)
        : new Date(now.getTime() - 30 * oneDayMs);
  const start =
    range === "custom" ? parseDate(filters.startDate, defaultStart) : defaultStart;
  const end =
    range === "custom" ? parseDate(filters.endDate, now) : now;

  return {
    range,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

function inRange(value: string | null | undefined, start: string, end: string) {
  if (!value) return false;
  return value >= start && value <= end;
}

function latestExperimentForOffer(offer: OfferVariant, data: AdaptiveGrowthData) {
  return (
    data.experiments
      .filter((experiment) => experiment.offerVariantId === offer.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
  );
}

function latestMetricsForExperiment(
  experiment: GrowthExperiment | null,
  data: AdaptiveGrowthData,
) {
  if (!experiment) return null;
  return (
    data.metrics
      .filter((metric) => metric.experimentId === experiment.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
  );
}

function evaluateOffers(data: AdaptiveGrowthData): OfferFitnessSummary[] {
  return data.offers.map((offer) => {
    const experiment = latestExperimentForOffer(offer, data);
    const metrics = latestMetricsForExperiment(experiment, data);
    const signal = offer.signalId
      ? data.signals.find((item) => item.id === offer.signalId) ?? null
      : null;

    return {
      offer,
      experiment,
      metrics,
      signal,
      fitness: calculateOfferFitness({ offer, experiment, metrics, signal }),
    };
  });
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function ratioScore(value: number, target: number) {
  if (target <= 0) return 0;
  return clampScore((value / target) * 100);
}

function scoreInterpretation(score: number): AdaptiveGrowthScore["interpretation"] {
  if (score >= 80) return "Highly adaptive";
  if (score >= 60) return "Adaptive but inconsistent";
  if (score >= 40) return "Sensing without enough selection";
  return "Slow adaptation";
}

function calculateAdaptationScore({
  velocity,
  experimentFunnel,
}: {
  velocity: AdaptiveGrowthExecutiveReport["velocity"];
  experimentFunnel: AdaptiveGrowthExecutiveReport["experimentFunnel"];
}): AdaptiveGrowthScore {
  const components: AdaptiveGrowthScore["components"] = [
    {
      key: "signalFreshness",
      label: "Signal freshness",
      score: ratioScore(velocity.newSignals, 5),
      weight: 0.15,
      evidence: `${velocity.newSignals} new signals captured in the selected period.`,
    },
    {
      key: "variantGeneration",
      label: "Variant generation",
      score: ratioScore(velocity.newOfferVariants, 7),
      weight: 0.15,
      evidence: `${velocity.newOfferVariants} offer variants created.`,
    },
    {
      key: "experimentActivity",
      label: "Experiment activity",
      score: ratioScore(
        velocity.experimentsLaunched + velocity.experimentsCompleted,
        4,
      ),
      weight: 0.2,
      evidence: `${velocity.experimentsLaunched} launched and ${velocity.experimentsCompleted} completed experiments.`,
    },
    {
      key: "selectionDiscipline",
      label: "Selection discipline",
      score: ratioScore(velocity.selectionDecisionsMade, 3),
      weight: 0.2,
      evidence: `${velocity.selectionDecisionsMade} selection decisions made.`,
    },
    {
      key: "replicationRate",
      label: "Replication rate",
      score: ratioScore(experimentFunnel.replicatedTemplates, 3),
      weight: 0.15,
      evidence: `${experimentFunnel.replicatedTemplates} replicated templates or active reusable assets.`,
    },
    {
      key: "learningCapture",
      label: "Learning capture",
      score: ratioScore(velocity.genomeItemsAdded, 5),
      weight: 0.15,
      evidence: `${velocity.genomeItemsAdded} learning genome items added.`,
    },
  ];
  const score = clampScore(
    components.reduce((total, component) => total + component.score * component.weight, 0),
  );

  return {
    score,
    interpretation: scoreInterpretation(score),
    components,
  };
}

function groupScores<T>(
  items: T[],
  getKey: (item: T) => string,
  getScore: (item: T) => number,
) {
  const groups = new Map<string, { total: number; count: number }>();

  items.forEach((item) => {
    const key = getKey(item).trim();
    if (!key) return;
    const current = groups.get(key) ?? { total: 0, count: 0 };
    current.total += getScore(item);
    current.count += 1;
    groups.set(key, current);
  });

  return [...groups.entries()]
    .map(([name, value]) => ({
      name,
      score: clampScore(value.total / value.count),
      evidence: `${value.count} signal or offer record${value.count === 1 ? "" : "s"}.`,
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 5);
}

function latestLoop(runs: LoopRun[], type: LoopType) {
  return runs.find((run) => run.loopType === type) ?? null;
}

function createMarkdownReport(report: AdaptiveGrowthExecutiveReport) {
  const topOffers = report.offerFitness.topOffers
    .map((item) => `- ${item.offer.title}: ${item.fitness.fitnessScore}/100 (${item.fitness.recommendation})`)
    .join("\n");
  const niches = report.expansionMap.recommendedNextNiches.map((item) => `- ${item}`).join("\n");

  return [
    "# DG Academy Adaptive Growth Report",
    "",
    `Generated: ${new Date(report.generatedAt).toLocaleString("en-US")}`,
    `Period: ${report.filters.startDate.slice(0, 10)} to ${report.filters.endDate.slice(0, 10)}`,
    "",
    `## Adaptive Growth Score: ${report.adaptationScore.score}/100`,
    report.adaptationScore.interpretation,
    "",
    "## Adaptation Velocity",
    `- New signals: ${report.velocity.newSignals}`,
    `- New offer variants: ${report.velocity.newOfferVariants}`,
    `- Experiments launched: ${report.velocity.experimentsLaunched}`,
    `- Experiments completed: ${report.velocity.experimentsCompleted}`,
    `- Selection decisions: ${report.velocity.selectionDecisionsMade}`,
    `- Genome items added: ${report.velocity.genomeItemsAdded}`,
    "",
    "## Top Offers by Fitness",
    topOffers || "- No scored offers yet.",
    "",
    "## Funnel",
    `Signals ${report.experimentFunnel.signals} -> Offers ${report.experimentFunnel.offers} -> Experiments ${report.experimentFunnel.experiments} -> Proposals ${report.experimentFunnel.proposals} -> Deals Won ${report.experimentFunnel.dealsWon} -> Replicated Templates ${report.experimentFunnel.replicatedTemplates}`,
    "",
    "## Recommended Next Niches",
    niches || "- Add more signals and experiment data before choosing niches.",
    "",
    "## Governance Notes",
    `Pending approvals: ${report.openClawLoopStatus.pendingApprovals}`,
    `Approved improvement tasks: ${report.improvementStatus.approvedImprovementTasks.length}`,
    "AI recommendations should reference only available data and label uncertainty.",
  ].join("\n");
}

export function adaptiveGrowthReportToMarkdown(report: AdaptiveGrowthExecutiveReport) {
  return createMarkdownReport(report);
}

export async function buildAdaptiveGrowthExecutiveReport(
  filters: AdaptiveDashboardFilters = {},
): Promise<AdaptiveGrowthExecutiveReport> {
  const resolved = resolveAdaptiveDashboardFilters(filters);
  const [
    data,
    loopRuns,
    pendingApprovals,
    approvedImprovementTasks,
    implementedImprovements,
  ] = await Promise.all([
    listAdaptiveGrowthData(),
    listLoopRuns(),
    listApprovalRequests({ status: "Pending" }),
    listImprovementOpportunities({ status: "Approved" }),
    listImprovementOpportunities({ status: "Implemented" }),
  ]);
  const { startDate, endDate } = resolved;
  const signalsInRange = data.signals.filter((item) =>
    inRange(item.createdAt, startDate, endDate),
  );
  const offersInRange = data.offers.filter((item) =>
    inRange(item.createdAt, startDate, endDate),
  );
  const experimentsLaunched = data.experiments.filter((item) =>
    inRange(item.createdAt, startDate, endDate),
  );
  const experimentsCompleted = data.experiments.filter(
    (item) =>
      item.status === "Completed" && inRange(item.updatedAt, startDate, endDate),
  );
  const decisionsInRange = data.decisions.filter((item) =>
    inRange(item.createdAt, startDate, endDate),
  );
  const genomeInRange = data.genomeItems.filter((item) =>
    inRange(item.createdAt, startDate, endDate),
  );
  const metricsInRange = data.metrics.filter((item) =>
    inRange(item.updatedAt, startDate, endDate),
  );
  const evaluatedOffers = evaluateOffers(data).sort(
    (a, b) => b.fitness.fitnessScore - a.fitness.fitnessScore,
  );
  const activeReplicatedTemplates = data.genomeItems.filter(
    (item) =>
      item.status === "Active" &&
      [
        "Winning Pattern",
        "Proposal Language",
        "Pricing Insight",
        "Sales Message",
        "Training Activity",
      ].includes(item.type),
  );
  const experimentFunnel = {
    signals: signalsInRange.length,
    offers: offersInRange.length,
    experiments: experimentsLaunched.length,
    proposals: metricsInRange.reduce((total, item) => total + item.proposalsSent, 0),
    dealsWon: metricsInRange.reduce((total, item) => total + item.dealsWon, 0),
    replicatedTemplates: activeReplicatedTemplates.length,
  };
  const velocity = {
    newSignals: signalsInRange.length,
    newOfferVariants: offersInRange.length,
    experimentsLaunched: experimentsLaunched.length,
    experimentsCompleted: experimentsCompleted.length,
    selectionDecisionsMade: decisionsInRange.length,
    genomeItemsAdded: genomeInRange.length,
  };
  const topFormats = groupScores(
    evaluatedOffers,
    (item) => item.offer.format,
    (item) => item.fitness.fitnessScore,
  );
  const strongestSectors = groupScores(
    [
      ...data.signals.map((signal) => ({
        sector: signal.sector,
        score: ((signal.urgencyScore ?? 50) + (signal.confidenceScore ?? 50)) / 2,
      })),
      ...evaluatedOffers.map((item) => ({
        sector: item.offer.sector,
        score: item.fitness.fitnessScore,
      })),
    ],
    (item) => item.sector,
    (item) => item.score,
  );
  const strongestAudiences = groupScores(
    [
      ...data.signals.map((signal) => ({
        audience: signal.audience,
        score: ((signal.urgencyScore ?? 50) + (signal.confidenceScore ?? 50)) / 2,
      })),
      ...evaluatedOffers.map((item) => ({
        audience: item.offer.targetAudience,
        score: item.fitness.fitnessScore,
      })),
    ],
    (item) => item.audience,
    (item) => item.score,
  );
  const recommendedNextNiches = strongestSectors.slice(0, 3).flatMap((sector, index) => {
    const audience = strongestAudiences[index]?.name ?? "decision makers";
    const format = topFormats[index]?.name ?? "Workshop";
    return [`${sector.name} ${format} for ${audience}`];
  });
  return {
    generatedAt: new Date().toISOString(),
    filters: resolved,
    adaptationScore: calculateAdaptationScore({ velocity, experimentFunnel }),
    velocity,
    offerFitness: {
      topOffers: evaluatedOffers.slice(0, 5),
      bottomOffers: evaluatedOffers.slice(-5).reverse(),
      scaleCandidates: evaluatedOffers
        .filter((item) => ["Scale", "Productize"].includes(item.fitness.recommendation))
        .slice(0, 5),
      killCandidates: evaluatedOffers
        .filter((item) => item.fitness.recommendation === "Kill")
        .slice(0, 5),
      offersWithMissingData: evaluatedOffers
        .filter((item) => item.fitness.isIncomplete)
        .slice(0, 8),
    },
    experimentFunnel,
    learningGenome: {
      newWinningPatterns: genomeInRange
        .filter((item) => item.type === "Winning Pattern")
        .slice(0, 5),
      newFailedPatterns: genomeInRange
        .filter((item) => item.type === "Failed Pattern")
        .slice(0, 5),
      mostReusedGenomeItems: data.genomeItems
        .map((item) => ({
          ...item,
          reuseProxyScore:
            (item.status === "Active" ? 30 : 0) +
            (item.confidenceScore ?? 50) +
            item.tags.length * 3 +
            (item.sourceOfferVariantId ? 10 : 0) +
            (item.sourceExperimentId ? 10 : 0),
        }))
        .sort((a, b) => b.reuseProxyScore - a.reuseProxyScore)
        .slice(0, 5),
      promptImprovementSuggestions: [
        ...data.genomeItems
          .filter((item) => item.type === "Prompt Improvement")
          .slice(0, 5)
          .map((item) => ({
            kind: "genome" as const,
            title: item.title,
            status: item.status,
            source: "Learning Genome",
          })),
        ...approvedImprovementTasks
          .filter((item) => item.category === "Prompt Improvement")
          .slice(0, 5)
          .map((item) => ({
            kind: "improvement" as const,
            title: item.title,
            status: item.status,
            source: item.sourceType,
          })),
      ],
    },
    expansionMap: {
      strongestSectors,
      strongestAudiences,
      bestFormats: topFormats,
      recommendedNextNiches: recommendedNextNiches.length
        ? recommendedNextNiches
        : ["Capture more market signals before selecting the next niche."],
    },
    openClawLoopStatus: {
      latestMarketSensingLoop: latestLoop(loopRuns, "weekly_market_sensing"),
      latestExperimentReview: latestLoop(loopRuns, "weekly_experiment_review"),
      latestSelectionReview: latestLoop(loopRuns, "weekly_selection_review"),
      latestGenomeUpdate: latestLoop(loopRuns, "monthly_learning_genome_update"),
      pendingApprovals: pendingApprovals.length,
    },
    improvementStatus: {
      approvedImprovementTasks,
      implementedImprovements,
    },
  };
}
