import { NextResponse } from "next/server";

import { listImprovementOpportunities } from "@/lib/improvement-storage";
import { readRalphPrd, readRalphProgress, summarizeRalphPrd } from "@/lib/ralph";

export async function GET() {
  const [prdResult, progress, opportunities] = await Promise.all([
    readRalphPrd(),
    readRalphProgress(),
    listImprovementOpportunities(),
  ]);
  const summary = summarizeRalphPrd(prdResult.prd);

  return NextResponse.json({
    prd: prdResult.prd,
    prdAccessible: prdResult.accessible,
    prdPath: prdResult.path,
    progressAccessible: progress.accessible,
    progressPath: progress.path,
    latestProgressNotes: progress.latestNotes,
    pendingStories: summary.pendingStories,
    completedStories: summary.completedStories,
    suggestedNextStory: summary.suggestedNextStory,
    suggestedImprovements: opportunities
      .filter((item) => item.status === "Suggested" || item.status === "Approved")
      .slice(0, 8),
  });
}
