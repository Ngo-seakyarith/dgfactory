import { z } from "zod";

import type { ProposalBrief } from "./proposal-brief";

export type ProposalNarrativeBrief = Pick<
  ProposalBrief,
  | "clientBackground"
  | "trainingNeed"
  | "objectives"
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
    objectives: brief?.objectives ?? "",
    expectedLearningOutcomes: brief?.expectedLearningOutcomes ?? "",
    contentPriorities: brief?.contentPriorities ?? "",
    whoShouldAttend: brief?.whoShouldAttend ?? "",
    methodology: brief?.methodology ?? "",
    trainingTools: brief?.trainingTools ?? "",
    evaluationApproach: brief?.evaluationApproach ?? "",
  };
}

export const proposalNarrativeSchema = z.strictObject({
  courseOverview: z.array(z.string()),
  courseObjectives: z.array(z.string()),
  expectedLearningOutcomes: z.array(z.string()),
  contentOutlines: z.array(z.string()),
  whoShouldAttend: z.array(z.string()),
  trainingMethodology: z.array(z.string()),
  trainingTools: z.array(z.string()),
  trainingEvaluation: z.array(z.string()),
});

export type ProposalNarrative = z.infer<typeof proposalNarrativeSchema>;
