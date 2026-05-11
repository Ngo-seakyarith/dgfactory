export const orchestratorCommands = [
  "CREATE_PACKAGE",
  "GENERATE_FOLLOW_UP",
  "GET_PIPELINE_SUMMARY",
  "GET_DELIVERY_SUMMARY",
  "GET_QUALITY_SUMMARY",
  "REQUEST_EXPORT",
  "REQUEST_APPROVAL",
  "GET_IMPROVEMENT_SUMMARY",
  "CONVERT_IMPROVEMENT_TO_PRD",
] as const;

export type OrchestratorCommand = (typeof orchestratorCommands)[number];

export const approvalStatuses = [
  "Pending",
  "Approved",
  "Rejected",
  "Expired",
] as const;

export type ApprovalStatus = (typeof approvalStatuses)[number];

export const approvalRiskLevels = ["Low", "Medium", "High"] as const;

export type ApprovalRiskLevel = (typeof approvalRiskLevels)[number];

export type ApprovalRequest = {
  id: string;
  requestedBy: string;
  actionType: OrchestratorCommand | string;
  payload: Record<string, unknown>;
  status: ApprovalStatus;
  riskLevel: ApprovalRiskLevel;
  humanNote: string;
  createdAt: string;
  updatedAt: string;
};

export type OrchestratorLog = {
  id: string;
  command: OrchestratorCommand | string;
  payload: Record<string, unknown>;
  resultSummary: string;
  status: "Accepted" | "Rejected" | "Failed" | "Completed";
  createdAt: string;
};

export function isOrchestratorCommand(
  value: unknown,
): value is OrchestratorCommand {
  return (
    typeof value === "string" &&
    orchestratorCommands.includes(value as OrchestratorCommand)
  );
}

export function isApprovalStatus(value: unknown): value is ApprovalStatus {
  return (
    typeof value === "string" &&
    approvalStatuses.includes(value as ApprovalStatus)
  );
}

export function isApprovalRiskLevel(value: unknown): value is ApprovalRiskLevel {
  return (
    typeof value === "string" &&
    approvalRiskLevels.includes(value as ApprovalRiskLevel)
  );
}

export function normalizePayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function normalizeApprovalRequest(
  value: Partial<ApprovalRequest>,
): ApprovalRequest {
  const now = new Date().toISOString();

  return {
    id: value.id || crypto.randomUUID(),
    requestedBy: String(value.requestedBy ?? "OpenClaw").trim(),
    actionType: String(value.actionType ?? "REQUEST_APPROVAL").trim(),
    payload: normalizePayload(value.payload),
    status: isApprovalStatus(value.status) ? value.status : "Pending",
    riskLevel: isApprovalRiskLevel(value.riskLevel) ? value.riskLevel : "Medium",
    humanNote: String(value.humanNote ?? "").trim(),
    createdAt: value.createdAt || now,
    updatedAt: value.updatedAt || now,
  };
}

export function normalizeOrchestratorLog(
  value: Partial<OrchestratorLog>,
): OrchestratorLog {
  return {
    id: value.id || crypto.randomUUID(),
    command: String(value.command ?? "UNKNOWN").trim(),
    payload: normalizePayload(value.payload),
    resultSummary: String(value.resultSummary ?? "").trim(),
    status:
      value.status === "Accepted" ||
      value.status === "Rejected" ||
      value.status === "Failed" ||
      value.status === "Completed"
        ? value.status
        : "Completed",
    createdAt: value.createdAt || new Date().toISOString(),
  };
}

export function requiresHumanApproval(command: OrchestratorCommand | string) {
  return [
    "REQUEST_EXPORT",
    "REQUEST_APPROVAL",
    "SEND_EXTERNAL_MESSAGE",
    "DELETE_RECORD",
    "DEPLOY",
    "PAYMENT",
    "CLIENT_DATA_EXPORT",
  ].includes(command);
}

export function redactForLog(payload: Record<string, unknown>) {
  const redacted = { ...payload };

  for (const key of Object.keys(redacted)) {
    if (/api[_-]?key|secret|token|password/i.test(key)) {
      redacted[key] = "[redacted]";
    }
  }

  return redacted;
}
