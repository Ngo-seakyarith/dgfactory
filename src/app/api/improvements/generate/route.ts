import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import type { ImprovementOpportunityOutput } from "@/lib/brain/agents";
import { routeBrainTask } from "@/lib/brain/router";
import { saveImprovementOpportunity } from "@/lib/improvement-storage";
import type {
  ImprovementCategory,
  ImprovementSourceType,
} from "@/lib/improvements";
import {
  improvementCategories,
  improvementSourceTypes,
} from "@/lib/improvements";
import { requirePermission } from "@/lib/route-guards";

type GenerateImprovementBody = {
  sourceType?: string;
  sourceId?: string | null;
  sourceSummary?: string;
  context?: string;
  currentAppState?: string;
};

function safeSource(value: unknown): ImprovementSourceType {
  return typeof value === "string" &&
    improvementSourceTypes.includes(value as ImprovementSourceType)
    ? (value as ImprovementSourceType)
    : "Other";
}

function safeCategory(value: unknown): ImprovementCategory {
  return typeof value === "string" &&
    improvementCategories.includes(value as ImprovementCategory)
    ? (value as ImprovementCategory)
    : "Other";
}

export async function POST(request: Request) {
  const auth = requirePermission(request, "manage_proposals");

  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json().catch(() => ({}))) as GenerateImprovementBody;
  const sourceSummary = String(body.sourceSummary ?? "").trim();

  if (!sourceSummary) {
    return NextResponse.json(
      { error: "sourceSummary is required." },
      { status: 400 },
    );
  }

  const routed = await routeBrainTask<
    Record<string, unknown>,
    ImprovementOpportunityOutput
  >({
    taskType: "improvement_opportunity",
    input: {
      sourceType: safeSource(body.sourceType),
      sourceId: body.sourceId ?? null,
      sourceSummary,
      context: body.context ?? "",
      currentAppState:
        body.currentAppState ??
        "DG Academy Factory includes Adaptive Growth OS, Brain Layer, OpenClaw loops, Learning Genome, QA/evals, exports, CRM, and delivery workflows.",
    },
    retries: 1,
  });

  const result = await saveImprovementOpportunity({
    sourceType: safeSource(body.sourceType),
    sourceId: body.sourceId ?? null,
    title: routed.output.title,
    description: routed.output.description,
    category: safeCategory(routed.output.category),
    priority: routed.output.priority,
    status: "Suggested",
    recommendedAction: routed.output.rationale,
    codexPrompt: routed.output.codex_prompt,
    suggestedFiles: routed.output.suggested_files_modules,
    acceptanceCriteria: routed.output.acceptance_criteria,
  });

  await saveAuditLog({
    actor: auth.user.actor,
    action: "improvement_opportunity_generated",
    entityType: "improvement_opportunity",
    entityId: result.opportunity.id,
    metadata: {
      mode: routed.mode,
      model: routed.model,
      storage: result.storage,
    },
  });

  return NextResponse.json({
    opportunity: result.opportunity,
    mode: routed.mode,
    model: routed.model,
    notice: routed.notice,
    storage: result.storage,
  });
}
