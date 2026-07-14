import type {
  TrainingPackageInput,
  TrainingPackageOutputs,
} from "@/features/training-packages";
import {
  adaptiveGrowthRecommendationsOutputSchema,
  deliveryDraftOutputSchema,
  followUpOutputSchema,
  improvementOpportunityOutputSchema,
  offerReplicationOutputSchema,
  offerMutationOutputSchema,
  proposalAgentOutputSchema,
  qaReviewOutputSchema,
  textOutputSchema,
  trainingPackageOutputSchema,
  type JsonSchema,
} from "@/lib/brain/schemas";
import { masterAgent } from "@/lib/brain/agents/masterAgent";
import { dgProposalTemplateGuide } from "@/lib/brain/prompts/proposalTemplateGuide";
import type { ProposalContent } from "@/features/training-packages";

export const brainTaskTypes = [
  "course_package",
  "proposal",
  "pricing_narrative",
  "slide_outline",
  "workbook",
  "follow_up",
  "delivery_report",
  "qa_review",
  "improvement_suggestion",
  "offer_mutation",
  "offer_replication",
  "improvement_opportunity",
  "adaptive_growth_recommendations",
  "master_workflow",
  "market_sensing",
  "experiment_design",
  "fitness_evaluation",
  "selection_recommendation",
  "expansion_strategy",
  "learning_genome",
  "extinction_recommendation",
] as const;

export type BrainTaskType = (typeof brainTaskTypes)[number];

export type BrainMode = "openai";

export type BrainAgentDefinition<TInput = unknown, TOutput = unknown> = {
  taskType: BrainTaskType;
  name: string;
  role: string;
  instructions: string;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
};

export type TextAgentOutput = {
  content: string;
};

export type CoursePackageBrainInput = TrainingPackageInput & {
  pricingSummary?: string;
};

export type ProposalAgentOutput = {
  proposalContent: ProposalContent;
};

export type QaReviewInput = {
  packageContent: string;
  client: string;
  audience: string;
  context: string;
};

export type QaReviewOutput = {
  score: number;
  strengths: string[];
  weaknesses: string[];
  missingSections: string[];
  risks: string[];
  recommendedImprovements: string[];
  clientReadiness: "low" | "medium" | "high";
};

export const mutationStrategies = [
  "Audience mutation",
  "Sector mutation",
  "Format mutation",
  "Pricing mutation",
  "Pain-point mutation",
  "Duration mutation",
  "Delivery-channel mutation",
  "Outcome-promise mutation",
  "Random creative mutation",
] as const;

export type MutationStrategy = (typeof mutationStrategies)[number];

export type OfferMutationInput = {
  sourceIdea: string;
  signalTitle?: string;
  signalDescription?: string;
  sector?: string;
  audience?: string;
  desiredFormat?: string;
  constraints?: string;
  numberOfVariants?: number;
  mutationStrategy?: MutationStrategy;
  knowledgeContext?: string;
};

export type OfferMutationVariant = {
  title: string;
  target_audience: string;
  sector: string;
  format: string;
  duration: string;
  promise: string;
  pain_point: string;
  why_now: string;
  test_method: string;
  suggested_price_range: string;
  expected_buying_trigger: string;
  risk: string;
  confidence_score: number;
};

export type OfferMutationOutput = {
  variants: OfferMutationVariant[];
  recommended_top_3: string[];
  rationale: string;
};

export type OfferReplicationInput = {
  offer: Record<string, unknown>;
  selectionDecision: Record<string, unknown>;
  experiment?: Record<string, unknown> | null;
  metrics?: Record<string, unknown> | null;
  packageContent?: Record<string, unknown> | null;
  feedback?: string;
  includePackageAssets?: boolean;
  includeSalesAssets?: boolean;
  includeDeliveryAssets?: boolean;
};

export type ReplicationGenomeItemDraft = {
  title: string;
  type: string;
  content: string;
  confidence_score: number;
};

