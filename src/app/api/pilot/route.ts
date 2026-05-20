import { NextResponse } from "next/server";

import { buildPilotReport, calculatePilotMetrics } from "@/lib/pilot";
import { getPilotSnapshot } from "@/lib/pilot-storage";
import { requirePermission } from "@/lib/route-guards";

export async function GET(request: Request) {
  const auth = await requirePermission(request, "read");
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
