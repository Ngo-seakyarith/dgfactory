import { NextResponse } from "next/server";

import { createSecurityChecklistItems, securityChecklistSections } from "@/lib/security/checklist";
import { generateSecurityReport } from "@/lib/security/report";
import {
  listSecurityAuditItems,
  listSecurityAudits,
  saveSecurityAudit,
  saveSecurityAuditItems,
} from "@/lib/security/storage";
import { requireApproved } from "@/lib/route-guards";

export async function GET(request: Request) {
  const auth = await requireApproved(request);

  if (!auth.ok) {
    return auth.response;
  }

  let audits = await listSecurityAudits();

  if (!audits.length) {
    const saved = await saveSecurityAudit({
      title: "DG Academy Security Baseline Checklist",
      status: "Not Checked",
      auditor: auth.user.actor,
      summary: "Baseline security checklist created for internal review.",
      riskScore: null,
    });
    await saveSecurityAuditItems(createSecurityChecklistItems(saved.audit.id));
    audits = [saved.audit];
  }

  const selectedAudit = audits[0];
  const items = await listSecurityAuditItems(selectedAudit.id);
  const report = generateSecurityReport({ audit: selectedAudit, items });

  return NextResponse.json({
    audits,
    audit: selectedAudit,
    items,
    report,
    checklistSections: securityChecklistSections,
  });
}
