import { NextResponse } from "next/server";

import { routeBrainTask } from "@/lib/brain/router";
import type {
  CoursePackageBrainInput,
} from "@/lib/brain/agents";
import {
  normalizeTrainingOutputs,
  normalizeTrainingInput,
  type TrainingPackageOutputs,
} from "@/lib/training-packages";
import {
  calculatePricing,
  clientPricingSummaryToMarkdown,
  normalizePricingInputs,
  type PricingInputs,
} from "@/lib/pricing";
import {
  formatKnowledgeForBrain,
  retrieveKnowledge,
} from "@/lib/knowledge/retrieve";
import { knowledgeSourceNotesFromResults } from "@/lib/knowledge";
import { getTrainerById } from "@/lib/trainers";

function friendlyError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Training package generation failed.";

  if (message.toLowerCase().includes("missing required fields")) {
    return message;
  }

  if (message.toLowerCase().includes("schema")) {
    return "The Brain Layer returned content in an unexpected structure.";
  }

  return message;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = normalizeTrainingInput(body);
    if (!getTrainerById(input.proposalBrief?.trainerId ?? "")) {
      return NextResponse.json(
        { error: "Select a DG Academy trainer before generating the package." },
        { status: 400 },
      );
    }
    const pricingInputs = normalizePricingInputs(
      (body as { pricingInputs?: Partial<PricingInputs> }).pricingInputs,
    );
    if (input.proposalBrief) {
      input.proposalBrief.vatStatus = pricingInputs.vatStatus;
    }
    const pricingOutputs = calculatePricing(pricingInputs);
    const knowledgeBriefValues = Object.entries(input.proposalBrief ?? {})
      .filter(
        ([key]) =>
          ![
            "trainerImageUrl",
            "trainerBio",
            "trainerExperience",
            "trainerQualifications",
          ].includes(key),
      )
      .map(([, value]) => value);
    const knowledgeResults = await retrieveKnowledge({
      query: [
        input.courseTitle,
        input.audience,
        input.client,
        input.promise,
        input.context,
        ...knowledgeBriefValues,
      ].join(" "),
      filters: { visibility: "Any" },
      limit: 6,
    });
    const knowledgeContext = formatKnowledgeForBrain(knowledgeResults);
    const knowledgeUsed = knowledgeSourceNotesFromResults(knowledgeResults);
    const brainInput: CoursePackageBrainInput = {
      ...input,
      context: [input.context, knowledgeContext].filter(Boolean).join("\n\n"),
      pricingSummary: clientPricingSummaryToMarkdown(pricingInputs, pricingOutputs),
    };
    const result = await routeBrainTask<CoursePackageBrainInput, TrainingPackageOutputs>({
      taskType: "course_package",
      input: brainInput,
      retries: 1,
    });

    return NextResponse.json({
      outputs: normalizeTrainingOutputs(result.output, input),
      mode: result.mode,
      model: result.model,
      notice: result.notice,
      knowledgeUsed,
    });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
