import { NextResponse } from "next/server";

import { validateOrchestratorRequest } from "@/lib/orchestrator/auth";
import { saveOrchestratorLog } from "@/lib/orchestrator/storage";

export async function GET(request: Request) {
  const auth = validateOrchestratorRequest(request);

  if (!auth.ok) {
    return auth.response;
  }

  await saveOrchestratorLog({
    command: "HEALTH",
    payload: {},
    resultSummary: "Orchestrator health check succeeded.",
    status: "Completed",
  });

  return NextResponse.json({
    ok: true,
    app: "DG Academy AI Training Production Factory",
    version: "2.3",
    safety:
      "External sending, deletion, deployment, payment, and client data export require human approval.",
  });
}
