import { NextResponse } from "next/server";

import {
  listPromptImprovementSuggestions,
  savePromptImprovementSuggestion,
} from "@/lib/evaluation-storage";
import {
  isPromptSuggestionStatus,
  type PromptImprovementSuggestion,
} from "@/lib/evaluations";
import { requirePermission } from "@/lib/route-guards";

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Improvement suggestion request failed.";
}

export async function GET(request: Request) {
  const auth = await requirePermission(request, "manage_prompts");
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const suggestions = await listPromptImprovementSuggestions({
      sourceEvaluationId: url.searchParams.get("sourceEvaluationId") ?? undefined,
      status: isPromptSuggestionStatus(status) ? status : undefined,
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "manage_prompts");
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as Partial<PromptImprovementSuggestion>;
    const result = await savePromptImprovementSuggestion(body);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
