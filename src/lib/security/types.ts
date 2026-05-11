export const securityAuditStatuses = [
  "Not Checked",
  "Passed",
  "Failed",
  "Needs Review",
  "Waived",
] as const;

export type SecurityAuditStatus = (typeof securityAuditStatuses)[number];

export const securitySeverityLevels = ["Low", "Medium", "High", "Critical"] as const;
export type SecuritySeverity = (typeof securitySeverityLevels)[number];

export type SecurityAudit = {
  id: string;
  title: string;
  status: SecurityAuditStatus;
  auditor: string;
  summary: string;
  riskScore: number | null;
  createdAt: string;
  updatedAt: string;
};

export type SecurityAuditItem = {
  id: string;
  auditId: string;
  category: string;
  title: string;
  description: string;
  status: SecurityAuditStatus;
  severity: SecuritySeverity;
  evidence: string;
  recommendation: string;
  createdAt: string;
  updatedAt: string;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function numberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isSecurityAuditStatus(value: unknown): value is SecurityAuditStatus {
  return (
    typeof value === "string" &&
    securityAuditStatuses.includes(value as SecurityAuditStatus)
  );
}

export function isSecuritySeverity(value: unknown): value is SecuritySeverity {
  return (
    typeof value === "string" &&
    securitySeverityLevels.includes(value as SecuritySeverity)
  );
}

export function normalizeSecurityAudit(
  value: Partial<SecurityAudit>,
): SecurityAudit {
  const now = new Date().toISOString();

  return {
    id: value.id || crypto.randomUUID(),
    title: text(value.title || "DG Academy Security Audit"),
    status: isSecurityAuditStatus(value.status) ? value.status : "Not Checked",
    auditor: text(value.auditor),
    summary: text(value.summary),
    riskScore: numberOrNull(value.riskScore),
    createdAt: value.createdAt || now,
    updatedAt: value.updatedAt || now,
  };
}

export function normalizeSecurityAuditItem(
  value: Partial<SecurityAuditItem>,
): SecurityAuditItem {
  const now = new Date().toISOString();

  return {
    id: value.id || crypto.randomUUID(),
    auditId: text(value.auditId),
    category: text(value.category),
    title: text(value.title),
    description: text(value.description),
    status: isSecurityAuditStatus(value.status) ? value.status : "Not Checked",
    severity: isSecuritySeverity(value.severity) ? value.severity : "Medium",
    evidence: text(value.evidence),
    recommendation: text(value.recommendation),
    createdAt: value.createdAt || now,
    updatedAt: value.updatedAt || now,
  };
}
