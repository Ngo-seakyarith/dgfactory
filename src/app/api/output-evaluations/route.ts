import { NextResponse } from "next/server";

import {
  listOutputEvaluations,
  saveOutputEvaluation,
} from "@/lib/evaluation-storage";
import type { OutputEvaluation } from "@/lib/evaluations";

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Evaluation request failed.";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const evaluations = await listOutputEvaluations({
      packageId: url.searchParams.get("packageId") ?? undefined,
      deliveryProjectId: url.searchParams.get("deliveryProjectId") ?? undefined,
    });

    return NextResponse.json({ evaluations });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<OutputEvaluation>;
    const result = await saveOutputEvaluation(body);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
