import { NextResponse } from "next/server";

import {
  getAutonomySettings,
  isAutonomyLevel,
  saveAutonomySettings,
} from "@/lib/safety/autonomy";
import { requirePermission } from "@/lib/route-guards";
import { saveAuditLog } from "@/lib/audit";

export async function GET() {
  return NextResponse.json({ settings: getAutonomySettings() });
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "admin");

  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json().catch(() => ({}))) as {
    autonomyLevel?: unknown;
  };

  if (!isAutonomyLevel(body.autonomyLevel)) {
    return NextResponse.json({ error: "Invalid autonomy level." }, { status: 400 });
  }

  const settings = saveAutonomySettings(body.autonomyLevel);

  await saveAuditLog({
    actor: auth.user.actor,
    action: "autonomy_level_updated",
    entityType: "settings",
    entityId: "autonomy",
    metadata: settings,
  });

  return NextResponse.json({ settings });
}
