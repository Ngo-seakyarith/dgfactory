import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import { calculateSecurityRiskScore, generateSecurityReport, summarizeSecurityStatus } from "@/lib/security/report";
import { redTeamResultsToAuditItems, runSecurityRedTeamScenarios } from "@/lib/security/redTeamTests";
import { saveSecurityAudit, saveSecurityAuditItems } from "@/lib/security/storage";
import { requirePermission } from "@/lib/route-guards";

export async function POST(request: Request) {
  const auth = await requirePermission(request, "admin");

  if (!auth.ok) {
    return auth.response;
  }

  const results = runSecurityRedTeamScenarios();
  const failed = results.filter((item) => !item.passed);
  const initial = await saveSecurityAudit({
    title: "DG Academy Red-Team Security Audit",
    status: "Not Checked",
    auditor: auth.user.actor,
    summary: "Security red-team audit generated from deterministic internal checks.",
    riskScore: null,
  });
  const items = redTeamResultsToAuditItems({
    auditId: initial.audit.id,
    results,
  });
  await saveSecurityAuditItems(items);
  const riskScore = calculateSecurityRiskScore(items);
  const completed = await saveSecurityAudit({
    ...initial.audit,
    status: summarizeSecurityStatus(riskScore),
    riskScore,
    summary: `${results.length} red-team scenarios run. ${results.length - failed.length} passed, ${failed.length} failed.`,
  });
  const report = generateSecurityReport({
    audit: completed.audit,
    items,
  });

  await saveAuditLog({
    actor: auth.user.actor,
    action: "security_red_team_run",
    entityType: "security_audit",
    entityId: completed.audit.id,
    metadata: {
      riskScore,
      failed: failed.length,
      total: results.length,
    },
  });

  return NextResponse.json({
    audit: completed.audit,
    items,
    results,
    report,
    summary: completed.audit.summary,
  });
}
