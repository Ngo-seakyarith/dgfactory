import { NextResponse } from "next/server";

import { POST as generateTrainingPackage } from "@/app/api/training-packages/generate/route";
import type { TrainingPackageOutputs } from "@/lib/training-packages";
import type { KnowledgeSourceNote } from "@/lib/knowledge";

export async function POST(request: Request) {
  const response = await generateTrainingPackage(request);
  const payload = (await response.json()) as {
    outputs?: TrainingPackageOutputs;
    mode?: "openai";
    notice?: string;
    knowledgeUsed?: KnowledgeSourceNote[];
    error?: string;
  };

  if (!response.ok || !payload.outputs) {
    return NextResponse.json(
      { error: payload.error ?? "Training package generation failed." },
      { status: response.status },
    );
  }

  return NextResponse.json({
    ...payload.outputs,
    mode: payload.mode,
    notice: payload.notice,
    knowledgeUsed: payload.knowledgeUsed ?? [],
  });
}
