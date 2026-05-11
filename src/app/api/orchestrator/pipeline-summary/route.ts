import { NextResponse } from "next/server";

import { validateOrchestratorRequest } from "@/lib/orchestrator/auth";
import { redactForLog } from "@/lib/orchestrator/commands";
import { saveOrchestratorLog } from "@/lib/orchestrator/storage";
import { buildPipelineSummary } from "@/lib/orchestrator/summaries";

export async function GET(request: Request) {
  const auth = validateOrchestratorRequest(request);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const summary = await buildPipelineSummary();
    await saveOrchestratorLog({
      command: "GET_PIPELINE_SUMMARY",
      payload: redactForLog({}),
      resultSummary: `Pipeline summary returned ${summary.totalOpportunities} opportunities.`,
      status: "Completed",
    });

    return NextResponse.json({ summary });
  } catch (error) {
    await saveOrchestratorLog({
      command: "GET_PIPELINE_SUMMARY",
      payload: {},
      resultSummary:
        error instanceof Error ? error.message : "Pipeline summary failed.",
      status: "Failed",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pipeline summary failed." },
      { status: 500 },
    );
  }
}
