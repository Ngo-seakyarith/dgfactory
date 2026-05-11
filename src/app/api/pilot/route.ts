import { NextResponse } from "next/server";

import { buildPilotReport, calculatePilotMetrics } from "@/lib/pilot";
import { getPilotSnapshot } from "@/lib/pilot-storage";

export async function GET() {
  const snapshot = await getPilotSnapshot();
  const metrics = await calculatePilotMetrics(snapshot);
  const report = buildPilotReport({ metrics });

  return NextResponse.json({
    ...snapshot,
    metrics,
    report,
  });
}
