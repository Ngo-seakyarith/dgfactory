import { NextResponse } from "next/server";

import { validateOrchestratorRequest } from "@/lib/orchestrator/auth";
import { saveOrchestratorLog } from "@/lib/orchestrator/storage";
import {
  listImprovementOpportunities,
  getImprovementOpportunity,
} from "@/lib/improvement-storage";
import { buildCodexPrompt } from "@/lib/improvements";
import { appendImprovementToPrd } from "@/lib/ralph";

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
      "OpenClaw may summarize or request PRD conversion for approved items, but cannot approve, merge, deploy, or execute code changes.",
  });
}

export async function POST(request: Request) {
  const auth = validateOrchestratorRequest(request);

  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    id?: string;
  };

  if (body.action !== "convert_to_prd" || !body.id) {
    return NextResponse.json(
      {
        error:
          "Unsupported action. OpenClaw may request convert_to_prd for an already Approved improvement only.",
      },
      { status: 400 },
    );
  }

  const opportunity = await getImprovementOpportunity(body.id);

  if (!opportunity) {
    return NextResponse.json({ error: "Improvement not found." }, { status: 404 });
  }

  if (opportunity.status !== "Approved") {
    return NextResponse.json(
      {
        error:
          "Human approval required before OpenClaw can request PRD conversion.",
      },
      { status: 403 },
    );
  }

  const result = await appendImprovementToPrd(opportunity);

  await saveOrchestratorLog({
    command: "CONVERT_IMPROVEMENT_TO_PRD",
    payload: { id: body.id, storyId: result.story.id, written: result.written },
    resultSummary: result.message,
    status: "Completed",
  });

  return NextResponse.json({
    ...result,
    safety:
      "PRD story created or returned as content only. No code change, merge, or deployment was executed.",
  });
}
