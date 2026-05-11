import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import { getOpportunity, listOpportunities, saveOpportunity } from "@/lib/crm-storage";
import type { Opportunity } from "@/lib/crm";
import { requirePermission } from "@/lib/route-guards";

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Opportunity request failed.";
}

export async function GET() {
  try {
    const opportunities = await listOpportunities();
    return NextResponse.json({ opportunities });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = requirePermission(request, "manage_opportunities");

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as Partial<Opportunity>;

    if (!body.title?.trim() || !body.clientId?.trim()) {
      return NextResponse.json(
        { error: "Opportunity title and client are required." },
        { status: 400 },
      );
    }

    const existing = body.id ? await getOpportunity(body.id) : null;
    const result = await saveOpportunity(body);
    await saveAuditLog({
      actor: auth.user.actor,
      action:
        existing && existing.status !== result.opportunity.status
          ? "opportunity_status_change"
          : "opportunity_saved",
      entityType: "opportunity",
      entityId: result.opportunity.id,
      metadata: {
        title: result.opportunity.title,
        previousStatus: existing?.status ?? null,
        status: result.opportunity.status,
        estimatedValue: result.opportunity.estimatedValue,
        storage: result.storage,
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
