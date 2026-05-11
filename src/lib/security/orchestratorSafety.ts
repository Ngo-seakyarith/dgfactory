import {
  isApprovalRiskLevel,
  isOrchestratorCommand,
  requiresHumanApproval,
  type ApprovalRiskLevel,
  type OrchestratorCommand,
} from "@/lib/orchestrator/commands";

export type OrchestratorSafetyResult = {
  allowed: boolean;
  requiresApproval: boolean;
  riskLevel: ApprovalRiskLevel;
  issues: string[];
};

const externalActionTerms = [
  "send",
  "telegram",
  "whatsapp",
  "email customer",
  "delete",
  "deploy",
  "payment",
  "export client data",
  "production migration",
];

export function validateOrchestratorCommandSafety({
  command,
  payload,
  authenticated,
  riskLevel,
}: {
  command: string;
  payload: Record<string, unknown>;
  authenticated: boolean;
  riskLevel?: unknown;
}): OrchestratorSafetyResult {
  const issues: string[] = [];

  if (!authenticated) {
    issues.push("Orchestrator request is not authenticated.");
  }

  if (!isOrchestratorCommand(command)) {
    issues.push(`Unsupported orchestrator command: ${command}.`);
  }

  const payloadText = JSON.stringify(payload).toLowerCase();
  const externalTermsFound = externalActionTerms.filter((term) =>
    payloadText.includes(term),
  );
  const commandRequiresApproval = requiresHumanApproval(command);
  const requiresApproval = commandRequiresApproval || externalTermsFound.length > 0;
  const resolvedRiskLevel: ApprovalRiskLevel = isApprovalRiskLevel(riskLevel)
    ? riskLevel
    : requiresApproval
      ? "High"
      : "Medium";

  if (externalTermsFound.length > 0 && command !== "REQUEST_APPROVAL") {
    issues.push(
      `Payload appears to request external or destructive action: ${externalTermsFound.join(", ")}.`,
    );
  }

  return {
    allowed: authenticated && isOrchestratorCommand(command) && issues.length === 0,
    requiresApproval,
    riskLevel: resolvedRiskLevel,
    issues,
  };
}

export function assertSafeOrchestratorCommand(
  command: OrchestratorCommand | string,
  payload: Record<string, unknown>,
) {
  return validateOrchestratorCommandSafety({
    command,
    payload,
    authenticated: true,
  });
}
