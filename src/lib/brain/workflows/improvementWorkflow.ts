import {
  listOutputEvaluations,
  savePromptImprovementSuggestion,
} from "@/lib/evaluation-storage";
import {
  normalizePromptImprovementSuggestion,
  type OutputEvaluation,
  type PromptImprovementSuggestion,
} from "@/lib/evaluations";

export type ImprovementWorkflowResult = {
  reviewedEvaluations: number;
  createdSuggestions: PromptImprovementSuggestion[];
  summary: string;
};

function targetAgentForEvaluation(evaluation: OutputEvaluation) {
  const map: Record<OutputEvaluation["outputType"], string> = {
    syllabus: "courseArchitectAgent",
    proposal: "proposalAgent",
    deck: "slideAgent",
    workbook: "workbookAgent",
    commercial_proposal: "pricingNarrativeAgent",
    follow_up_email: "salesFollowUpAgent",
    delivery_report: "deliveryAgent",
    full_package: "chiefBrainAgent",
  };

  return map[evaluation.outputType];
}

export async function runImprovementWorkflow({
  maxScore = 75,
  limit = 10,
}: {
  maxScore?: number;
  limit?: number;
} = {}): Promise<ImprovementWorkflowResult> {
  const evaluations = (await listOutputEvaluations())
    .filter((evaluation) => evaluation.score > 0 && evaluation.score <= maxScore)
    .slice(0, limit);
  const createdSuggestions: PromptImprovementSuggestion[] = [];

  for (const evaluation of evaluations) {
    const firstWeakness =
      evaluation.weaknesses[0] ??
      "The output needs stronger DG Academy client-readiness checks.";
    const firstSuggestion =
      evaluation.improvementSuggestions[0] ??
      "Tighten the prompt with explicit client context, evidence, and next-step requirements.";
    const suggestion = normalizePromptImprovementSuggestion({
      sourceEvaluationId: evaluation.id,
      targetAgent: targetAgentForEvaluation(evaluation),
      currentPromptSummary: `${evaluation.outputType} scored ${evaluation.score}/100 from ${evaluation.reviewerType}.`,
      suggestedChange: firstSuggestion,
      reason: firstWeakness,
      status: "Suggested",
    });
    const saved = await savePromptImprovementSuggestion(suggestion);
    createdSuggestions.push(saved.suggestion);
  }

  return {
    reviewedEvaluations: evaluations.length,
    createdSuggestions,
    summary:
      createdSuggestions.length > 0
        ? `Created ${createdSuggestions.length} human-review improvement suggestion(s).`
        : "No low-scoring outputs needed new improvement suggestions.",
  };
}
