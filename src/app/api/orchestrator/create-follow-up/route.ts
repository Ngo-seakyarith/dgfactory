import { NextResponse } from "next/server";

import { routeBrainTask } from "@/lib/brain/router";
import type { FollowUpDraft } from "@/lib/crm";
import { isOpportunityStatus } from "@/lib/crm";
import { validateOrchestratorRequest } from "@/lib/orchestrator/auth";
import { redactForLog } from "@/lib/orchestrator/commands";
import { saveOrchestratorLog } from "@/lib/orchestrator/storage";

export async function POST(request: Request) {
  const auth = validateOrchestratorRequest(request);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const input = {
    clientName: String(body.clientName ?? "").trim(),
    status: isOpportunityStatus(body.status) ? body.status : "Lead",
    trainingNeed: String(body.trainingNeed ?? "").trim(),
    lastNotes: String(body.lastNotes ?? "").trim(),
    nextFollowUpDate: String(body.nextFollowUpDate ?? "").trim(),
  };
  const result = await routeBrainTask<typeof input, FollowUpDraft>({
    taskType: "follow_up",
    input,
  });

  await saveOrchestratorLog({
    command: "GENERATE_FOLLOW_UP",
    payload: redactForLog(body),
    resultSummary: `Generated follow-up draft for ${input.clientName || "client"}. Nothing was sent.`,
    status: "Completed",
  });

  return NextResponse.json({
    draft: result.output,
    mode: result.mode,
    model: result.model,
    safety: "Draft only. No email, Telegram, WhatsApp, or external message was sent.",
  });
}
