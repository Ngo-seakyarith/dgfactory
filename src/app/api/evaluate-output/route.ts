import { NextResponse } from "next/server";

import { generateStructuredOutput } from "@/lib/brain/client";
import { outputEvaluationResultSchema } from "@/lib/brain/schemas";
import { getRubricForOutputType } from "@/lib/brain/evals/rubrics";
import {
  createSuggestionsFromEvaluation,
  isOutputEvaluationType,
  normalizeOutputEvaluation,
  type EvaluateOutputInput,
  type EvaluateOutputResult,
  type OutputEvaluation,
  type PromptImprovementSuggestion,
} from "@/lib/evaluations";
import {
  saveOutputEvaluation,
  savePromptImprovementSuggestion,
} from "@/lib/evaluation-storage";
import type { BrainAgentDefinition } from "@/lib/brain/agents";

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Output evaluation failed.";
}

const evaluationAgent: BrainAgentDefinition<
  EvaluateOutputInput,
  EvaluateOutputResult
> = {
  taskType: "improvement_suggestion",
  name: "evaluationAgent",
  role: "DG Academy output evaluator",
  instructions:
    "Evaluate DG Academy training outputs against the supplied rubric. Be practical, client-readiness focused, and commercially careful. Suggest prompt improvements only as human-review suggestions; never claim prompts were updated.",
  inputSchema: {
    type: "object",
    required: ["output", "outputType", "targetAudience", "clientContext"],
    properties: {
      output: { type: "string" },
      outputType: { type: "string" },
      targetAudience: { type: "string" },
      clientContext: { type: "string" },
    },
  },
  outputSchema: outputEvaluationResultSchema,
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      output?: unknown;
      outputType?: unknown;
      targetAudience?: unknown;
      clientContext?: unknown;
      rubric?: unknown;
      packageId?: unknown;
      deliveryProjectId?: unknown;
      persist?: unknown;
    };
    const outputType = isOutputEvaluationType(body.outputType)
      ? body.outputType
      : "full_package";
    const rubric =
      typeof body.rubric === "string" && body.rubric.trim()
        ? body.rubric
        : getRubricForOutputType(outputType);
    const input: EvaluateOutputInput = {
      output: String(body.output ?? "").trim(),
      outputType,
      targetAudience: String(body.targetAudience ?? "").trim(),
      clientContext: String(body.clientContext ?? "").trim(),
      rubric,
    };

    if (!input.output) {
      return NextResponse.json(
        { error: "Output text is required for evaluation." },
        { status: 400 },
      );
    }

    const result = await generateStructuredOutput({
      agent: evaluationAgent,
      input,
      retries: 1,
    });
    let savedEvaluation: OutputEvaluation | null = null;
    let savedSuggestions: PromptImprovementSuggestion[] = [];

    if (body.persist) {
      const evaluation = normalizeOutputEvaluation({
        packageId: typeof body.packageId === "string" ? body.packageId : null,
        deliveryProjectId:
          typeof body.deliveryProjectId === "string"
            ? body.deliveryProjectId
            : null,
        outputType,
        score: result.output.score,
        reviewerType: "AI_QA",
        feedback: `AI evaluation using ${typeof rubric === "string" ? "custom rubric" : rubric.title}.`,
        strengths: result.output.strengths,
        weaknesses: result.output.weaknesses,
        improvementSuggestions: result.output.improvementSuggestions,
        risks: result.output.risks,
      });
      const evaluationSave = await saveOutputEvaluation(evaluation);
      savedEvaluation = evaluationSave.evaluation;
      const suggestions = createSuggestionsFromEvaluation(
        evaluationSave.evaluation,
        result.output.suggestedPromptChanges,
      );

      savedSuggestions = await Promise.all(
        suggestions.map(async (suggestion) => {
          const saved = await savePromptImprovementSuggestion(suggestion);
          return saved.suggestion;
        }),
      );
    }

    return NextResponse.json({
      evaluation: result.output,
      savedEvaluation,
      savedSuggestions,
      mode: result.mode,
      model: result.model,
      notice: result.notice,
    });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
