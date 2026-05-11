import { NextResponse } from "next/server";

import { validateOrchestratorRequest } from "@/lib/orchestrator/auth";
import {
  isApprovalRiskLevel,
  normalizePayload,
  redactForLog,
} from "@/lib/orchestrator/commands";
import {
  saveApprovalRequest,
  saveOrchestratorLog,
} from "@/lib/orchestrator/storage";
import { validateOrchestratorCommandSafety } from "@/lib/security/orchestratorSafety";

export async function POST(request: Request) {
  const auth = validateOrchestratorRequest(request);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const safety = validateOrchestratorCommandSafety({
    command: String(body.actionType ?? "REQUEST_APPROVAL").trim(),
    payload: normalizePayload(body.payload),
    authenticated: true,
    riskLevel: body.riskLevel,
  });

  if (!safety.allowed && !safety.requiresApproval) {
    await saveOrchestratorLog({
      command: "REQUEST_APPROVAL",
      payload: redactForLog(body),
      resultSummary: `Rejected unsafe approval request: ${safety.issues.join("; ")}`,
      status: "Rejected",
    });

    return NextResponse.json(
      { error: "Unsafe orchestrator request.", issues: safety.issues },
      { status: 400 },
    );
  }

  const approval = await saveApprovalRequest({
    requestedBy: String(body.requestedBy ?? "OpenClaw").trim(),
    actionType: String(body.actionType ?? "REQUEST_APPROVAL").trim(),
    payload: normalizePayload(body.payload),
    riskLevel: isApprovalRiskLevel(body.riskLevel) ? body.riskLevel : safety.riskLevel,
    status: "Pending",
    humanNote: "",
  });

  await saveOrchestratorLog({
    command: "REQUEST_APPROVAL",
    payload: redactForLog(body),
    resultSummary: `Approval request ${approval.approval.id} created for ${approval.approval.actionType}.`,
    status: "Accepted",
  });

  return NextResponse.json({
    approvalRequest: approval.approval,
    safety: "Action is pending human approval and has not been executed.",
  });
}