export type OfferReplicationOutput = {
  replication_summary: string;
  reusable_training_template: string;
  proposal_template: string;
  pricing_note: string;
  sales_message: string;
  delivery_checklist: string[];
  learning_genome_items: ReplicationGenomeItemDraft[];
  recommended_expansion_paths: string[];
};

export type ImprovementOpportunityInput = {
  sourceType: string;
  sourceId?: string | null;
  sourceSummary: string;
  context?: string;
  currentAppState?: string;
};

export type ImprovementOpportunityOutput = {
  title: string;
  description: string;
  category: string;
  priority: number;
  rationale: string;
  suggested_files_modules: string[];
  acceptance_criteria: string[];
  codex_prompt: string;
};

export type AdaptiveGrowthRecommendationsInput = {
  reportSummary: string;
  availableData: Record<string, unknown>;
};

export type AdaptiveGrowthRecommendationsOutput = {
  what_to_test_next: string[];
  what_to_kill: string[];
  what_to_scale: string[];
  what_to_replicate: string[];
  what_to_learn: string[];
  what_codex_should_improve_next: string[];
  uncertainty_notes: string[];
};

const genericInputSchema: JsonSchema = {
  type: "object",
  properties: {},
};

const coursePackageInputSchema: JsonSchema = {
  type: "object",
  required: ["courseTitle", "audience", "duration", "client", "promise"],
  properties: {
    courseTitle: { type: "string" },
    audience: { type: "string" },
    duration: { type: "string" },
    client: { type: "string" },
    promise: { type: "string" },
    context: { type: "string" },
    tone: { type: "string" },
    proposalBrief: {
      type: "object",
      properties: {
        coverHeading: { type: "string" },
        coverSubtitle: { type: "string" },
        certificationLabel: { type: "string" },
        clientBackground: { type: "string" },
        trainingNeed: { type: "string" },
        objectives: { type: "string" },
        expectedLearningOutcomes: { type: "string" },
        contentPriorities: { type: "string" },
        whoShouldAttend: { type: "string" },
        methodology: { type: "string" },
        trainingTools: { type: "string" },
        evaluationApproach: { type: "string" },
        scheduleDate: { type: "string" },
        scheduleTime: { type: "string" },
        scheduleVenue: { type: "string" },
        trainerId: { type: "string" },
        trainerImageUrl: { type: "string" },
        trainerName: { type: "string" },
        trainerTitle: { type: "string" },
        trainerBio: { type: "string" },
        trainerExperience: { type: "string" },
        trainerQualifications: { type: "string" },
        includedItems: { type: "string" },
        clientResponsibilities: { type: "string" },
        billingArrangement: { type: "string" },
        paymentInstructions: { type: "string" },
        vatStatus: { type: "string" },
        acceptanceDeadline: { type: "string" },
        proposalDate: { type: "string" },
        signatoryName: { type: "string" },
        signatoryTitle: { type: "string" },
      },
    },
  },
};

const qaInputSchema: JsonSchema = {
  type: "object",
  required: ["packageContent", "client", "audience", "context"],
  properties: {
    packageContent: { type: "string" },
    client: { type: "string" },
    audience: { type: "string" },
    context: { type: "string" },
  },
};

const offerMutationInputSchema: JsonSchema = {
  type: "object",
  required: ["sourceIdea"],
  properties: {
    sourceIdea: { type: "string" },
    signalTitle: { type: "string" },
    signalDescription: { type: "string" },
    sector: { type: "string" },
    audience: { type: "string" },
    desiredFormat: { type: "string" },
    constraints: { type: "string" },
    numberOfVariants: { type: "integer", minimum: 1, maximum: 20 },
    mutationStrategy: { type: "string" },
    knowledgeContext: { type: "string" },
  },
};

