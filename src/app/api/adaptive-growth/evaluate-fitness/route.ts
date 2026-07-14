import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import { routeBrainTask } from "@/lib/brain/routing/router";
import type { TextAgentOutput } from "@/lib/brain/agents";
import { listAdaptiveGrowthData } from "@/lib/adaptive-growth-storage";
import {
  calculateOfferFitness,
  type FitnessComponentKey,
} from "@/lib/adaptive-growth/fitness";
import { requireApproved } from "@/lib/route-guards";

type EvaluateFitnessBody = {
  offer_variant_id?: string;
  experiment_id?: string | null;
  manual_overrides?: Partial<Record<FitnessComponentKey, number | null>>;
  manual_fitness_override?: number | null;
};

export async function POST(request: Request) {
  const auth = await requireApproved(request);

  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json().catch(() => ({}))) as EvaluateFitnessBody;

  if (!body.offer_variant_id) {
    return NextResponse.json(
      { error: "offer_variant_id is required." },
      { status: 400 },
    );
  }

  const data = await listAdaptiveGrowthData();
  const offer = data.offers.find((item) => item.id === body.offer_variant_id);

  if (!offer) {
    return NextResponse.json({ error: "Offer variant not found." }, { status: 404 });
  }

  const experiment =
    (body.experiment_id
      ? data.experiments.find((item) => item.id === body.experiment_id)
      : null) ??
    data.experiments
      .filter((item) => item.offerVariantId === offer.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ??
    null;
  const metrics = experiment
    ? data.metrics
        .filter((item) => item.experimentId === experiment.id)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
    : null;
  const signal = offer.signalId
    ? data.signals.find((item) => item.id === offer.signalId) ?? null
    : null;
  const result = calculateOfferFitness({
    offer,
    signal,
    experiment,
    metrics,
    manualOverrides: body.manual_overrides,
    manualFitnessOverride: body.manual_fitness_override,
  });

  let rationale = result.rationale;
  let rationaleMode: "deterministic" | "openai" = "deterministic";

  try {
    const brain = await routeBrainTask<Record<string, unknown>, TextAgentOutput>({
      taskType: "improvement_suggestion",
      input: {
        task: "Write a concise selection rationale for DG Academy. Explain only the deterministic metrics provided. Do not invent metrics, buyers, revenue, margins, or outcomes.",
        offer: {
          title: offer.title,
          sector: offer.sector,
          audience: offer.targetAudience,
          format: offer.format,
          promise: offer.promise,
          status: offer.status,
        },
        experiment: experiment
          ? {
              hypothesis: experiment.hypothesis,
              testMethod: experiment.testMethod,
              status: experiment.status,
            }
          : null,
        componentScores: result.componentScores,
        fitnessScore: result.fitnessScore,
        recommendation: result.recommendation,
        missingDataWarnings: result.missingDataWarnings,
      },
      retries: 1,
    });

    if (brain.output.content) {
      rationale = brain.output.content;
      rationaleMode = "openai";
    }
  } catch {
    rationaleMode = "deterministic";
  }

  await saveAuditLog({
    actor: auth.user.actor,
    action: "adaptive_growth_fitness_evaluated",
    entityType: "adaptive_growth_offer",
    entityId: offer.id,
    metadata: {
      experimentId: experiment?.id ?? null,
      fitnessScore: result.fitnessScore,
      recommendation: result.recommendation,
      rationaleMode,
    },
  });

  return NextResponse.json({
    offer,
    experiment,
    metrics,
    signal,
    componentScores: result.componentScores,
    componentDetails: result.componentDetails,
    fitnessScore: result.fitnessScore,
    recommendation: result.recommendation,
    recommendationBand: result.recommendationBand,
    rationale,
    deterministicRationale: result.rationale,
    rationaleMode,
    missingDataWarnings: result.missingDataWarnings,
    isIncomplete: result.isIncomplete,
    availableWeight: result.availableWeight,
    scoreCompletenessPercent: result.scoreCompletenessPercent,
    manualOverrideUsed: result.manualOverrideUsed,
  });
}
