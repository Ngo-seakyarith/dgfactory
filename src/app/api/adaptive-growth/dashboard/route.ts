import { NextResponse } from "next/server";

import {
  adaptiveGrowthReportToMarkdown,
  buildAdaptiveGrowthExecutiveReport,
  type AdaptiveDashboardRange,
} from "@/lib/adaptive-growth-dashboard";

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

export async function GET(request: Request) {
  const report = await buildAdaptiveGrowthExecutiveReport(rangeFromUrl(request));

  return NextResponse.json({
    report,
    markdown: adaptiveGrowthReportToMarkdown(report),
  });
}
