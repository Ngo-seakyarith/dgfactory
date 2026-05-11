import OpenAI from "openai";
import { NextResponse } from "next/server";

import {
  createMockDeliveryDraft,
  normalizeDeliveryProject,
  type DeliveryDraft,
  type DeliveryDraftKind,
  type DeliveryProject,
  type DeliveryTask,
} from "@/lib/delivery";

const draftKinds: DeliveryDraftKind[] = [
  "trainer-checklist",
  "participant-email",
  "training-day-agenda",
  "post-training-report",
];

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

function normalizeDraft(value: unknown): DeliveryDraft | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.title !== "string" ||
    typeof record.body !== "string" ||
    typeof record.suggestedNextStep !== "string"
  ) {
    return null;
  }

  return {
    title: record.title,
    body: record.body,
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
    return "OpenAI key was rejected, so mock delivery drafts were used.";
  }

  if (status === 429) {
    return "OpenAI rate limit or quota was reached, so mock delivery drafts were used.";
  }

  return "OpenAI delivery generation was unavailable, so mock drafts were used.";
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    kind?: DeliveryDraftKind;
    project?: Partial<DeliveryProject>;
    tasks?: DeliveryTask[];
    clientName?: string;
    packageTitle?: string;
    learningObjectives?: string;
  };
  const kind = draftKinds.includes(body.kind as DeliveryDraftKind)
    ? (body.kind as DeliveryDraftKind)
    : "post-training-report";
  const project = normalizeDeliveryProject(body.project ?? {});
  const input = {
    kind,
    project,
    tasks: body.tasks ?? [],
    clientName: String(body.clientName ?? "").trim(),
    packageTitle: String(body.packageTitle ?? "").trim(),
    learningObjectives: String(body.learningObjectives ?? "").trim(),
  };
  const client = getOpenAIClient();

  if (!client) {
    return NextResponse.json({
      draft: createMockDeliveryDraft(input),
      mode: "mock",
      notice: "OPENAI_API_KEY is missing, so mock delivery drafts were used.",
    });
  }

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are DG Academy's training delivery operations assistant. Return only JSON with title, body, and suggestedNextStep. Draft documents only; never imply that anything was sent to a client.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task:
              "Generate a practical delivery support draft for an internal DG Academy training project.",
            input,
            rules: [
              "Suitable for corporate training delivery in Cambodia.",
              "Use a professional, concise, client-ready tone where relevant.",
              "Do not invent attendance or evaluation facts beyond provided inputs.",
              "Do not send messages or imply messages were sent.",
              "For post-training reports, include overview, participant count, objectives, delivery summary, evaluation result, feedback, recommendations, and next opportunities.",
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
      throw new Error("Invalid delivery draft output.");
    }

    return NextResponse.json({ draft, mode: "openai" });
  } catch (error) {
    return NextResponse.json({
      draft: createMockDeliveryDraft(input),
      mode: "mock",
      notice: safeNotice(error),
    });
  }
}
