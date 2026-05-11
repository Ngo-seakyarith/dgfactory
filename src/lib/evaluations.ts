import { getRubricForOutputType, type EvaluationRubric } from "@/lib/brain/evals/rubrics";

export const outputEvaluationTypes = [
  "syllabus",
  "proposal",
  "deck",
  "workbook",
  "commercial_proposal",
  "follow_up_email",
  "delivery_report",
  "full_package",
] as const;

export type OutputEvaluationType = (typeof outputEvaluationTypes)[number];

export const reviewerTypes = [
  "AI_QA",
  "Sopheap",
  "Trainer",
  "Client",
  "Learner",
  "Internal Team",
] as const;

export type ReviewerType = (typeof reviewerTypes)[number];

export const promptSuggestionStatuses = [
  "Suggested",
  "Approved",
  "Rejected",
  "Implemented",
] as const;

export type PromptSuggestionStatus = (typeof promptSuggestionStatuses)[number];

export type OutputEvaluation = {
  id: string;
  packageId: string | null;
  deliveryProjectId: string | null;
  outputType: OutputEvaluationType;
  score: number;
  reviewerType: ReviewerType;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  improvementSuggestions: string[];
  risks: string[];
  createdAt: string;
};

export type PromptImprovementSuggestion = {
  id: string;
  sourceEvaluationId: string | null;
  targetAgent: string;
  currentPromptSummary: string;
  suggestedChange: string;
  reason: string;
  status: PromptSuggestionStatus;
  createdAt: string;
  updatedAt: string;
};

export type SuggestedPromptChange = {
  targetAgent: string;
  currentPromptSummary: string;
  suggestedChange: string;
  reason: string;
};

export type EvaluateOutputInput = {
  output: string;
  outputType: OutputEvaluationType;
  targetAudience: string;
  clientContext: string;
  rubric?: string | EvaluationRubric;
};

export type EvaluateOutputResult = {
  score: number;
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  improvementSuggestions: string[];
  suggestedPromptChanges: SuggestedPromptChange[];
};

export type QualityDashboardMetrics = {
  averageQaScore: number;
  evaluationCount: number;
  lowestScoringOutputTypes: Array<{
    outputType: OutputEvaluationType;
    averageScore: number;
    count: number;
  }>;
  mostCommonWeaknesses: Array<{ weakness: string; count: number }>;
  pendingImprovementSuggestions: PromptImprovementSuggestion[];
  approvedImprovements: PromptImprovementSuggestion[];
};

function normalizeList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function isOutputEvaluationType(value: unknown): value is OutputEvaluationType {
  return (
    typeof value === "string" &&
    outputEvaluationTypes.includes(value as OutputEvaluationType)
  );
}

export function isReviewerType(value: unknown): value is ReviewerType {
  return typeof value === "string" && reviewerTypes.includes(value as ReviewerType);
}

export function isPromptSuggestionStatus(
  value: unknown,
): value is PromptSuggestionStatus {
  return (
    typeof value === "string" &&
    promptSuggestionStatuses.includes(value as PromptSuggestionStatus)
  );
}

export function normalizeEvaluationScore(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(numberValue)));
}

export function normalizeOutputEvaluation(
  value: Partial<OutputEvaluation>,
): OutputEvaluation {
  return {
    id: value.id || crypto.randomUUID(),
    packageId: value.packageId || null,
    deliveryProjectId: value.deliveryProjectId || null,
    outputType: isOutputEvaluationType(value.outputType)
      ? value.outputType
      : "full_package",
    score: normalizeEvaluationScore(value.score),
    reviewerType: isReviewerType(value.reviewerType)
      ? value.reviewerType
      : "Internal Team",
    feedback: String(value.feedback ?? "").trim(),
    strengths: normalizeList(value.strengths),
    weaknesses: normalizeList(value.weaknesses),
    improvementSuggestions: normalizeList(value.improvementSuggestions),
    risks: normalizeList(value.risks),
    createdAt: value.createdAt || new Date().toISOString(),
  };
}

export function normalizePromptImprovementSuggestion(
  value: Partial<PromptImprovementSuggestion>,
): PromptImprovementSuggestion {
  const now = new Date().toISOString();

  return {
    id: value.id || crypto.randomUUID(),
    sourceEvaluationId: value.sourceEvaluationId || null,
    targetAgent: String(value.targetAgent ?? "improvementAgent").trim(),
    currentPromptSummary: String(value.currentPromptSummary ?? "").trim(),
    suggestedChange: String(value.suggestedChange ?? "").trim(),
    reason: String(value.reason ?? "").trim(),
    status: isPromptSuggestionStatus(value.status) ? value.status : "Suggested",
    createdAt: value.createdAt || now,
    updatedAt: value.updatedAt || now,
  };
}

function containsAny(text: string, needles: string[]) {
  return needles.some((needle) => text.includes(needle));
}

function agentForOutputType(outputType: OutputEvaluationType) {
  const map: Record<OutputEvaluationType, string> = {
    syllabus: "courseArchitectAgent",
    proposal: "proposalAgent",
    deck: "slideAgent",
    workbook: "workbookAgent",
    commercial_proposal: "pricingNarrativeAgent",
    follow_up_email: "salesFollowUpAgent",
    delivery_report: "deliveryAgent",
    full_package: "chiefBrainAgent",
  };

  return map[outputType];
}

