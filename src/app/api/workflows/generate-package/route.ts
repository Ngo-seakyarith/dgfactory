import { NextResponse } from "next/server";

import { routeBrainTask } from "@/lib/brain/router";
import {
  runPackageWorkflow,
  type PackageWorkflowInput,
} from "@/lib/brain/workflows/packageWorkflow";
import {
  formatKnowledgeForBrain,
  retrieveKnowledge,
} from "@/lib/knowledge/retrieve";
import { knowledgeSourceNotesFromResults } from "@/lib/knowledge";
import type { CoursePackageBrainInput } from "@/lib/brain/agents";
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = normalizeTrainingInput(body);
    const pricingInputs = normalizePricingInputs(
      (body as { pricingInputs?: Partial<PricingInputs> }).pricingInputs,
    );
    const useMultiAgent =
      (body as { useMultiAgent?: boolean }).useMultiAgent !== false;

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

    if (!useMultiAgent) {
      const pricingOutputs = calculatePricing(pricingInputs);
      const brainInput: CoursePackageBrainInput = {
        ...input,
        pricingInputs,
        pricingOutputs,
        pricingSummary: pricingSummaryToMarkdown(pricingInputs, pricingOutputs),
        context: [input.context, knowledgeContext].filter(Boolean).join("\n\n"),
      };
      const oneShot = await routeBrainTask<CoursePackageBrainInput, TrainingPackageOutputs>({
        taskType: "course_package",
        input: brainInput,
        retries: 1,
      });

      return NextResponse.json({
        workflowId: null,
        outputs: oneShot.output,
        mode: oneShot.mode,
        model: oneShot.model,
        notice: oneShot.notice,
        knowledgeUsed,
        traceSummary: [],
      });
    }

    const workflowInput: PackageWorkflowInput = {
      ...input,
      pricingInputs,
      knowledgeContext,
      knowledgeUsed,
      workflowId: (body as { workflowId?: string }).workflowId,
      forceFailStep: (body as PackageWorkflowInput).forceFailStep,
    };
    const result = await runPackageWorkflow(workflowInput);

    return NextResponse.json({
      workflowId: result.workflowId,
      outputs: result.output,
      qaReview: result.qaReview,
      qaScore: result.qaReview.score,
      traceSummary: result.traceSummary,
      knowledgeUsed,
      state: result.state,
      mode: "openai",
    });
  } catch (error) {
    const state =
      typeof error === "object" &&
      error !== null &&
      "workflowState" in error
        ? (error as { workflowState: unknown }).workflowState
        : null;

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Multi-agent package workflow failed.",
        state,
      },
      { status: 500 },
    );
  }
}
