import { z } from "zod";

import type {
  DataDiscoveryBrainOutput,
  SystemProposalBrainOutput,
} from "@/features/intelligent-system-proposals";
import type { SyllabusProposalBrainOutput } from "@/features/syllabus-imports";
import { proposalNarrativeSchema } from "@/features/training-packages/domain/proposal-narrative";
import {
  slideDeckIconKeys,
  slideDeckLayouts,
  type SlideDeckBrainOutput,
} from "@/features/training-packages/export/slide-deck-plan";
import type {
  FacilitatorGuideBrainOutput,
  PromptLibraryBrainOutput,
  WorkbookBrainOutput,
} from "@/features/training-packages/export/material-document-plans";

export type JsonSchema = Record<string, unknown>;
export type BrainOutputSchema<TOutput = unknown> = z.ZodType<TOutput>;

export function brainSchemaToJsonSchema(schema: BrainOutputSchema): JsonSchema {
  const { $schema: _dialect, ...jsonSchema } = z.toJSONSchema(schema, {
    target: "draft-2020-12",
  });
  return jsonSchema;
}

export function formatBrainSchemaErrors(error: z.ZodError) {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `.${issue.path.join(".")}` : "";
    return `output${path}: ${issue.message}`;
  });
}

const stringArraySchema = z.array(z.string());
const requiredTextSchema = z.string().trim().min(1);
const requiredTextArraySchema = z.array(requiredTextSchema).min(1);
const confidenceSchema = z.enum(["low", "medium", "high"]);

export const qualityChecklistItemSchema = z.strictObject({
  category: z.string(),
  item: z.string(),
  status: z.enum(["ready", "review"]),
});

const analystFindingSchema = z.strictObject({
  title: z.string(),
  detail: z.string(),
  evidence: z.string(),
  severity: confidenceSchema,
});

const systemOpportunitySchema = z.strictObject({
  title: z.string(),
  problem: z.string(),
  evidence: z.string(),
  capability: z.string(),
  expectedValue: z.string(),
  confidence: confidenceSchema,
});

export const dataDiscoveryOutputSchema = z.strictObject({
  analystReview: z.strictObject({
    executiveSummary: z.string(),
    detectedProcesses: stringArraySchema,
    dataQualityFindings: z.array(analystFindingSchema),
    candidateKpis: stringArraySchema,
    opportunities: z.array(systemOpportunitySchema),
    risks: stringArraySchema,
    questions: stringArraySchema,
    userNotes: z.string(),
  }),
}) satisfies BrainOutputSchema<DataDiscoveryBrainOutput>;

const systemModuleSchema = z.strictObject({
  name: z.string(),
  purpose: z.string(),
  inputs: stringArraySchema,
  outputs: stringArraySchema,
  userValue: z.string(),
});

const implementationPhaseSchema = z.strictObject({
  name: z.string(),
  duration: z.string(),
  activities: stringArraySchema,
  deliverables: stringArraySchema,
});

export const intelligentSystemProposalOutputSchema = z.strictObject({
  proposalContent: z.strictObject({
    coverHeading: z.string(),
    solutionTitle: z.string(),
    client: z.string(),
    executiveSummary: stringArraySchema,
    clientSituation: stringArraySchema,
    evidenceFindings: stringArraySchema,
    objectives: stringArraySchema,
    recommendedSystem: stringArraySchema,
    modules: z.array(systemModuleSchema),
    userWorkflows: stringArraySchema,
    dashboardsAndAi: stringArraySchema,
    dataFlowAndIntegrations: stringArraySchema,
    securityAndGovernance: stringArraySchema,
    implementationPhases: z.array(implementationPhaseSchema),
    deliverables: stringArraySchema,
    clientResponsibilities: stringArraySchema,
    assumptions: stringArraySchema,
    risks: stringArraySchema,
    nextSteps: stringArraySchema,
  }),
}) satisfies BrainOutputSchema<SystemProposalBrainOutput>;

export const trainingPackageOutputSchema = z.strictObject({
  proposalNarrative: proposalNarrativeSchema,
});

