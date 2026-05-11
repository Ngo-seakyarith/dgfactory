import { NextResponse } from "next/server";

import { routeBrainTask } from "@/lib/brain/router";
import type {
  CoursePackageBrainInput,
} from "@/lib/brain/agents";
import {
  normalizeTrainingInput,
  type TrainingPackageOutputs,
} from "@/lib/training-packages";
import {
  calculatePricing,
  normalizePricingInputs,
  pricingSummaryToMarkdown,
  type PricingInputs,
} from "@/lib/pricing";
import {
  formatKnowledgeForBrain,
  retrieveKnowledge,
} from "@/lib/knowledge/retrieve";
import { knowledgeSourceNotesFromResults } from "@/lib/knowledge";

function friendlyError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Training package generation failed.";

  if (message.toLowerCase().includes("missing required fields")) {
    return message;
  }

  if (message.toLowerCase().includes("schema")) {
    return "The Brain Layer returned content in an unexpected structure. Mock mode may be used on retry.";
  }

  return message;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = normalizeTrainingInput(body);
    const pricingInputs = normalizePricingInputs(
      (body as { pricingInputs?: Partial<PricingInputs> }).pricingInputs,
    );
    const pricingOutputs = calculatePricing(pricingInputs);
    const knowledgeResults = await retrieveKnowledge({
      query: [
        input.courseTitle,
        input.audience,
        input.client,
        input.promise,
        input.context,
      ].join(" "),
      filters: { visibility: "Any" },
      limit: 6,
    });
    const knowledgeContext = formatKnowledgeForBrain(knowledgeResults);
    const knowledgeUsed = knowledgeSourceNotesFromResults(knowledgeResults);
    const brainInput: CoursePackageBrainInput = {
      ...input,
      context: [input.context, knowledgeContext].filter(Boolean).join("\n\n"),
      pricingInputs,
      pricingOutputs,
      pricingSummary: pricingSummaryToMarkdown(pricingInputs, pricingOutputs),
    };
    const result = await routeBrainTask<CoursePackageBrainInput, TrainingPackageOutputs>({
      taskType: "course_package",
      input: brainInput,
      retries: 1,
    });

    return NextResponse.json({
      outputs: result.output,
      mode: result.mode,
      model: result.model,
      notice: result.notice,
      knowledgeUsed,
    });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
