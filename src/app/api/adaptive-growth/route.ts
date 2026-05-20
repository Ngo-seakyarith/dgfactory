import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import {
  deleteAdaptiveGrowthRecord,
  listAdaptiveGrowthData,
  saveAdaptiveGrowthRecord,
} from "@/lib/adaptive-growth-storage";
import type { AdaptiveGrowthKind } from "@/lib/adaptive-growth";
import { requirePermission } from "@/lib/route-guards";

const kinds: AdaptiveGrowthKind[] = [
  "signal",
  "offer",
  "experiment",
  "metric",
  "decision",
  "genome",
];

function isKind(value: unknown): value is AdaptiveGrowthKind {
  return typeof value === "string" && kinds.includes(value as AdaptiveGrowthKind);
}

export async function GET(request: Request) {
  const auth = await requirePermission(request, "read");
  if (!auth.ok) return auth.response;

  const data = await listAdaptiveGrowthData();
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "manage_proposals");

  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json().catch(() => ({}))) as {
    kind?: AdaptiveGrowthKind;
    record?: unknown;
  };

  if (!isKind(body.kind)) {
    return NextResponse.json({ error: "Invalid adaptive growth record kind." }, { status: 400 });
  }

  const result = await saveAdaptiveGrowthRecord(body.kind, body.record ?? {});

  await saveAuditLog({
    actor: auth.user.actor,
    action: `adaptive_growth_${body.kind}_saved`,
    entityType: `adaptive_growth_${body.kind}`,
    entityId:
      result.record && typeof result.record === "object" && "id" in result.record
        ? String(result.record.id)
        : "",
    metadata: { storage: result.storage },
  });

  return NextResponse.json(result);
}

export async function DELETE(request: Request) {
  const auth = await requirePermission(request, "manage_proposals");

  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json().catch(() => ({}))) as {
    kind?: AdaptiveGrowthKind;
    id?: string;
  };

  if (!isKind(body.kind) || !body.id) {
    return NextResponse.json({ error: "Kind and id are required." }, { status: 400 });
  }

  const result = await deleteAdaptiveGrowthRecord(body.kind, body.id);

  await saveAuditLog({
    actor: auth.user.actor,
    action: `adaptive_growth_${body.kind}_deleted`,
    entityType: `adaptive_growth_${body.kind}`,
    entityId: body.id,
    metadata: { storage: result.storage },
  });

  return NextResponse.json(result);
}
