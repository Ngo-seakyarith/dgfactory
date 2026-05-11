import type { QaReviewOutput } from "@/lib/brain/agents";

export function qaReviewPassesClientReadiness(review: QaReviewOutput) {
  return review.score >= 75 && review.clientReadiness !== "low";
}

export function summarizeQaReview(review: QaReviewOutput) {
  return [
    `Score: ${review.score}/100`,
    `Client readiness: ${review.clientReadiness}`,
    `Strengths: ${review.strengths.join("; ") || "None listed"}`,
    `Risks: ${review.risks.join("; ") || "None listed"}`,
    `Improvements: ${review.recommendedImprovements.join("; ") || "None listed"}`,
  ].join("\n");
}

export {
  evaluationRubrics,
  getRubricForOutputType,
  type EvaluationRubric,
} from "@/lib/brain/evals/rubrics";

export { createSeedEvalData } from "@/lib/brain/evals/benchmarks";
export { runEvalDataset } from "@/lib/brain/evals/runEval";
export type {
  AgentTrace,
  EvalDataset,
  EvalExample,
  EvalResult,
  EvalRun,
} from "@/lib/brain/evals/types";
