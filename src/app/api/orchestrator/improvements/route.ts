import { NextResponse } from "next/server";

import { validateOrchestratorRequest } from "@/lib/orchestrator/auth";
import { saveOrchestratorLog } from "@/lib/orchestrator/storage";
import { listImprovementOpportunities } from "@/lib/improvement-storage";
import { buildCodexPrompt } from "@/lib/improvements";

export async function GET(request: Request) {
  const auth = validateOrchestratorRequest(request);

  if (!auth.ok) {
    return auth.response;
  }

  const opportunities = await listImprovementOpportunities();
  const suggested = opportunities.filter((item) => item.status === "Suggested");
  const approved = opportunities.filter((item) => item.status === "Approved");
  const top5 = [...approved, ...suggested]
    .sort((a, b) => a.priority - b.priority || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  await saveOrchestratorLog({
    command: "GET_IMPROVEMENT_SUMMARY",
    payload: {},
    resultSummary: `Returned ${top5.length} top improvement tasks.`,
    status: "Completed",
  });

  return NextResponse.json({
    top5,
    suggestedCount: suggested.length,
    approvedCount: approved.length,
    summary: top5.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      category: item.category,
      priority: item.priority,
      codexPrompt: buildCodexPrompt(item),
    })),
    safety:
      "OpenClaw may summarize approved items, but cannot approve, merge, deploy, or execute code changes.",
  });
}

export async function POST(request: Request) {
  const auth = validateOrchestratorRequest(request);

  if (!auth.ok) {
    return auth.response;
  }

  await saveOrchestratorLog({
    command: "IMPROVEMENT_WRITE_REQUEST_REJECTED",
    payload: {},
    resultSummary: "Task-file conversion is disabled because task files were removed.",
    status: "Rejected",
  });

  return NextResponse.json(
    { error: "Task-file conversion is disabled in this app." },
    { status: 410 },
  );
}