const offerReplicationInputSchema: JsonSchema = {
  type: "object",
  required: ["offer", "selectionDecision"],
  properties: {
    offer: { type: "object", properties: {} },
    selectionDecision: { type: "object", properties: {} },
    experiment: { type: "object", properties: {} },
    metrics: { type: "object", properties: {} },
    packageContent: { type: "object", properties: {} },
    feedback: { type: "string" },
    includePackageAssets: { type: "boolean" },
    includeSalesAssets: { type: "boolean" },
    includeDeliveryAssets: { type: "boolean" },
  },
};

const improvementOpportunityInputSchema: JsonSchema = {
  type: "object",
  required: ["sourceType", "sourceSummary"],
  properties: {
    sourceType: { type: "string" },
    sourceId: { type: "string" },
    sourceSummary: { type: "string" },
    context: { type: "string" },
    currentAppState: { type: "string" },
  },
};

const adaptiveGrowthRecommendationsInputSchema: JsonSchema = {
  type: "object",
  required: ["reportSummary", "availableData"],
  properties: {
    reportSummary: { type: "string" },
    availableData: { type: "object", properties: {} },
  },
};

export const chiefBrainAgent: BrainAgentDefinition = {
  taskType: "improvement_suggestion",
  name: "chiefBrainAgent",
  role: "DG Academy capability factory brain",
  instructions:
    "Route work to the right specialist, preserve deterministic business logic, and recommend small practical improvements.",
  inputSchema: genericInputSchema,
  outputSchema: textOutputSchema,
};

export const courseArchitectAgent: BrainAgentDefinition<
  CoursePackageBrainInput,
  TrainingPackageOutputs
> = {
  taskType: "course_package",
  name: "courseArchitectAgent",
  role: "Senior training product architect",
  instructions: [
    "Create a focused DG Academy training package with only two outputs: syllabus and proposal.",
    "Use deterministic pricing facts only when they are supplied; never invent pricing, discounts, taxes, costs, or margins.",
    "Make the syllabus complete and timed.",
    "Make proposalContent client-ready using the DG Academy proposal template. Markdown preview is generated by code from proposalContent.",
    dgProposalTemplateGuide,
  ].join("\n\n"),
  inputSchema: coursePackageInputSchema,
  outputSchema: trainingPackageOutputSchema,
};

export const proposalAgent: BrainAgentDefinition = {
  taskType: "proposal",
  name: "proposalAgent",
  role: "Corporate training proposal writer",
  instructions: [
    "Write client-ready proposal language for practical DG Academy business training.",
    "Avoid unsupported guarantees and keep the language executive-friendly, practical, and commercially careful.",
    "Use the supplied syllabus for content alignment and the supplied deterministic pricing summary for the Professional Fee section.",
    "Return only proposalContent. Do not return markdown prose as the source of truth.",
    dgProposalTemplateGuide,
  ].join("\n\n"),
  inputSchema: genericInputSchema,
  outputSchema: proposalAgentOutputSchema,
};

export const pricingNarrativeAgent: BrainAgentDefinition = {
  taskType: "pricing_narrative",
  name: "pricingNarrativeAgent",
  role: "Commercial pricing narrative specialist",
  instructions:
    "Explain deterministic pricing outputs in client-facing terms. Never change or invent numbers.",
  inputSchema: genericInputSchema,
  outputSchema: textOutputSchema,
};

export const slideAgent: BrainAgentDefinition = {
  taskType: "slide_outline",
  name: "slideAgent",
  role: "Executive slide deck architect",
  instructions:
    "Create clear slide outlines with agenda, section flow, executive framing, and facilitator cues.",
  inputSchema: genericInputSchema,
  outputSchema: textOutputSchema,
};

export const workbookAgent: BrainAgentDefinition = {
  taskType: "workbook",
  name: "workbookAgent",
  role: "Participant workbook designer",
  instructions:
    "Create practical workbook activities, reflection prompts, and templates for business training participants.",
  inputSchema: genericInputSchema,
  outputSchema: textOutputSchema,
};

