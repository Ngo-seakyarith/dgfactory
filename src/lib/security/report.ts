import type { SecurityAudit, SecurityAuditItem } from "@/lib/security/types";

export function calculateSecurityRiskScore(items: SecurityAuditItem[]) {
  const weights = { Low: 5, Medium: 10, High: 20, Critical: 35 } as const;
  return Math.min(
    100,
    items
      .filter((item) => item.status === "Failed" || item.status === "Needs Review")
      .reduce((total, item) => total + weights[item.severity], 0),
  );
}

export function summarizeSecurityStatus(score: number) {
  if (score >= 70) return "Failed";
  if (score >= 30) return "Needs Review";
  return "Passed";
}

export function generateSecurityReport({
  audit,
  items,
}: {
  audit: SecurityAudit;
  items: SecurityAuditItem[];
}) {
  const passed = items.filter((item) => item.status === "Passed");
  const failed = items.filter((item) => item.status === "Failed");
  const critical = failed.filter((item) => item.severity === "Critical");
  const needsReview = items.filter((item) => item.status === "Needs Review");
  const riskScore = audit.riskScore ?? calculateSecurityRiskScore(items);
  const goNoGo =
    critical.length > 0 || riskScore >= 70
      ? "No-go for wider deployment until critical security risks are fixed."
      : failed.length || needsReview.length
        ? "Conditional go for internal pilot only; fix failed and review items before wider deployment."
        : "Go for controlled internal use with continued audit logging and approval gates.";

  return [
    "# DG Academy Factory Security Audit Report",
    "",
    `Audit: ${audit.title}`,
    `Auditor: ${audit.auditor || "Not specified"}`,
    `Status: ${audit.status}`,
    `Risk score: ${riskScore}/100`,
    "",
    "## Executive Summary",
    audit.summary || `${passed.length} checks passed, ${failed.length} failed, ${needsReview.length} need review.`,
    "",
    "## Passed Checks",
    ...(passed.length
      ? passed.map((item) => `- [${item.category}] ${item.title}`)
      : ["- No passed checks recorded."]),
    "",
    "## Failed Checks",
    ...(failed.length
      ? failed.map((item) => `- [${item.severity}] ${item.title}: ${item.evidence}`)
      : ["- No failed checks recorded."]),
    "",
    "## Critical Risks",
    ...(critical.length
      ? critical.map((item) => `- ${item.title}: ${item.recommendation}`)
      : ["- No critical risks recorded."]),
    "",
    "## Recommended Fixes",
    ...items
      .filter((item) => item.recommendation)
      .slice(0, 12)
      .map((item) => `- ${item.recommendation}`),
    "",
    "## Go / No-Go Recommendation",
    goNoGo,
  ].join("\n");
}
