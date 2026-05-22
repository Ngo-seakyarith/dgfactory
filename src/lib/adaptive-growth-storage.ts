import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scopeAppData, withAppScope } from "@/lib/request-scope";
import {
  calculateGrowthDashboardMetrics,
  normalizeExperimentMetrics,
  normalizeGrowthExperiment,
  normalizeLearningGenomeItem,
  normalizeMarketSignal,
  normalizeOfferVariant,
  normalizeSelectionDecision,
  type AdaptiveGrowthKind,
  type ExperimentMetrics,
  type GrowthExperiment,
  type LearningGenomeItem,
  type MarketSignal,
  type OfferVariant,
  type SelectionDecision,
  type AdaptiveGrowthData,
} from "@/lib/adaptive-growth";

type SignalRow = {
  id: string;
  title: string;
  description: string | null;
  source_type: string | null;
  source_name: string | null;
  sector: string | null;
  audience: string | null;
  urgency_score: number | null;
  confidence_score: number | null;
  tags: string[] | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

type OfferRow = {
  id: string;
  signal_id: string | null;
  title: string;
  description: string | null;
  target_audience: string | null;
  sector: string | null;
  format: string | null;
  duration: string | null;
  promise: string | null;
  price_assumption: number | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

type ExperimentRow = {
  id: string;
  offer_variant_id: string;
  hypothesis: string | null;
  test_method: string | null;
  channel: string | null;
  start_date: string | null;
  end_date: string | null;
  success_criteria: string | null;
  owner: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type MetricRow = {
  id: string;
  experiment_id: string;
  impressions: number | null;
  inquiries: number | null;
  meetings: number | null;
  proposals_sent: number | null;
  deals_won: number | null;
  revenue: number | null;
  estimated_margin: number | null;
  delivery_quality_score: number | null;
  client_interest_score: number | null;
  strategic_fit_score: number | null;
  reusability_score: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type DecisionRow = {
  id: string;
  offer_variant_id: string;
  experiment_id: string | null;
  decision: string | null;
  fitness_score: number | null;
  rationale: string | null;
  next_action: string | null;
  decided_by: string | null;
  created_at: string;
};

type GenomeRow = {
  id: string;
  title: string;
  type: string | null;
  content: string | null;
  source_offer_variant_id: string | null;
  source_experiment_id: string | null;
  tags: string[] | null;
  confidence_score: number | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

function signalToRow(signal: MarketSignal) {
  return {
    id: signal.id,
    title: signal.title,
    description: signal.description,
    source_type: signal.sourceType,
    source_name: signal.sourceName || null,
    sector: signal.sector || null,
    audience: signal.audience || null,
    urgency_score: signal.urgencyScore,
    confidence_score: signal.confidenceScore,
    tags: signal.tags,
    status: signal.status,
    created_at: signal.createdAt,
    updated_at: signal.updatedAt,
  };
}

function signalFromRow(row: SignalRow) {
  return normalizeMarketSignal({
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    sourceType: row.source_type as MarketSignal["sourceType"],
    sourceName: row.source_name ?? "",
    sector: row.sector ?? "",
    audience: row.audience ?? "",
    urgencyScore: row.urgency_score,
    confidenceScore: row.confidence_score,
    tags: row.tags ?? [],
    status: row.status as MarketSignal["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function offerToRow(offer: OfferVariant) {
  return {
    id: offer.id,
    signal_id: offer.signalId,
    title: offer.title,
    description: offer.description,
    target_audience: offer.targetAudience,
    sector: offer.sector || null,
    format: offer.format,
    duration: offer.duration || null,
    promise: offer.promise,
    price_assumption: offer.priceAssumption,
    status: offer.status,
    created_at: offer.createdAt,
    updated_at: offer.updatedAt,
  };
}

function offerFromRow(row: OfferRow) {
  return normalizeOfferVariant({
    id: row.id,
    signalId: row.signal_id,
    title: row.title,
    description: row.description ?? "",
    targetAudience: row.target_audience ?? "",
    sector: row.sector ?? "",
    format: row.format as OfferVariant["format"],
    duration: row.duration ?? "",
    promise: row.promise ?? "",
    priceAssumption: row.price_assumption,
    status: row.status as OfferVariant["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function experimentToRow(experiment: GrowthExperiment) {
  return {
    id: experiment.id,
    offer_variant_id: experiment.offerVariantId,
    hypothesis: experiment.hypothesis,
    test_method: experiment.testMethod,
    channel: experiment.channel || null,
    start_date: experiment.startDate || null,
    end_date: experiment.endDate || null,
    success_criteria: experiment.successCriteria,
    owner: experiment.owner || null,
    status: experiment.status,
    notes: experiment.notes,
    created_at: experiment.createdAt,
    updated_at: experiment.updatedAt,
  };
}

function experimentFromRow(row: ExperimentRow) {
  return normalizeGrowthExperiment({
    id: row.id,
    offerVariantId: row.offer_variant_id,
    hypothesis: row.hypothesis ?? "",
    testMethod: row.test_method ?? "",
    channel: row.channel ?? "",
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? "",
    successCriteria: row.success_criteria ?? "",
    owner: row.owner ?? "",
    status: row.status as GrowthExperiment["status"],
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function metricToRow(metric: ExperimentMetrics) {
  return {
    id: metric.id,
    experiment_id: metric.experimentId,
    impressions: metric.impressions,
    inquiries: metric.inquiries,
    meetings: metric.meetings,
    proposals_sent: metric.proposalsSent,
    deals_won: metric.dealsWon,
    revenue: metric.revenue,
    estimated_margin: metric.estimatedMargin,
    delivery_quality_score: metric.deliveryQualityScore,
    client_interest_score: metric.clientInterestScore,
    strategic_fit_score: metric.strategicFitScore,
    reusability_score: metric.reusabilityScore,
    notes: metric.notes || null,
    created_at: metric.createdAt,
    updated_at: metric.updatedAt,
  };
}

function metricFromRow(row: MetricRow) {
  return normalizeExperimentMetrics({
    id: row.id,
    experimentId: row.experiment_id,
    impressions: row.impressions ?? 0,
    inquiries: row.inquiries ?? 0,
    meetings: row.meetings ?? 0,
    proposalsSent: row.proposals_sent ?? 0,
    dealsWon: row.deals_won ?? 0,
    revenue: row.revenue ?? 0,
    estimatedMargin: row.estimated_margin,
    deliveryQualityScore: row.delivery_quality_score,
    clientInterestScore: row.client_interest_score,
    strategicFitScore: row.strategic_fit_score,
    reusabilityScore: row.reusability_score,
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function decisionToRow(decision: SelectionDecision) {
  return {
    id: decision.id,
    offer_variant_id: decision.offerVariantId,
    experiment_id: decision.experimentId,
    decision: decision.decision,
    fitness_score: decision.fitnessScore,
    rationale: decision.rationale,
    next_action: decision.nextAction,
    decided_by: decision.decidedBy || null,
    created_at: decision.createdAt,
  };
}

function decisionFromRow(row: DecisionRow) {
  return normalizeSelectionDecision({
    id: row.id,
    offerVariantId: row.offer_variant_id,
    experimentId: row.experiment_id,
    decision: row.decision as SelectionDecision["decision"],
    fitnessScore: row.fitness_score ?? 0,
    rationale: row.rationale ?? "",
    nextAction: row.next_action ?? "",
    decidedBy: row.decided_by ?? "",
    createdAt: row.created_at,
  });
}

function genomeToRow(item: LearningGenomeItem) {
  return {
    id: item.id,
    title: item.title,
    type: item.type,
    content: item.content,
    source_offer_variant_id: item.sourceOfferVariantId,
    source_experiment_id: item.sourceExperimentId,
    tags: item.tags,
    confidence_score: item.confidenceScore,
    status: item.status,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function genomeFromRow(row: GenomeRow) {
  return normalizeLearningGenomeItem({
    id: row.id,
    title: row.title,
    type: row.type as LearningGenomeItem["type"],
    content: row.content ?? "",
    sourceOfferVariantId: row.source_offer_variant_id,
    sourceExperimentId: row.source_experiment_id,
    tags: row.tags ?? [],
    confidenceScore: row.confidence_score,
    status: row.status as LearningGenomeItem["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export async function listAdaptiveGrowthData(): Promise<AdaptiveGrowthData> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to list Adaptive Growth data.");
  }

  const [
    signals,
    offers,
    experiments,
    metrics,
    decisions,
    genomeItems,
  ] = await Promise.all([
    scopeAppData(supabase.from("market_signals").select("*").order("updated_at", { ascending: false })),
    scopeAppData(supabase.from("offer_variants").select("*").order("updated_at", { ascending: false })),
    scopeAppData(supabase.from("growth_experiments").select("*").order("updated_at", { ascending: false })),
    scopeAppData(supabase.from("experiment_metrics").select("*").order("updated_at", { ascending: false })),
    scopeAppData(supabase.from("selection_decisions").select("*").order("created_at", { ascending: false })),
    scopeAppData(supabase.from("learning_genome_items").select("*").order("updated_at", { ascending: false })),
  ]);

  if (
    signals.error ||
    offers.error ||
    experiments.error ||
    metrics.error ||
    decisions.error ||
    genomeItems.error
  ) {
    const message =
      signals.error?.message ||
      offers.error?.message ||
      experiments.error?.message ||
      metrics.error?.message ||
      decisions.error?.message ||
      genomeItems.error?.message ||
      "Failed to list Adaptive Growth data.";
    throw new Error(message);
  }

  return {
    signals: (signals.data as SignalRow[]).map(signalFromRow),
    offers: (offers.data as OfferRow[]).map(offerFromRow),
    experiments: (experiments.data as ExperimentRow[]).map(experimentFromRow),
    metrics: (metrics.data as MetricRow[]).map(metricFromRow),
    decisions: (decisions.data as DecisionRow[]).map(decisionFromRow),
    genomeItems: (genomeItems.data as GenomeRow[]).map(genomeFromRow),
  };
}

export async function saveAdaptiveGrowthRecord(kind: AdaptiveGrowthKind, input: unknown) {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  if (!supabase) {
    throw new Error("Supabase is required to save Adaptive Growth records.");
  }

  if (kind === "signal") {
    const signal = normalizeMarketSignal({ ...(input as Partial<MarketSignal>), updatedAt: now });
    const { data, error } = await supabase.from("market_signals").upsert(withAppScope(signalToRow(signal)), { onConflict: "id" }).select("*").single();
    if (error) throw new Error(error.message);
    return { record: signalFromRow(data as SignalRow), storage: "supabase" as const };
  }

  if (kind === "offer") {
    const offer = normalizeOfferVariant({ ...(input as Partial<OfferVariant>), updatedAt: now });
    const { data, error } = await supabase.from("offer_variants").upsert(withAppScope(offerToRow(offer)), { onConflict: "id" }).select("*").single();
    if (error) throw new Error(error.message);
    if (offer.signalId) {
      const update = await scopeAppData(supabase.from("market_signals").update({ status: "Converted to Offer", updated_at: now }).eq("id", offer.signalId));
      if (update.error) throw new Error(update.error.message);
    }
    return { record: offerFromRow(data as OfferRow), storage: "supabase" as const };
  }

  if (kind === "experiment") {
    const experiment = normalizeGrowthExperiment({ ...(input as Partial<GrowthExperiment>), updatedAt: now });
    const { data, error } = await supabase.from("growth_experiments").upsert(withAppScope(experimentToRow(experiment)), { onConflict: "id" }).select("*").single();
    if (error) throw new Error(error.message);
    return { record: experimentFromRow(data as ExperimentRow), storage: "supabase" as const };
  }

  if (kind === "metric") {
    const metric = normalizeExperimentMetrics({ ...(input as Partial<ExperimentMetrics>), updatedAt: now });
    const { data, error } = await supabase.from("experiment_metrics").upsert(withAppScope(metricToRow(metric)), { onConflict: "id" }).select("*").single();
    if (error) throw new Error(error.message);
    return { record: metricFromRow(data as MetricRow), storage: "supabase" as const };
  }

  if (kind === "decision") {
    const decision = normalizeSelectionDecision(input as Partial<SelectionDecision>);
    const offerStatus =
      decision.decision === "Scale" || decision.decision === "Productize"
        ? "Scaling"
        : decision.decision === "Kill"
          ? "Killed"
          : decision.decision === "Park"
            ? "Parked"
            : "Iterating";
    const { data, error } = await supabase.from("selection_decisions").insert(withAppScope(decisionToRow(decision))).select("*").single();
    if (error) throw new Error(error.message);
    const update = await scopeAppData(supabase.from("offer_variants").update({ status: offerStatus, updated_at: now }).eq("id", decision.offerVariantId));
    if (update.error) throw new Error(update.error.message);
    return { record: decisionFromRow(data as DecisionRow), storage: "supabase" as const };
  }

  const item = normalizeLearningGenomeItem({ ...(input as Partial<LearningGenomeItem>), updatedAt: now });
  const { data, error } = await supabase.from("learning_genome_items").upsert(withAppScope(genomeToRow(item)), { onConflict: "id" }).select("*").single();
  if (error) throw new Error(error.message);
  return { record: genomeFromRow(data as GenomeRow), storage: "supabase" as const };
}

export async function deleteAdaptiveGrowthRecord(kind: AdaptiveGrowthKind, id: string) {
  const supabase = getSupabaseServerClient();
  const tableMap: Record<AdaptiveGrowthKind, string> = {
    signal: "market_signals",
    offer: "offer_variants",
    experiment: "growth_experiments",
    metric: "experiment_metrics",
    decision: "selection_decisions",
    genome: "learning_genome_items",
  };

  if (!supabase) {
    throw new Error("Supabase is required to delete Adaptive Growth records.");
  }

  const { error } = await scopeAppData(supabase.from(tableMap[kind]).delete().eq("id", id));
  if (error) throw new Error(error.message);
  return { deleted: true, storage: "supabase" as const };
}

export async function getGrowthDashboardMetrics() {
  return calculateGrowthDashboardMetrics(await listAdaptiveGrowthData());
}
