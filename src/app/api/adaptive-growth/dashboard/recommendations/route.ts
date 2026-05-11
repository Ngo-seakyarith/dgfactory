import { NextResponse } from "next/server";

import {
  adaptiveGrowthReportToMarkdown,
  buildAdaptiveGrowthExecutiveReport,
  type AdaptiveDashboardRange,
} from "@/lib/adaptive-growth-dashboard";
import { routeBrainTask } from "@/lib/brain/router";
import type {
  AdaptiveGrowthRecommendationsInput,
  AdaptiveGrowthRecommendationsOutput,
} from "@/lib/brain/agents";

function rangeFromUrl(request: Request) {
  const url = new URL(request.url);
  return {
    range: (url.searchParams.get("range") || undefined) as
      | AdaptiveDashboardRange
      | undefined,
    startDate: url.searchParams.get("startDate") || undefined,
    endDate: url.searchParams.get("endDate") || undefined,
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    range?: AdaptiveDashboardRange;
    startDate?: string;
    endDate?: string;
  };
  const filters = body.range ? body : rangeFromUrl(request);
  const report = await buildAdaptiveGrowthExecutiveReport(filters);
  const topOffers = report.offerFitness.topOffers.map(
    (item) => `${item.offer.title} (${item.fitness.fitnessScore}/100, ${item.fitness.recommendation})`,
  );
  const bottomOffers = report.offerFitness.bottomOffers.map(
    (item) => `${item.offer.title} (${item.fitness.fitnessScore}/100, ${item.fitness.recommendation})`,
  );
  const input: AdaptiveGrowthRecommendationsInput = {
    reportSummary: adaptiveGrowthReportToMarkdown(report),
    availableData: {
      adaptationScore: report.adaptationScore.score,
      interpretation: report.adaptationScore.interpretation,
      velocity: report.velocity,
      experimentFunnel: report.experimentFunnel,
      topOffers,
      bottomOffers,
      scaleCandidates: report.offerFitness.scaleCandidates.map((item) => item.offer.title),
      killCandidates: report.offerFitness.killCandidates.map((item) => item.offer.title),
      missingDataOffers: report.offerFitness.offersWithMissingData.map(
        (item) => item.offer.title,
      ),
      strongestSectors: report.expansionMap.strongestSectors,
      strongestAudiences: report.expansionMap.strongestAudiences,
      bestFormats: report.expansionMap.bestFormats,
      recommendedNextNiches: report.expansionMap.recommendedNextNiches,
      pendingApprovals: report.openClawLoopStatus.pendingApprovals,
      approvedImprovementTasks:
        report.ralphImprovementStatus.approvedImprovementTasks.length,
    },
  };
  const result = await routeBrainTask<
    AdaptiveGrowthRecommendationsInput,
    AdaptiveGrowthRecommendationsOutput
  >({
    taskType: "adaptive_growth_recommendations",
    input,
    retries: 1,
  });

  return NextResponse.json({
    recommendations: result.output,
    mode: result.mode,
    model: result.model,
    notice: result.notice,
  });
}