export function createMockEvaluation(input: EvaluateOutputInput): EvaluateOutputResult {
  const output = input.output.trim();
  const text = output.toLowerCase();
  const rubric =
    typeof input.rubric === "object" && input.rubric
      ? input.rubric
      : getRubricForOutputType(input.outputType);
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const risks: string[] = [];
  const improvementSuggestions: string[] = [];

  if (output.length > 900) {
    strengths.push("The output has enough substance for a serious DG Academy review.");
  } else {
    weaknesses.push("The output is short and may need more client-ready detail.");
    improvementSuggestions.push("Expand the section with concrete examples and decisions.");
  }

  if (input.clientContext && text.includes(input.clientContext.toLowerCase().slice(0, 12))) {
    strengths.push("The client context is visibly reflected in the output.");
  } else {
    weaknesses.push("Client context is not clearly woven through the output.");
    improvementSuggestions.push("Add client-specific examples, operating realities, and next steps.");
  }

  if (input.targetAudience && text.includes(input.targetAudience.toLowerCase().slice(0, 8))) {
    strengths.push("The target audience is named or implied in the content.");
  } else {
    weaknesses.push("Target learner needs are not explicit enough.");
  }

  if (containsAny(text, ["guarantee", "guaranteed", "100%"])) {
    risks.push("The output may contain unsupported guarantee language.");
  }

  if (containsAny(text, ["margin", "profit", "direct cost", "trainer day rate"])) {
    risks.push("Internal commercial information may be exposed to a client-facing output.");
  }

  rubric.warningSigns.forEach((warning) => {
    const warningKeyword = warning.toLowerCase().split(" ")[0];

    if (warningKeyword && text.includes(warningKeyword)) {
      return;
    }
  });

  const score = Math.max(
    45,
    Math.min(
      96,
      88 - weaknesses.length * 8 - risks.length * 10 + strengths.length * 3,
    ),
  );

  const suggestedChange =
    weaknesses[0] ??
    "Add stronger DG Academy examples and make the expected buyer decision clearer.";

  return {
    score,
    strengths: strengths.length
      ? strengths
      : ["The output is organized enough to review and refine."],
    weaknesses: weaknesses.length
      ? weaknesses
      : ["Final human review should still check relevance, examples, and claims."],
    risks: risks.length ? risks : ["No major mock-mode risks detected."],
    improvementSuggestions: improvementSuggestions.length
      ? improvementSuggestions
      : ["Add one more client-specific example and one clearer next-step action."],
    suggestedPromptChanges: [
      {
        targetAgent: agentForOutputType(input.outputType),
        currentPromptSummary: `${rubric.title}: ${rubric.criteria.slice(0, 3).join("; ")}`,
        suggestedChange,
        reason:
          "The evaluation loop detected a recurring quality gap that should be reviewed by a human before changing prompts.",
      },
    ],
  };
}

export function createSuggestionsFromEvaluation(
  evaluation: OutputEvaluation,
  changes: SuggestedPromptChange[],
) {
  return changes.map((change) =>
    normalizePromptImprovementSuggestion({
      sourceEvaluationId: evaluation.id,
      targetAgent: change.targetAgent,
      currentPromptSummary: change.currentPromptSummary,
      suggestedChange: change.suggestedChange,
      reason: change.reason,
      status: "Suggested",
    }),
  );
}

export function calculateQualityMetrics(
  evaluations: OutputEvaluation[],
  suggestions: PromptImprovementSuggestion[],
): QualityDashboardMetrics {
  const evaluationCount = evaluations.length;
  const averageQaScore = evaluationCount
    ? Math.round(
        evaluations.reduce((total, evaluation) => total + evaluation.score, 0) /
          evaluationCount,
      )
    : 0;
  const byOutput = new Map<OutputEvaluationType, { total: number; count: number }>();
  const weaknessCounts = new Map<string, number>();

  evaluations.forEach((evaluation) => {
    const current = byOutput.get(evaluation.outputType) ?? { total: 0, count: 0 };
    byOutput.set(evaluation.outputType, {
      total: current.total + evaluation.score,
      count: current.count + 1,
    });

    evaluation.weaknesses.forEach((weakness) => {
      weaknessCounts.set(weakness, (weaknessCounts.get(weakness) ?? 0) + 1);
    });
  });

  return {
    averageQaScore,
    evaluationCount,
    lowestScoringOutputTypes: [...byOutput.entries()]
      .map(([outputType, value]) => ({
        outputType,
        averageScore: Math.round(value.total / value.count),
        count: value.count,
      }))
      .sort((a, b) => a.averageScore - b.averageScore)
      .slice(0, 5),
    mostCommonWeaknesses: [...weaknessCounts.entries()]
      .map(([weakness, count]) => ({ weakness, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    pendingImprovementSuggestions: suggestions.filter(
      (suggestion) => suggestion.status === "Suggested",
    ),
    approvedImprovements: suggestions.filter(
      (suggestion) => suggestion.status === "Approved",
    ),
  };
}