export const syllabusProposalOutputSchema = z.strictObject({
  mapping: z.strictObject({
    courseTitle: z.string().trim().min(1),
    clientName: z.string().min(1).nullable(),
    audience: z.string(),
    participantCount: z.number().int().positive().nullable(),
    duration: z.string(),
    programGoal: z.string(),
    context: z.string(),
    trainerNames: stringArraySchema,
    trainerIdentification: z.enum(["Confirmed", "Unclear", "Missing"]),
    proposalBrief: z.strictObject({
      coverSubtitle: z.string(),
      certificationLabel: z.string(),
      clientBackground: z.string(),
      trainingNeed: z.string(),
      objectives: z.string(),
      expectedLearningOutcomes: z.string(),
      contentPriorities: z.string(),
      whoShouldAttend: z.string(),
      methodology: z.string(),
      trainingTools: z.string(),
      evaluationApproach: z.string(),
      scheduleDate: z.string(),
      scheduleTime: z.string(),
      scheduleVenue: z.string(),
    }),
    proposalNarrative: proposalNarrativeSchema,
  }),
}) satisfies BrainOutputSchema<SyllabusProposalBrainOutput>;

export const proposalAgentOutputSchema = trainingPackageOutputSchema;

export const textOutputSchema = z.strictObject({
  content: z.string(),
});

const slideDeckVisualItemSchema = z.strictObject({
  icon: z.enum(slideDeckIconKeys),
  label: requiredTextSchema,
  description: requiredTextSchema,
  value: z.number(),
});

const slideDeckSlideSchema = z.strictObject({
  layout: z.enum(slideDeckLayouts),
  title: requiredTextSchema,
  intro: z.string(),
  statement: z.string(),
  bullets: stringArraySchema,
  leftTitle: z.string(),
  leftItems: stringArraySchema,
  rightTitle: z.string(),
  rightItems: stringArraySchema,
  visualItems: z.array(slideDeckVisualItemSchema),
  visualCenter: z.string(),
  visualXAxis: z.string(),
  visualYAxis: z.string(),
  visualUnit: z.string(),
  visualSource: z.string(),
  speakerNotes: z.string(),
});

