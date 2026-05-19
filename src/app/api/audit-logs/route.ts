import { NextResponse } from "next/server";

import { listAuditLogs } from "@/lib/audit";
import { requirePermission } from "@/lib/route-guards";

export async function GET(request: Request) {
  const auth = await requirePermission(request, "admin");

  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const logs = await listAuditLogs(Math.min(200, Math.max(1, limit)));

  return NextResponse.json({ logs });
}
