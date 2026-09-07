import { z } from "zod";

import type { ProposalBrief } from "./proposal-brief";

export type ProposalNarrativeBrief = Pick<
  ProposalBrief,
  | "clientBackground"
  | "trainingNeed"
  | "expectedLearningOutcomes"
  | "contentPriorities"
  | "whoShouldAttend"
  | "methodology"
  | "trainingTools"
  | "evaluationApproach"
>;

export function proposalNarrativeBriefFrom(
  brief?: Partial<ProposalBrief> | null,
): ProposalNarrativeBrief {
  return {
    clientBackground: brief?.clientBackground ?? "",
    trainingNeed: brief?.trainingNeed ?? "",
    expectedLearningOutcomes: brief?.expectedLearningOutcomes ?? "",
    contentPriorities: brief?.contentPriorities ?? "",
    whoShouldAttend: brief?.whoShouldAttend ?? "",
    methodology: brief?.methodology ?? "",
    trainingTools: brief?.trainingTools ?? "",
    evaluationApproach: brief?.evaluationApproach ?? "",
  };
}

const narrativeItemSchema = z.string().trim().min(1);
const requiredNarrativeItemsSchema = z.array(narrativeItemSchema).min(1);
const optionalNarrativeItemsSchema = z.array(narrativeItemSchema);

export const proposalNarrativeSchema = z.strictObject({
  courseOverview: requiredNarrativeItemsSchema,
  courseObjectives: requiredNarrativeItemsSchema,
  expectedLearningOutcomes: optionalNarrativeItemsSchema,
  contentOutlines: requiredNarrativeItemsSchema,
  whoShouldAttend: optionalNarrativeItemsSchema,
  trainingMethodology: requiredNarrativeItemsSchema,
  trainingTools: optionalNarrativeItemsSchema,
  trainingEvaluation: optionalNarrativeItemsSchema,
});

export type ProposalNarrative = z.infer<typeof proposalNarrativeSchema>;
