import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import {
  getImprovementOpportunity,
  saveImprovementOpportunity,
  updateImprovementStatus,
} from "@/lib/improvement-storage";
import { buildCodexPrompt, improvementStatuses } from "@/lib/improvements";
import type {
  ImprovementOpportunity,
  ImprovementStatus,
} from "@/lib/improvements";
import { requirePermission } from "@/lib/route-guards";

function isImprovementStatus(value: unknown): value is ImprovementStatus {
  return typeof value === "string" && improvementStatuses.includes(value as ImprovementStatus);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const opportunity = await getImprovementOpportunity(id);

  if (!opportunity) {
    return NextResponse.json({ error: "Improvement not found." }, { status: 404 });
  }

  return NextResponse.json({ opportunity });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requirePermission(request, "manage_proposals");

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Partial<ImprovementOpportunity> & {
    status?: ImprovementStatus;
  };

  const current = await getImprovementOpportunity(id);

  if (!current) {
    return NextResponse.json({ error: "Improvement not found." }, { status: 404 });
  }

  const result =
    body.status && Object.keys(body).length === 1 && isImprovementStatus(body.status)
      ? await updateImprovementStatus({ id, status: body.status })
      : await saveImprovementOpportunity({
          ...current,
          ...body,
          id,
          codexPrompt: body.codexPrompt ?? current.codexPrompt,
        });

  await saveAuditLog({
    actor: auth.user.actor,
    action: "improvement_opportunity_updated",
    entityType: "improvement_opportunity",
    entityId: id,
    metadata: {
      status: result.opportunity.status,
      category: result.opportunity.category,
    },
  });

  return NextResponse.json({
    ...result,
    codexPrompt: buildCodexPrompt(result.opportunity),
  });
}
