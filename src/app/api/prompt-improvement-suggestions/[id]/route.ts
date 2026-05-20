import { NextResponse } from "next/server";

import { updatePromptImprovementSuggestionStatus } from "@/lib/evaluation-storage";
import { isPromptSuggestionStatus } from "@/lib/evaluations";
import { requirePermission } from "@/lib/route-guards";

type Context = {
  params: Promise<{ id: string }>;
};

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Improvement suggestion update failed.";
}

export async function PATCH(request: Request, context: Context) {
  const auth = await requirePermission(request, "manage_prompts");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { status?: unknown };

    if (!isPromptSuggestionStatus(body.status)) {
      return NextResponse.json(
        { error: "A valid suggestion status is required." },
        { status: 400 },
      );
    }

    const result = await updatePromptImprovementSuggestionStatus(id, body.status);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
