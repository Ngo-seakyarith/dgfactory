import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import { getAuthenticatedRequestUser } from "@/lib/auth-production";
import { listPilotIssues, savePilotIssue } from "@/lib/pilot-storage";
import { requirePermission } from "@/lib/route-guards";

export async function GET(request: Request) {
  const auth = await requirePermission(request, "read");
  if (!auth.ok) return auth.response;

  const issues = await listPilotIssues();
  return NextResponse.json({ issues });
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "read");
  if (!auth.ok) return auth.response;
  const user = await getAuthenticatedRequestUser(request);
  const body = await request.json().catch(() => ({}));

  if (!String(body.title ?? "").trim()) {
    return NextResponse.json({ error: "Issue title is required." }, { status: 400 });
  }

  const result = await savePilotIssue({
    title: body.title,
    description: body.description,
    severity: body.severity,
    status: body.status,
    relatedPage: body.relatedPage,
    relatedPackageId: body.relatedPackageId,
    relatedOpportunityId: body.relatedOpportunityId,
    createdBy: body.createdBy || user.actor,
  });

  await saveAuditLog({
    actor: user.actor,
    action: "pilot_issue_reported",
    entityType: "pilot_issue",
    entityId: result.issue.id,
    metadata: {
      title: result.issue.title,
      severity: result.issue.severity,
      relatedPage: result.issue.relatedPage,
    },
  });

  return NextResponse.json(result);
}