function validatePracticalSlideModules(
  slides: z.infer<typeof slideDeckSlideSchema>[],
  context: z.RefinementCtx,
) {
  const sectionIndexes = slides
    .map((slide, index) => (slide.layout === "section" ? index : -1))
    .filter((index) => index >= 0);

  if (!sectionIndexes.length) {
    context.addIssue({
      code: "custom",
      message: "Use section slides to identify the major learning modules.",
    });
    return;
  }

  slides.forEach((slide, index) => {
    if (slide.layout === "demo") {
      if (!slide.intro.trim() || !slide.leftItems.length || !slide.rightItems.length) {
        context.addIssue({
          code: "custom",
          path: [index],
          message: "Demo slides require a scenario, demonstration input, and run/observe/verify content.",
        });
      }
      if (!slide.speakerNotes.trim()) {
        context.addIssue({
          code: "custom",
          path: [index, "speakerNotes"],
          message: "Demo slides require facilitator notes.",
        });
      }
      if (slide.intro.length > 280) {
        context.addIssue({
          code: "custom",
          path: [index, "intro"],
          message: "Demo scenarios must fit within 280 characters.",
        });
      }
      if (slide.leftItems.join(" ").length > 760) {
        context.addIssue({
          code: "custom",
          path: [index, "leftItems"],
          message: "Demo input content must fit within 760 characters.",
        });
      }
      if (slide.rightItems.join(" ").length > 760) {
        context.addIssue({
          code: "custom",
          path: [index, "rightItems"],
          message: "Demo run and verification content must fit within 760 characters.",
        });
      }
    }

    if (slide.layout === "practice") {
      if (!slide.bullets.some((item) => /^Time:/i.test(item.trim()))) {
        context.addIssue({
          code: "custom",
          path: [index, "bullets"],
          message: "Practice slides require a visible Time bullet.",
        });
      }
      if (!slide.bullets.some((item) => /^Deliverable:/i.test(item.trim()))) {
        context.addIssue({
          code: "custom",
          path: [index, "bullets"],
          message: "Practice slides require a visible Deliverable bullet.",
        });
      }
      if (!slide.bullets.some((item) => /^Debrief:/i.test(item.trim()))) {
        context.addIssue({
          code: "custom",
          path: [index, "bullets"],
          message: "Practice slides require a visible Debrief bullet.",
        });
      }
      if (!slide.bullets.some((item) => /^Success criteria:/i.test(item.trim()))) {
        context.addIssue({
          code: "custom",
          path: [index, "bullets"],
          message: "Practice slides require visible Success criteria.",
        });
      }
    }

    if (slide.layout === "case-lab") {
      if (!slide.intro.trim() || !slide.leftItems.length || !slide.rightItems.length) {
        context.addIssue({
          code: "custom",
          path: [index],
          message: "Case labs require a scenario, available evidence, and participant tasks.",
        });
      }
      if (!slide.rightItems.some((item) => /^Deliverable:/i.test(item.trim()))) {
        context.addIssue({
          code: "custom",
          path: [index, "rightItems"],
          message: "Case labs require a visible Deliverable item.",
        });
      }
      if (!slide.rightItems.some((item) => /^Review:/i.test(item.trim()))) {
        context.addIssue({
          code: "custom",
          path: [index, "rightItems"],
          message: "Case labs require visible Review criteria.",
        });
      }
    }
  });

  sectionIndexes.forEach((sectionIndex, moduleIndex) => {
    const endIndex = sectionIndexes[moduleIndex + 1] ?? slides.length;
    const moduleSlides = slides.slice(sectionIndex + 1, endIndex);
    const moduleTitle = slides[sectionIndex].title;
    const demoOffsets = moduleSlides
      .map((slide, index) => (slide.layout === "demo" ? index : -1))
      .filter((index) => index >= 0);
    const hasPracticalApplication = moduleSlides.some((slide) =>
      ["demo", "practice", "case-lab"].includes(slide.layout)
    );

    if (!hasPracticalApplication) {
      context.addIssue({
        code: "custom",
        path: [sectionIndex],
        message: `Module '${moduleTitle}' requires demonstration, participant practice, or a case lab.`,
      });
    }

    demoOffsets.forEach((demoOffset) => {
      const followedByPractice = moduleSlides
        .slice(demoOffset + 1, demoOffset + 3)
        .some((slide) => slide.layout === "practice");
      if (!followedByPractice) {
        context.addIssue({
          code: "custom",
          path: [sectionIndex + demoOffset + 1],
          message: `Every demonstration in '${moduleTitle}' requires related participant practice within the next two slides.`,
        });
      }
    });
  });

  const teachingSlides = slides.filter(
    (slide) => !["section", "closing"].includes(slide.layout),
  );
  const practicalSlides = teachingSlides.filter((slide) =>
    ["demo", "practice", "case-lab"].includes(slide.layout)
  );
  if (
    teachingSlides.length >= 6 &&
    practicalSlides.length / teachingSlides.length < 0.35
  ) {
    context.addIssue({
      code: "custom",
      message: "At least 35 percent of teaching slides must be demonstrations, practices, or case labs.",
    });
  }

  if (
    teachingSlides.length >= 18 &&
    !teachingSlides.some((slide) => slide.layout === "case-lab")
  ) {
    context.addIssue({
      code: "custom",
      message: "Long training decks require at least one integrated case lab.",
    });
  }
}

export const slideDeckOutputSchema = z.strictObject({
  deck: z.strictObject({
    version: z.literal(2),
    title: requiredTextSchema,
    slides: z.array(slideDeckSlideSchema).min(1).superRefine(validatePracticalSlideModules),
  }),
}) satisfies BrainOutputSchema<SlideDeckBrainOutput>;

const workbookActivitySchema = z.strictObject({
  title: requiredTextSchema,
  purpose: requiredTextSchema,
  instructions: requiredTextArraySchema,
  reflectionQuestions: requiredTextArraySchema,
  expectedOutput: requiredTextSchema,
  responseLines: z.number().int().min(3).max(8),
});

