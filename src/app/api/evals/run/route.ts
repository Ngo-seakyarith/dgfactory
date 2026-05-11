import { NextResponse } from "next/server";

import { runEvalDataset } from "@/lib/brain/evals/runEval";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const datasetId = String(body.datasetId ?? "").trim();

  if (!datasetId) {
    return NextResponse.json({ error: "datasetId is required." }, { status: 400 });
  }

  try {
    const result = await runEvalDataset({
      datasetId,
      workflowId: body.workflowId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Eval run failed." },
      { status: 500 },
    );
  }
}
