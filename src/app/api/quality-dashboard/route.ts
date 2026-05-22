import { NextResponse } from "next/server";

import { getQualityDashboardMetrics } from "@/lib/evaluation-storage";
import { requireApproved } from "@/lib/route-guards";

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Quality dashboard request failed.";
}

export async function GET(request: Request) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const metrics = await getQualityDashboardMetrics();
    return NextResponse.json({ metrics });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
