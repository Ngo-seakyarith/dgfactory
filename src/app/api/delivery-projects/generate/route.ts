import { NextResponse } from "next/server";

import { routeBrainTask } from "@/lib/brain/router";
import {
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

function safeError(error: unknown) {
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : undefined;

  if (status === 401) {
    return "OpenAI key was rejected. Delivery draft generation failed.";
  }

  if (status === 429) {
    return "OpenAI rate limit or quota was reached. Delivery draft generation failed.";
  }

  return error instanceof Error
    ? error.message
    : "OpenAI delivery generation failed.";
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
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is required for delivery draft generation." },
      { status: 503 },
    );
  }

  try {
    const result = await routeBrainTask<Record<string, unknown>, DeliveryDraft>({
      taskType: "delivery_report",
      input: {
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