export const workbookOutputSchema = z.strictObject({
  workbook: z.strictObject({
    version: z.literal(1),
    title: requiredTextSchema,
    welcome: requiredTextSchema,
    howToUse: requiredTextArraySchema,
    modules: z.array(
      z.strictObject({
        title: requiredTextSchema,
        introduction: requiredTextSchema,
        keyPoints: requiredTextArraySchema,
        activities: z.array(workbookActivitySchema).min(1),
        applicationPrompt: requiredTextSchema,
      }),
    ).min(1),
    actionPlan: z.strictObject({
      introduction: requiredTextSchema,
      prompts: requiredTextArraySchema,
      responseLines: z.number().int().min(3).max(8),
    }),
  }),
}) satisfies BrainOutputSchema<WorkbookBrainOutput>;

export const facilitatorGuideOutputSchema = z.strictObject({
  guide: z.strictObject({
    version: z.literal(1),
    title: requiredTextSchema,
    purpose: requiredTextSchema,
    trainerPreparation: requiredTextArraySchema,
    agenda: z.array(
      z.strictObject({
        timing: requiredTextSchema,
        duration: requiredTextSchema,
        session: requiredTextSchema,
        objective: requiredTextSchema,
        method: requiredTextSchema,
      }),
    ).min(1),
    sections: z.array(
      z.strictObject({
        title: requiredTextSchema,
        timing: requiredTextSchema,
        objective: requiredTextSchema,
        keyMessages: requiredTextArraySchema,
        runSteps: requiredTextArraySchema,
        debriefQuestions: requiredTextArraySchema,
        expectedOutputs: requiredTextArraySchema,
        transition: requiredTextSchema,
      }),
    ).min(1),
    materialsChecklist: requiredTextArraySchema,
    likelyQuestions: z.array(
      z.strictObject({ question: requiredTextSchema, answer: requiredTextSchema }),
    ).min(1),
    contingencies: z.array(
      z.strictObject({ situation: requiredTextSchema, response: requiredTextSchema }),
    ).min(1),
    closingChecklist: requiredTextArraySchema,
  }),
}) satisfies BrainOutputSchema<FacilitatorGuideBrainOutput>;

export const promptLibraryOutputSchema = z.strictObject({
  library: z.strictObject({
    version: z.literal(1),
    title: requiredTextSchema,
    introduction: requiredTextSchema,
    usageGuidance: requiredTextArraySchema,
    sections: z.array(
      z.strictObject({
        title: requiredTextSchema,
        description: requiredTextSchema,
        prompts: z.array(
          z.strictObject({
            title: requiredTextSchema,
            whenToUse: requiredTextSchema,
            prompt: requiredTextSchema,
            adaptationTips: requiredTextArraySchema,
            reviewChecks: requiredTextArraySchema,
          }),
        ).min(1),
      }),
    ).min(1),
    responsibleUseChecks: requiredTextArraySchema,
  }),
}) satisfies BrainOutputSchema<PromptLibraryBrainOutput>;

export const evaluationQuestionsOutputSchema = z.strictObject({
  questions: z.array(
    z.strictObject({
      type: z.enum(["rating", "choice", "text"]),
      label: z.string(),
      options: stringArraySchema,
      required: z.boolean(),
    }),
  ),
});

export const followUpOutputSchema = z.strictObject({
  followUpEmail: z.string(),
  shortMessage: z.string(),
  suggestedNextStep: z.string(),
});

export const deliveryDraftOutputSchema = z.strictObject({
  title: z.string(),
  body: z.string(),
  suggestedNextStep: z.string(),
});

export const qaReviewOutputSchema = z.strictObject({
  score: z.number().int().min(1).max(100),
  strengths: stringArraySchema,
  weaknesses: stringArraySchema,
  missingSections: stringArraySchema,
  risks: stringArraySchema,
  recommendedImprovements: stringArraySchema,
  clientReadiness: confidenceSchema,
});

export const suggestedPromptChangeSchema = z.strictObject({
  targetAgent: z.string(),
  currentPromptSummary: z.string(),
  suggestedChange: z.string(),
  reason: z.string(),
});

