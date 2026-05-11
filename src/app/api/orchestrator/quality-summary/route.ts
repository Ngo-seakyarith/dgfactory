import { NextResponse } from "next/server";

import { validateOrchestratorRequest } from "@/lib/orchestrator/auth";
import { saveOrchestratorLog } from "@/lib/orchestrator/storage";
import { buildQualitySummary } from "@/lib/orchestrator/summaries";

export async function GET(request: Request) {
  const auth = validateOrchestratorRequest(request);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const summary = await buildQualitySummary();
    await saveOrchestratorLog({
      command: "GET_QUALITY_SUMMARY",
      payload: {},
      resultSummary: `Quality summary returned ${summary.evaluationCount} evaluations.`,
      status: "Completed",
    });

    return NextResponse.json({ summary });
  } catch (error) {
    await saveOrchestratorLog({
      command: "GET_QUALITY_SUMMARY",
      payload: {},
      resultSummary:
        error instanceof Error ? error.message : "Quality summary failed.",
      status: "Failed",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Quality summary failed." },
      { status: 500 },
    );
  }
}