export const qaAgent: BrainAgentDefinition<QaReviewInput, QaReviewOutput> = {
  taskType: "qa_review",
  name: "qaAgent",
  role: "Training package QA reviewer",
  instructions:
    "Review DG Academy package content for client readiness, completeness, risks, missing sections, and practical improvement opportunities. Return structured JSON only.",
  inputSchema: qaInputSchema,
  outputSchema: qaReviewOutputSchema,
};

export const salesFollowUpAgent: BrainAgentDefinition = {
  taskType: "follow_up",
  name: "salesFollowUpAgent",
  role: "Corporate training sales follow-up assistant",
  instructions:
    "Draft follow-up email and short message text only. Never imply a message has been sent.",
  inputSchema: genericInputSchema,
  outputSchema: followUpOutputSchema,
};

export const deliveryAgent: BrainAgentDefinition = {
  taskType: "delivery_report",
  name: "deliveryAgent",
  role: "Training delivery and reporting assistant",
  instructions:
    "Draft practical delivery checklists, participant messages, agendas, and post-training reports. Do not invent evaluation evidence.",
  inputSchema: genericInputSchema,
  outputSchema: deliveryDraftOutputSchema,
};

export const improvementAgent: BrainAgentDefinition = {
  taskType: "improvement_suggestion",
  name: "improvementAgent",
  role: "Improvement loop agent",
  instructions:
    "Turn QA findings and usage observations into small, testable product improvements.",
  inputSchema: genericInputSchema,
  outputSchema: textOutputSchema,
};

export const mutationAgent: BrainAgentDefinition<
  OfferMutationInput,
  OfferMutationOutput
> = {
  taskType: "offer_mutation",
  name: "mutationAgent",
  role: "Adaptive Growth offer mutation strategist",
  instructions:
    "Generate multiple small, testable DG Academy offer variants from a market signal, client need, sector trend, or base idea. Create practical business training/product offers with clear pain points, buying triggers, test methods, risks, and confidence scores. Use retrieved DG Academy knowledge as context, but do not expose internal-only notes in client-facing language.",
  inputSchema: offerMutationInputSchema,
  outputSchema: offerMutationOutputSchema,
};

export const replicationAgent: BrainAgentDefinition<
  OfferReplicationInput,
  OfferReplicationOutput
> = {
  taskType: "offer_replication",
  name: "replicationAgent",
  role: "Adaptive Growth learning genome strategist",
  instructions:
    "Extract reusable business DNA from winning DG Academy offers. Identify what made the offer work, the best audience, strongest promise, pricing logic, delivery format, sales message, repeatable training structure, risks, and expansion paths. Use only provided evidence; do not invent metrics or client outcomes. Keep internal knowledge internal by default.",
  inputSchema: offerReplicationInputSchema,
  outputSchema: offerReplicationOutputSchema,
};

export const improvementOpportunityAgent: BrainAgentDefinition<
  ImprovementOpportunityInput,
  ImprovementOpportunityOutput
> = {
  taskType: "improvement_opportunity",
  name: "improvementOpportunityAgent",
  role: "Business and software improvement translator",
  instructions:
    "Convert feedback, loop results, eval failures, and growth lessons into one structured Codex-ready improvement opportunity. Keep it small, testable, and safety-aware. Do not approve, merge, deploy, or execute code changes.",
  inputSchema: improvementOpportunityInputSchema,
  outputSchema: improvementOpportunityOutputSchema,
};

export const adaptiveGrowthRecommendationsAgent: BrainAgentDefinition<
  AdaptiveGrowthRecommendationsInput,
  AdaptiveGrowthRecommendationsOutput
> = {
  taskType: "adaptive_growth_recommendations",
  name: "adaptiveGrowthRecommendationsAgent",
  role: "Executive adaptive growth strategist",
  instructions:
    "Generate executive recommendations for DG Academy's Adaptive Growth OS. Reference only the supplied dashboard data. Clearly label uncertainty and missing evidence. Do not invent metrics, client outcomes, revenue, margins, approvals, or experiment results. Separate what to test, kill, scale, replicate, learn, and improve in Codex.",
  inputSchema: adaptiveGrowthRecommendationsInputSchema,
  outputSchema: adaptiveGrowthRecommendationsOutputSchema,
};

