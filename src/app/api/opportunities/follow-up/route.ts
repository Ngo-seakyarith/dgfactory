import OpenAI from "openai";
import { NextResponse } from "next/server";

import {
  createMockFollowUpDraft,
  isOpportunityStatus,
  type FollowUpDraft,
} from "@/lib/crm";

let openaiClient: OpenAI | null = null;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return openaiClient;
}

function normalizeDraft(value: unknown): FollowUpDraft | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.followUpEmail !== "string" ||
    typeof record.shortMessage !== "string" ||
    typeof record.suggestedNextStep !== "string"
  ) {
    return null;
  }

  return {
    followUpEmail: record.followUpEmail,
    shortMessage: record.shortMessage,
    suggestedNextStep: record.suggestedNextStep,
  };
}

function safeNotice(error: unknown) {
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : undefined;

  if (status === 401) {
    return "OpenAI key was rejected, so mock follow-up drafts were used.";
  }

  if (status === 429) {
    return "OpenAI rate limit or quota was reached, so mock follow-up drafts were used.";
  }

  return "OpenAI follow-up generation was unavailable, so mock drafts were used.";
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
  const client = getOpenAIClient();

  if (!client) {
    return NextResponse.json({
      draft: createMockFollowUpDraft(input),
      mode: "mock",
      notice: "OPENAI_API_KEY is missing, so mock follow-up drafts were used.",
    });
  }

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.45,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are DG Academy's corporate training sales assistant. Return only JSON with followUpEmail, shortMessage, and suggestedNextStep. Draft only; never imply that a message has been sent.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Draft a professional follow-up email, Telegram/WhatsApp style message, and suggested next step.",
            input,
            rules: [
              "Suitable for corporate training clients in Cambodia.",
              "Clear and practical.",
              "Do not make legal, pricing, funding, or delivery commitments.",
              "Do not say the message has been sent.",
            ],
          }),
        },
      ],
    });
    const parsed = completion.choices[0]?.message.content
      ? JSON.parse(completion.choices[0].message.content)
      : null;
    const draft = normalizeDraft(parsed);

    if (!draft) {
      throw new Error("Invalid follow-up draft output.");
    }

    return NextResponse.json({ draft, mode: "openai" });
  } catch (error) {
    return NextResponse.json({
      draft: createMockFollowUpDraft(input),
      mode: "mock",
      notice: safeNotice(error),
    });
  }
}
