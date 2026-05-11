import {
  actionRequiresApproval,
  approvalReasonFor,
  normalizeActionType,
} from "@/lib/safety/approvalRules";

export type RiskLevel = "Low" | "Medium" | "High";

export type RiskClassification = {
  actionType: string;
  normalizedActionType: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  reasons: string[];
};

function payloadText(payload: Record<string, unknown>) {
  return JSON.stringify(payload).toLowerCase();
}

export function classifyRiskyAction({
  actionType,
  payload = {},
}: {
  actionType: string;
  payload?: Record<string, unknown>;
}): RiskClassification {
  const normalizedActionType = normalizeActionType(actionType);
  const text = `${normalizedActionType} ${payloadText(payload)}`;
  const reasons: string[] = [];

  if (actionRequiresApproval(normalizedActionType)) {
    reasons.push(approvalReasonFor(normalizedActionType));
  }

  if (/internal margin|estimated profit|direct cost|internal notes|internal knowledge/.test(text)) {
    reasons.push("Payload references internal margin, notes, costs, profit, or knowledge.");
  }
  if (/send|telegram|whatsapp|email|external/.test(text)) {
    reasons.push("Payload references external communication or external action.");
  }
  if (/scaling|productized|killed|client visible|publish/.test(text)) {
    reasons.push("Payload references a risky business status or client visibility change.");
  }
  if (/delete|deploy|migration|payment/.test(text)) {
    reasons.push("Payload references destructive, infrastructure, or payment action.");
  }

  const uniqueReasons = Array.from(new Set(reasons));
  const requiresApproval = uniqueReasons.length > 0;
  const riskLevel: RiskLevel = /delete|deploy|migration|payment|internal margin|estimated profit|direct cost/.test(text)
    ? "High"
    : requiresApproval
      ? "Medium"
      : "Low";

  return {
    actionType,
    normalizedActionType,
    riskLevel,
    requiresApproval,
    reasons: uniqueReasons,
  };
}
