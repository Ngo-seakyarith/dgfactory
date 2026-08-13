import type { TrainingPackageInput } from "@/features/training-packages";
import type { ProposalNarrativeBrief } from "@/features/training-packages";
import {
  adaptiveGrowthRecommendationsOutputSchema,
  solutionReviewOutputSchema,
  deliveryDraftOutputSchema,
  evaluationQuestionsOutputSchema,
  facilitatorGuideOutputSchema,
  followUpOutputSchema,
  improvementOpportunityOutputSchema,
  digitalSolutionProposalOutputSchema,
  offerReplicationOutputSchema,
  offerMutationOutputSchema,
  proposalAgentOutputSchema,
  promptLibraryOutputSchema,
  qaReviewOutputSchema,
  syllabusProposalOutputSchema,
  slideDeckOutputSchema,
  textOutputSchema,
  trainingPackageOutputSchema,
  workbookOutputSchema,
  type AdaptiveGrowthRecommendationsOutput,
  type BrainOutputSchema,
  type CoursePackageBrainOutput,
  type EvaluationQuestionsBrainOutput,
  type ImprovementOpportunityOutput,
  type JsonSchema,
  type OfferMutationOutput,
  type OfferMutationVariant,
  type OfferReplicationOutput,
  type QaReviewOutput,
  type TextAgentOutput,
} from "@/lib/brain/schemas";
import { masterAgent } from "@/lib/brain/agents/masterAgent";
import { dgProposalTemplateGuide } from "@/lib/brain/prompts/proposalTemplateGuide";
import {
  slideDeckGenerationRules,
  type SlideDeckBrainOutput,
} from "@/features/training-packages/export/slide-deck-plan";
import {
  facilitatorGuideGenerationRules,
  promptLibraryGenerationRules,
  workbookGenerationRules,
  type FacilitatorGuideBrainOutput,
  type PromptLibraryBrainOutput,
  type WorkbookBrainOutput,
} from "@/features/training-packages/export/material-document-plans";
import type {
  DigitalSolutionProposalBrainInput,
  DigitalSolutionProposalBrainOutput,
  SolutionReviewBrainInput,
  SolutionReviewBrainOutput,
} from "@/features/digital-solution-proposals";
import type {
  SyllabusProposalBrainInput,
  SyllabusProposalBrainOutput,
} from "@/features/syllabus-imports";

export const brainTaskTypes = [
  "course_package",
  "proposal",
  "pricing_narrative",
  "slide_outline",
  "workbook",
  "follow_up",
  "delivery_report",
  "evaluation_questions",
  "facilitator_guide",
  "prompt_library",
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
  "solution_review",
  "digital_solution_proposal",
  "syllabus_to_training_proposal",
] as const;

export type BrainTaskType = (typeof brainTaskTypes)[number];

export type BrainMode = "openai";

export type BrainAgentDefinition<TInput = unknown, TOutput = unknown> = {
  taskType: BrainTaskType;
  name: string;
  role: string;
  instructions: string;
  inputSchema: JsonSchema;
  outputSchema: BrainOutputSchema<TOutput>;
};

export type CoursePackageBrainInput = Omit<
  TrainingPackageInput,
  "proposalBrief"
> & {
  proposalBrief: ProposalNarrativeBrief;
};

export type ProposalAgentOutput = CoursePackageBrainOutput;

export type {
  AdaptiveGrowthRecommendationsOutput,
  EvaluationQuestionsBrainOutput,
  ImprovementOpportunityOutput,
  OfferMutationOutput,
  OfferMutationVariant,
  OfferReplicationOutput,
  QaReviewOutput,
  TextAgentOutput,
};

export type {
  DigitalSolutionProposalBrainInput,
  DigitalSolutionProposalBrainOutput,
  SolutionReviewBrainInput,
  SolutionReviewBrainOutput,
};

