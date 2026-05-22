import { NextResponse } from "next/server";

import { buildPilotReport, calculatePilotMetrics } from "@/lib/pilot";
import { getPilotSnapshot } from "@/lib/pilot-storage";
import { requireApproved } from "@/lib/route-guards";

export async function GET(request: Request) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  const snapshot = await getPilotSnapshot();
  const metrics = await calculatePilotMetrics(snapshot);
  const report = buildPilotReport({ metrics });

  return NextResponse.json({
    ...snapshot,
    metrics,
    report,
  });
}
