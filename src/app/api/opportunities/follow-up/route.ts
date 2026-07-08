import { NextResponse } from "next/server";

import { routeBrainTask } from "@/lib/brain/router";
import {
  isOpportunityStatus,
  type FollowUpDraft,
} from "@/lib/crm";

function safeError(error: unknown) {
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : undefined;

  if (status === 401) {
    return "OpenRouter key was rejected. Follow-up draft generation failed.";
  }

  if (status === 429) {
    return "OpenRouter rate limit or quota was reached. Follow-up draft generation failed.";
  }

  return error instanceof Error
    ? error.message
    : "OpenRouter follow-up generation failed.";
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    clientName?: string;
    status?: string;
    trainingNeed?: string;
    lastNotes?: string;
    nextFollowUpDate?: string;
  };
  const input = {
    clientName: String(body.clientName ?? "").trim(),
    status: isOpportunityStatus(body.status) ? body.status : "Lead",
    trainingNeed: String(body.trainingNeed ?? "").trim(),
    lastNotes: String(body.lastNotes ?? "").trim(),
    nextFollowUpDate: String(body.nextFollowUpDate ?? "").trim(),
  };
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is required for follow-up draft generation." },
      { status: 503 },
    );
  }

  try {
    const result = await routeBrainTask<Record<string, unknown>, FollowUpDraft>({
      taskType: "follow_up",
      input: {
        task: "Draft a professional follow-up email, Telegram/WhatsApp style message, and suggested next step.",
        input,
        rules: [
          "Suitable for corporate training clients in Cambodia.",
          "Clear and practical.",
          "Do not make legal, pricing, funding, or delivery commitments.",
          "Do not say the message has been sent.",
        ],
      },
    });

    return NextResponse.json({
      draft: result.output,
      mode: result.mode,
      model: result.model,
    });
  } catch (error) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
