import { NextResponse } from "next/server";

import {
  buildAdaptiveGrowthExecutiveReport,
  type AdaptiveDashboardRange,
} from "@/lib/adaptive-growth-dashboard";
import { exportAdaptiveGrowthReport } from "@/lib/adaptive-growth-report-export";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const report = await buildAdaptiveGrowthExecutiveReport({
    range: (url.searchParams.get("range") || undefined) as
      | AdaptiveDashboardRange
      | undefined,
    startDate: url.searchParams.get("startDate") || undefined,
    endDate: url.searchParams.get("endDate") || undefined,
  });
  const format = url.searchParams.get("format") === "txt" ? "txt" : "pdf";
  const exported = exportAdaptiveGrowthReport(report, format);

  return new NextResponse(exported.buffer, {
    headers: {
      "Content-Type": exported.contentType,
      "Content-Disposition": `attachment; filename="${exported.filename}"`,
    },
  });
}