function adaptiveTextAgent({
  taskType,
  name,
  role,
  instructions,
}: {
  taskType: BrainTaskType;
  name: string;
  role: string;
  instructions: string;
}): BrainAgentDefinition<Record<string, unknown>, TextAgentOutput> {
  return {
    taskType,
    name,
    role,
    instructions,
    inputSchema: genericInputSchema,
    outputSchema: textOutputSchema,
  };
}

export const marketSensingAgent = adaptiveTextAgent({
  taskType: "market_sensing",
  name: "marketSensingAgent",
  role: "Adaptive Growth market sensing specialist",
  instructions:
    "Summarize market signals from client notes, training feedback, opportunities, and knowledge items. Treat signals as hypotheses, not truth.",
});

export const experimentDesignerAgent = adaptiveTextAgent({
  taskType: "experiment_design",
  name: "experimentDesignerAgent",
  role: "Offer experiment designer",
  instructions:
    "Design small, testable experiments for DG Academy offers. Recommend test method, channel, success criteria, owner, and evidence to collect.",
});

export const fitnessEvaluatorAgent = adaptiveTextAgent({
  taskType: "fitness_evaluation",
  name: "fitnessEvaluatorAgent",
  role: "Fitness evidence interpreter",
  instructions:
    "Explain deterministic fitness scores from provided metrics. Never invent market pull, revenue, margin, or conversion data.",
});

export const selectionAgent = adaptiveTextAgent({
  taskType: "selection_recommendation",
  name: "selectionAgent",
  role: "Adaptive selection strategist",
  instructions:
    "Recommend Scale, Iterate, Park, Kill, Bundle, Partner, or Productize using deterministic fitness evidence. Status changes require approval.",
});

export const expansionAgent = adaptiveTextAgent({
  taskType: "expansion_strategy",
  name: "expansionAgent",
  role: "Expansion path strategist",
  instructions:
    "Suggest new sectors, audiences, formats, partner paths, and productization paths from winning patterns only.",
});

export const learningGenomeAgent = adaptiveTextAgent({
  taskType: "learning_genome",
  name: "learningGenomeAgent",
  role: "Learning genome curator",
  instructions:
    "Turn proven and failed patterns into searchable internal genome items. Keep client details anonymized and internal by default.",
});

export const extinctionAgent = adaptiveTextAgent({
  taskType: "extinction_recommendation",
  name: "extinctionAgent",
  role: "Weak-offer extinction specialist",
  instructions:
    "Recommend when to kill or park weak offers based on evidence. Never change status directly; create approval requests for risky changes.",
});

export const brainAgents = [
  masterAgent,
  chiefBrainAgent,
  courseArchitectAgent,
  proposalAgent,
  pricingNarrativeAgent,
  slideAgent,
  workbookAgent,
  qaAgent,
  salesFollowUpAgent,
  deliveryAgent,
  improvementAgent,
  mutationAgent,
  replicationAgent,
  improvementOpportunityAgent,
  adaptiveGrowthRecommendationsAgent,
  marketSensingAgent,
  experimentDesignerAgent,
  fitnessEvaluatorAgent,
  selectionAgent,
  expansionAgent,
  learningGenomeAgent,
  extinctionAgent,
];

export function buildCoursePackagePrompt(input: CoursePackageBrainInput) {
  return {
    task: "Create a complete sellable training package.",
    input,
    deterministicPricing: {
      summary: input.pricingSummary,
    },
    requirements: [
      "Use markdown for each output.",
      "Make the syllabus complete and timed.",
      "Make the proposal client-ready and executive using the DG Academy proposal template.",
      "Include the Professional Fee section inside proposal using only deterministic pricing numbers supplied.",
      "Do not include internal profit, target margin, or direct cost details in proposal.",
    ],
    proposalTemplate: dgProposalTemplateGuide,
  };
}
