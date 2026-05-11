import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import { getRequestUser } from "@/lib/auth";
import { listPilotIssues, savePilotIssue } from "@/lib/pilot-storage";

export async function GET() {
  const issues = await listPilotIssues();
  return NextResponse.json({ issues });
}

export async function POST(request: Request) {
  const user = getRequestUser(request);
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
