import { NextResponse } from "next/server";

import { routeBrainTask } from "@/lib/brain/routing/router";
import type { QaReviewInput, QaReviewOutput } from "@/lib/brain/agents";

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "QA review failed.";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<QaReviewInput>;
    const input: QaReviewInput = {
      packageContent: String(body.packageContent ?? "").trim(),
      client: String(body.client ?? "").trim(),
      audience: String(body.audience ?? "").trim(),
      context: String(body.context ?? "").trim(),
    };

    if (!input.packageContent) {
      return NextResponse.json(
        { error: "Package content is required for QA review." },
        { status: 400 },
      );
    }

    const result = await routeBrainTask<QaReviewInput, QaReviewOutput>({
      taskType: "qa_review",
      input,
      retries: 1,
    });

    return NextResponse.json({
      review: result.output,
      mode: result.mode,
      model: result.model,
      notice: result.notice,
    });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