export const outputEvaluationResultSchema = z.strictObject({
  score: z.number().int().min(1).max(100),
  strengths: stringArraySchema,
  weaknesses: stringArraySchema,
  risks: stringArraySchema,
  improvementSuggestions: stringArraySchema,
  suggestedPromptChanges: z.array(suggestedPromptChangeSchema),
});

export const offerMutationVariantSchema = z.strictObject({
  title: z.string(),
  target_audience: z.string(),
  sector: z.string(),
  format: z.string(),
  duration: z.string(),
  promise: z.string(),
  pain_point: z.string(),
  why_now: z.string(),
  test_method: z.string(),
  suggested_price_range: z.string(),
  expected_buying_trigger: z.string(),
  risk: z.string(),
  confidence_score: z.number().int().min(1).max(100),
});

export const offerMutationOutputSchema = z.strictObject({
  variants: z.array(offerMutationVariantSchema),
  recommended_top_3: stringArraySchema,
  rationale: z.string(),
});

export const replicationGenomeItemSchema = z.strictObject({
  title: z.string(),
  type: z.string(),
  content: z.string(),
  confidence_score: z.number().int().min(1).max(100),
});

export const offerReplicationOutputSchema = z.strictObject({
  replication_summary: z.string(),
  reusable_training_template: z.string(),
  proposal_template: z.string(),
  pricing_note: z.string(),
  sales_message: z.string(),
  delivery_checklist: stringArraySchema,
  learning_genome_items: z.array(replicationGenomeItemSchema),
  recommended_expansion_paths: stringArraySchema,
});

export const improvementOpportunityOutputSchema = z.strictObject({
  title: z.string(),
  description: z.string(),
  category: z.string(),
  priority: z.number().int().min(1).max(5),
  rationale: z.string(),
  suggested_files_modules: stringArraySchema,
  acceptance_criteria: stringArraySchema,
  codex_prompt: z.string(),
});

export const adaptiveGrowthRecommendationsOutputSchema = z.strictObject({
  what_to_test_next: stringArraySchema,
  what_to_kill: stringArraySchema,
  what_to_scale: stringArraySchema,
  what_to_replicate: stringArraySchema,
  what_to_learn: stringArraySchema,
  what_codex_should_improve_next: stringArraySchema,
  uncertainty_notes: stringArraySchema,
});

export const masterAgentOutputSchema = z.strictObject({
  workflow: z.enum([
    "create_training_package",
    "generate_proposal",
    "generate_pricing_narrative",
    "create_offer_variants",
    "evaluate_offer_fitness",
    "replicate_winning_offer",
    "run_adaptive_loop",
    "create_codex_improvement_task",
    "run_qa_review",
    "create_follow_up_draft",
    "create_delivery_report",
  ]),
  specialistAgents: stringArraySchema,
  deterministicTools: stringArraySchema,
  requiresApproval: z.boolean(),
  riskLevel: z.enum(["Low", "Medium", "High"]),
  nextStep: z.string(),
});

export type CoursePackageBrainOutput = z.infer<
  typeof trainingPackageOutputSchema
>;
export type TextAgentOutput = z.infer<typeof textOutputSchema>;
export type QaReviewOutput = z.infer<typeof qaReviewOutputSchema>;
export type EvaluationQuestionsBrainOutput = z.infer<
  typeof evaluationQuestionsOutputSchema
>;
export type OfferMutationVariant = z.infer<typeof offerMutationVariantSchema>;
export type OfferMutationOutput = z.infer<typeof offerMutationOutputSchema>;
export type ReplicationGenomeItemDraft = z.infer<
  typeof replicationGenomeItemSchema
>;
export type OfferReplicationOutput = z.infer<
  typeof offerReplicationOutputSchema
>;
export type ImprovementOpportunityOutput = z.infer<
  typeof improvementOpportunityOutputSchema
>;
export type AdaptiveGrowthRecommendationsOutput = z.infer<
  typeof adaptiveGrowthRecommendationsOutputSchema
>;
