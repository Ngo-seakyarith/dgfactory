import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import {
  listImprovementOpportunities,
  saveImprovementOpportunity,
} from "@/lib/improvement-storage";
import type {
  ImprovementCategory,
  ImprovementOpportunity,
  ImprovementSourceType,
  ImprovementStatus,
} from "@/lib/improvements";
import {
  improvementCategories,
  improvementSourceTypes,
  improvementStatuses,
} from "@/lib/improvements";
import { requirePermission } from "@/lib/route-guards";

function isOneOf<T extends readonly string[]>(options: T, value: unknown): value is T[number] {
  return typeof value === "string" && options.includes(value);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sourceType = url.searchParams.get("sourceType");
  const category = url.searchParams.get("category");
  const status = url.searchParams.get("status");

  const opportunities = await listImprovementOpportunities({
    sourceType: isOneOf(improvementSourceTypes, sourceType)
      ? (sourceType as ImprovementSourceType)
      : undefined,
    category: isOneOf(improvementCategories, category)
      ? (category as ImprovementCategory)
      : undefined,
    status: isOneOf(improvementStatuses, status)
      ? (status as ImprovementStatus)
      : undefined,
  });

  return NextResponse.json({ opportunities });
}

export async function POST(request: Request) {
  const auth = requirePermission(request, "manage_proposals");

  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json().catch(() => ({}))) as Partial<ImprovementOpportunity>;

  if (!body.title?.trim()) {
    return NextResponse.json(
      { error: "Improvement title is required." },
      { status: 400 },
    );
  }

  const result = await saveImprovementOpportunity(body);

  await saveAuditLog({
    actor: auth.user.actor,
    action: "improvement_opportunity_saved",
    entityType: "improvement_opportunity",
    entityId: result.opportunity.id,
    metadata: {
      status: result.opportunity.status,
      category: result.opportunity.category,
      storage: result.storage,
    },
  });

  return NextResponse.json(result);
}
