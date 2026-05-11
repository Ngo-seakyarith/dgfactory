import { NextResponse } from "next/server";

import { listPromptImprovementSuggestions } from "@/lib/evaluation-storage";
import { createDraftFromImprovementSuggestion } from "@/lib/prompt-template-storage";

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Prompt draft request failed.";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      suggestionId?: unknown;
      targetAgent?: unknown;
      suggestedChange?: unknown;
      reason?: unknown;
    };
    let targetAgent =
      typeof body.targetAgent === "string" ? body.targetAgent : "";
    let suggestedChange =
      typeof body.suggestedChange === "string" ? body.suggestedChange : "";
    let reason = typeof body.reason === "string" ? body.reason : "";

    if (typeof body.suggestionId === "string" && body.suggestionId.trim()) {
      const suggestions = await listPromptImprovementSuggestions();
      const suggestion = suggestions.find((item) => item.id === body.suggestionId);

      if (!suggestion) {
        return NextResponse.json(
          { error: "Improvement suggestion not found." },
          { status: 404 },
        );
      }

      if (suggestion.status !== "Approved") {
        return NextResponse.json(
          {
            error:
              "Only approved improvement suggestions can create prompt drafts.",
          },
          { status: 400 },
        );
      }

      targetAgent = suggestion.targetAgent;
      suggestedChange = suggestion.suggestedChange;
      reason = suggestion.reason;
    }

    if (!targetAgent || !suggestedChange) {
      return NextResponse.json(
        { error: "targetAgent and suggestedChange are required." },
        { status: 400 },
      );
    }

    const result = await createDraftFromImprovementSuggestion({
      targetAgent,
      suggestedChange,
      reason,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