export type { SyllabusProposalBrainInput, SyllabusProposalBrainOutput };

export type QaReviewInput = {
  packageContent: string;
  client: string;
  audience: string;
  context: string;
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

export type ImprovementOpportunityInput = {
  sourceType: string;
  sourceId?: string | null;
  sourceSummary: string;
  context?: string;
  currentAppState?: string;
};

export type AdaptiveGrowthRecommendationsInput = {
  reportSummary: string;
  availableData: Record<string, unknown>;
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
        clientBackground: { type: "string" },
        trainingNeed: { type: "string" },
        objectives: { type: "string" },
        expectedLearningOutcomes: { type: "string" },
        contentPriorities: { type: "string" },
        whoShouldAttend: { type: "string" },
        methodology: { type: "string" },
        trainingTools: { type: "string" },
        evaluationApproach: { type: "string" },
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
  ProposalAgentOutput
> = {
  taskType: "course_package",
  name: "courseArchitectAgent",
  role: "Senior training product architect",
  instructions: [
    "Create the structured narrative sections for a DG Academy training proposal.",
    "Never generate trainer profiles, pricing, commercial terms, schedule facts, or signatory data.",
    "Make the training content complete, timed, and client-ready using the DG Academy proposal template.",
    "Application code combines proposalNarrative with deterministic proposal data and derives the proposal and syllabus previews.",
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
    "Use the supplied syllabus for content alignment. Do not generate commercial, trainer, schedule, or signatory fields.",
    "Return only proposalNarrative. Do not return markdown prose as the source of truth.",
    dgProposalTemplateGuide,
  ].join("\n\n"),
  inputSchema: genericInputSchema,
  outputSchema: proposalAgentOutputSchema,
};

export const solutionReviewAgent: BrainAgentDefinition<
  SolutionReviewBrainInput,
  SolutionReviewBrainOutput
> = {
  taskType: "solution_review",
  name: "solutionReviewAgent",
  role: "Senior business analyst and digital solution consultant",
  instructions: [
    "Review the supplied client brief and recommend an appropriate digital solution for the stated business problem.",
    "This task must work from the brief alone. Spreadsheet evidence is optional and may be null.",
    "When evidenceAnalysis is null, set evidenceBasis to Brief only and leave evidenceFindings empty. Never imply that files or raw data were reviewed.",
    "When evidenceAnalysis is present, use only its deterministic profiles and masked samples. Never reconstruct redacted values or invent metrics.",
    "Separate confirmed requirements, evidence, assumptions, risks, and unanswered client questions. Mark each recommended capability as Brief, Evidence, or Assumption.",
    "Cover users, workflows, interfaces, administration, integrations, security, delivery constraints, and success measures that are relevant to the selected solution type.",
    "Keep the result concrete and editable so a consultant can correct it before proposal generation.",
  ].join("\n\n"),
  inputSchema: { type: "object" },
  outputSchema: solutionReviewOutputSchema,
};

export const digitalSolutionProposalAgent: BrainAgentDefinition<
  DigitalSolutionProposalBrainInput,
  DigitalSolutionProposalBrainOutput
> = {
  taskType: "digital_solution_proposal",
  name: "digitalSolutionProposalAgent",
  role: "Digital solution architect and client proposal writer",
  instructions: [
    "Create a client-ready DG Academy proposal for the selected digital solution type, including websites, web applications, internal systems, portals, e-commerce, data systems, and AI-enabled systems.",
    "Use the supplied project brief and reviewed solution findings. Supporting data evidence is optional and may be null.",
    "Do not force dashboards, artificial intelligence, data pipelines, or automation into projects that do not need them.",
    "Clearly label assumptions, risks, and items requiring discovery. Do not promise results or claim the final architecture has already been validated.",
    "Recommend practical modules, user journeys, interfaces, administration, integrations, governance, implementation phases, deliverables, and next steps.",
    "Keep the complete proposal concise enough for approximately five to seven A4 pages including the cover and commercial section.",
    "Use four to six grouped solution modules and three to five concise points per section. Each point should normally be one or two sentences.",
    "Do not repeat the same requirement across the executive summary, situation, findings, solution, modules, deliverables, assumptions, and risks. Put each fact where it is most useful.",
    "Prioritize decision-useful scope over exhaustive technical narration. Detailed specifications belong in a later discovery or requirements document, not this proposal.",
    "Use commercial numbers only when they appear in commercialSummary. Never create prices, discounts, taxes, data volumes, or performance metrics that were not supplied.",
    "Only include implementation durations supported by the brief or clearly label them as proposed estimates requiring confirmation.",
    "Set coverHeading to Digital Solution Proposal, solutionTitle to projectTitle, and client to clientName.",
  ].join("\n\n"),
  inputSchema: { type: "object" },
  outputSchema: digitalSolutionProposalOutputSchema,
};

export const syllabusProposalAgent: BrainAgentDefinition<
  SyllabusProposalBrainInput,
  SyllabusProposalBrainOutput
> = {
  taskType: "syllabus_to_training_proposal",
  name: "syllabusProposalAgent",
  role: "External syllabus normalization and DG Academy proposal specialist",
  instructions: [
    "Normalize the complete external syllabus into the DG Academy proposal schema. Preserve its meaning, topic sequence, schedule, and level of detail.",
    "Client rule: return the organization receiving the training as clientName. New clients are valid. Return null only when the recipient is not present in the document.",
    "Participant rule: return participantCount only for one explicit participant, learner, attendee, staff, pax, class-size, or cohort count, written in digits or words. Check prose and tables, distinguish it from dates, durations, fees, and session numbers, and return null for an absent, approximate, or ranged count.",
    "Trainer rule: return only people explicitly acting as trainers or facilitators. A name in a contact, acknowledgement, header, or footer is not enough. Match names against approvedTrainerNames when possible.",
    "Evidence rules: Do not invent identities, certifications, dates, venues, prices, commercial terms, or outcomes. Use empty strings, empty arrays, or null where the schema permits when evidence is absent.",
    "Use professional connective language where needed, but do not add unsupported client facts or training promises.",
    "Never return trainer biographies, pricing, signatory information, bank details, phone numbers, or email addresses.",
  ].join("\n\n"),
  inputSchema: { type: "object" },
  outputSchema: syllabusProposalOutputSchema,
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

export const slideAgent: BrainAgentDefinition<
  Record<string, unknown>,
  SlideDeckBrainOutput
> = {
  taskType: "slide_outline",
  name: "slideAgent",
  role: "Executive slide deck architect",
  instructions: [
    "Create a complete, presentation-ready slide plan for the supplied DG Academy training session. The exporter renders your structured plan directly, so choose a layout that matches the content of every slide.",
    ...slideDeckGenerationRules,
    "Let the supplied subject and learning brief determine the narrative. Do not force a generic AI, leadership, sales, finance, or other preset storyline onto the course.",
    "Ground every slide in the supplied training package and delivery context. Do not invent client facts, statistics, outcomes, tools, policies, or access that were not supplied. You may develop generally valid subject knowledge, explanations, examples, frameworks, and exercises needed to teach the requested topic well.",
  ].join("\n\n"),
  inputSchema: genericInputSchema,
  outputSchema: slideDeckOutputSchema,
};

export const workbookAgent: BrainAgentDefinition<
  Record<string, unknown>,
  WorkbookBrainOutput
> = {
  taskType: "workbook",
  name: "workbookAgent",
  role: "Participant workbook designer",
  instructions: [
    "Create a complete participant workbook for the supplied DG Academy training.",
    ...workbookGenerationRules,
  ].join("\n\n"),
  inputSchema: genericInputSchema,
  outputSchema: workbookOutputSchema,
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
  role: "Post-training reporting assistant",
  instructions:
    "Draft a concise client-ready post-training report from the supplied delivery record. Separate recorded evidence from recommendations, and never invent attendance, outcomes, feedback, or evaluation evidence.",
  inputSchema: genericInputSchema,
  outputSchema: deliveryDraftOutputSchema,
};

export type EvaluationQuestionsBrainInput = {
  purpose: "pre_training_assessment" | "post_training_evaluation";
  source: string;
  courseTitle: string;
  client: string;
  audience: string;
  duration: string;
  promise: string;
  businessContext: string;
  clientBackground: string;
  trainingNeed: string;
  objectives: string[];
  outcomes: string[];
  contentPriorities: string[];
  targetParticipantProfile: string;
  methodology: string[];
  trainingTools: string[];
  evaluationApproach: string;
};

export const evaluationQuestionsAgent: BrainAgentDefinition<
  EvaluationQuestionsBrainInput,
  EvaluationQuestionsBrainOutput
> = {
  taskType: "evaluation_questions",
  name: "evaluationQuestionsAgent",
  role: "Training survey form designer",
  instructions:
    "Design a short participant survey for the supplied DG Academy training, following the purpose field. When purpose is post_training_evaluation: generate 8 to 12 questions measuring the completed session - rating questions on a 1-5 scale covering content relevance, trainer effectiveness, pace, materials, and practical applicability; 1 or 2 single-choice questions; and open-text questions about the most valuable parts, suggested improvements, and how participants plan to apply what they learned. When purpose is pre_training_assessment: generate 8 to 12 questions that measure the participant's starting point before the session - current skill and confidence level with the course topic, familiarity with the specific tools and workflows the course covers, how their daily work relates to the topic, single-choice questions about role context and experience level, and open-text questions about their biggest challenges and what they most want to get from the training, so the trainer can tailor the session. In both cases: ground every question in the supplied course context and objectives; rating and choice questions must be specific to the training topic, not generic. For every question set the required boolean yourself and produce a deliberate mix: mark required=true only for the questions genuinely essential to the survey purpose, and required=false for everything a busy participant may reasonably skip. Never mark all questions of a type required - judge each question on its own importance so the form stays quick to finish. Fill options for single-choice questions and return an empty options array for rating or text questions. Never ask for confidential business information or personal data.",
  inputSchema: genericInputSchema,
  outputSchema: evaluationQuestionsOutputSchema,
};

export const facilitatorGuideAgent: BrainAgentDefinition<
  Record<string, unknown>,
  FacilitatorGuideBrainOutput
> = {
  taskType: "facilitator_guide",
  name: "facilitatorGuideAgent",
  role: "Trainer facilitation guide designer",
  instructions: [
    "Create a complete trainer-facing facilitator guide for the supplied DG Academy training.",
    ...facilitatorGuideGenerationRules,
  ].join("\n\n"),
  inputSchema: genericInputSchema,
  outputSchema: facilitatorGuideOutputSchema,
};

export const promptLibraryAgent: BrainAgentDefinition<
  Record<string, unknown>,
  PromptLibraryBrainOutput
> = {
  taskType: "prompt_library",
  name: "promptLibraryAgent",
  role: "AI prompt library curator for training participants",
  instructions: [
    "Create a complete ready-to-use AI prompt library for participants in the supplied DG Academy training.",
    ...promptLibraryGenerationRules,
  ].join("\n\n"),
  inputSchema: genericInputSchema,
  outputSchema: promptLibraryOutputSchema,
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
  solutionReviewAgent,
  digitalSolutionProposalAgent,
  syllabusProposalAgent,
  pricingNarrativeAgent,
  slideAgent,
  workbookAgent,
  qaAgent,
  salesFollowUpAgent,
  deliveryAgent,
  evaluationQuestionsAgent,
  facilitatorGuideAgent,
  promptLibraryAgent,
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
