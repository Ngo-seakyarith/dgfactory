import { createMockDeliveryDraft } from "@/lib/delivery";
import { createMockFollowUpDraft } from "@/lib/crm";
import {
  createMockTrainingOutputs,
  type TrainingPackageInput,
  type TrainingPackageOutputs,
} from "@/lib/training-packages";
import {
  calculatePricing,
  defaultPricingInputs,
  normalizePricingInputs,
  pricingSummaryToMarkdown,
  type PricingInputs,
  type PricingOutputs,
} from "@/lib/pricing";
import {
  adaptiveGrowthRecommendationsOutputSchema,
  deliveryDraftOutputSchema,
  followUpOutputSchema,
  improvementOpportunityOutputSchema,
  offerReplicationOutputSchema,
  offerMutationOutputSchema,
  qaReviewOutputSchema,
  textOutputSchema,
  trainingPackageOutputSchema,
  type JsonSchema,
} from "@/lib/brain/schemas";
import { masterAgent } from "@/lib/brain/agents/masterAgent";

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

export type BrainMode = "mock" | "openai";

export type BrainAgentDefinition<TInput = unknown, TOutput = unknown> = {
  taskType: BrainTaskType;
  name: string;
  role: string;
  instructions: string;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  mockOutput(input: TInput): TOutput;
};

export type TextAgentOutput = {
  content: string;
};

export type CoursePackageBrainInput = TrainingPackageInput & {
  pricingInputs?: Partial<PricingInputs>;
  pricingOutputs?: PricingOutputs;
  pricingSummary?: string;
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

type DeliveryProjectForMock = Parameters<typeof createMockDeliveryDraft>[0]["project"];

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

function mockCoursePackage(input: CoursePackageBrainInput): TrainingPackageOutputs {
  return createMockTrainingOutputs(
    {
      courseTitle: input.courseTitle,
      audience: input.audience,
      duration: input.duration,
      client: input.client,
      promise: input.promise,
      context: input.context,
      tone: input.tone,
    },
    normalizePricingInputs(input.pricingInputs ?? defaultPricingInputs),
  );
}

function mockTextOutput(content: string) {
  return { content };
}

function mockQaReview(input: QaReviewInput): QaReviewOutput {
  const content = input.packageContent.toLowerCase();
  const missingSections = [
    ["syllabus", "Syllabus"],
    ["proposal", "Proposal"],
    ["workbook", "Workbook"],
    ["follow-up", "Follow-up"],
    ["pricing", "Pricing"],
  ]
    .filter(([needle]) => !content.includes(needle))
    .map(([, label]) => label);
  const risks = [
    input.context.toLowerCase().includes("confidential")
      ? "Context mentions confidential information; confirm client approval before exporting."
      : "",
    content.includes("guarantee")
      ? "Package may contain unsupported guarantee language."
      : "",
  ].filter(Boolean);
  const score = Math.max(55, 92 - missingSections.length * 7 - risks.length * 8);

  return {
    score,
    strengths: [
      "The package has enough structure for DG Academy internal review.",
      `The audience is named as ${input.audience || "the target learner group"}.`,
      `The client or market context is visible for ${input.client || "the buyer"}.`,
    ],
    weaknesses: missingSections.length
      ? ["Some expected package sections need review before client handoff."]
      : ["Final client-specific examples should still be checked by a human."],
    missingSections,
    risks: risks.length ? risks : ["No major mock-mode risks detected."],
    recommendedImprovements: [
      "Verify every client claim against the actual training scope.",
      "Add client-specific examples where the content is still generic.",
      "Review commercial terms and remove internal margin language before export.",
    ],
    clientReadiness: score >= 82 ? "high" : score >= 68 ? "medium" : "low",
  };
}

function mockOfferMutations(input: OfferMutationInput): OfferMutationOutput {
  const count = Math.max(1, Math.min(20, Number(input.numberOfVariants ?? 7)));
  const sector = input.sector || "Cambodia corporate market";
  const audience = input.audience || "business managers";
  const idea = input.signalTitle || input.sourceIdea || "AI capability training";
  const strategy = input.mutationStrategy || "Random creative mutation";
  const formats = [
    input.desiredFormat || "Workshop",
    "Briefing",
    "Masterclass",
    "Online Cohort",
    "In-house Training",
    "Coaching Package",
    "Consulting Package",
  ];
  const painPoints = [
    "teams know AI is important but lack a practical starting point",
    "leaders need governance habits before scaling AI usage",
    "managers need repeatable workflow examples instead of tool demos",
    "sales and operations teams need faster proposal and follow-up execution",
    "executives need a clear decision framework for AI adoption",
    "trainers need reusable activities that connect AI to business outcomes",
    "SME owners need low-cost AI use cases that do not require heavy IT change",
  ];

  const variants = Array.from({ length: count }, (_, index) => {
    const format = formats[index % formats.length];
    const painPoint = painPoints[index % painPoints.length];
    const duration =
      format === "Briefing"
        ? "90 minutes"
        : format === "Masterclass"
          ? "1 day"
          : format === "Online Cohort"
            ? "4 weeks"
            : format === "Coaching Package"
              ? "3 sessions"
              : "2 days";
    const title = `${idea.replace(/^(\[DEMO\]\s*)?/i, "")}: ${strategy.split(" ")[0]} ${index + 1}`;

    return {
      title,
      target_audience: audience,
      sector,
      format,
      duration,
      promise: `Participants leave with a practical ${sector} AI adoption playbook, one tested workflow idea, and a clear next action.`,
      pain_point: painPoint,
      why_now:
        "Clients are moving from AI curiosity to implementation pressure, and early practical wins can shape future buying decisions.",
      test_method:
        index % 2 === 0
          ? "Post a one-page offer on LinkedIn and invite discovery calls."
          : "Pitch the offer to three warm client contacts and measure meeting conversion.",
      suggested_price_range:
        format === "Briefing"
          ? "USD 300-700"
          : format === "Masterclass"
            ? "USD 2,000-4,500"
            : "USD 1,200-3,500",
      expected_buying_trigger:
        "A leader needs a practical AI program that can be approved quickly and linked to productivity or governance outcomes.",
      risk:
        "The offer may sound generic unless DG Academy adds sector-specific examples and a clear business outcome.",
      confidence_score: Math.max(55, 86 - index * 3),
    };
  });

  return {
    variants,
    recommended_top_3: variants.slice(0, 3).map((variant) => variant.title),
    rationale:
      "Mock mutation prioritized practical DG Academy offers with clear pain points, quick market tests, and reusable training-package potential.",
  };
}

function mockOfferReplication(input: OfferReplicationInput): OfferReplicationOutput {
  const offer = input.offer as {
    title?: string;
    targetAudience?: string;
    sector?: string;
    format?: string;
    duration?: string;
    promise?: string;
    description?: string;
  };
  const decision = input.selectionDecision as {
    decision?: string;
    fitnessScore?: number;
    rationale?: string;
  };
  const title = offer.title || "Winning DG Academy offer";
  const audience = offer.targetAudience || "target learners";
  const sector = offer.sector || "Cambodia corporate market";
  const promise = offer.promise || "practical capability improvement";
  const format = offer.format || "Workshop";

  return {
    replication_summary: `${title} is ready to replicate because the selection decision is ${decision.decision || "Scale"} with fitness ${decision.fitnessScore ?? "available evidence"}. Reuse the audience, promise, delivery format, and sales message while keeping internal assumptions private.`,
    reusable_training_template: `# ${title} Template\n\nAudience: ${audience}\nSector: ${sector}\nFormat: ${format}\nDuration: ${offer.duration || "TBD"}\nPromise: ${promise}\n\nCore structure:\n1. Business relevance and why now\n2. Practical examples for ${sector}\n3. Guided activity connected to participant work\n4. Implementation plan and next-step commitment`,
    proposal_template: `DG Academy proposes ${title} for ${audience}. The program helps participants move from awareness to practical action through sector-relevant examples, guided exercises, and a clear implementation path.`,
    pricing_note:
      "Keep pricing deterministic. Reuse only approved pricing assumptions, margin rules, and package inclusions. Do not expose internal margin or direct cost language in client-facing proposals.",
    sales_message: `${title} helps ${audience} in ${sector} turn ${promise} into a practical next step. Would it be useful to explore a focused pilot for your team?`,
    delivery_checklist: [
      "Confirm buyer objective and participant profile.",
      "Select sector-specific examples and exercises.",
      "Prepare workbook and implementation template.",
      "Confirm logistics, trainer readiness, and follow-up owner.",
      "Capture feedback and update the learning genome after delivery.",
    ],
    learning_genome_items: [
      {
        title: `Winning pattern: ${title}`,
        type: "Winning Pattern",
        content: `Winning pattern from ${title}: ${promise}. Best audience: ${audience}. Best format: ${format}. Reuse with ${sector} examples and evidence from the selection decision.`,
        confidence_score: 84,
      },
      {
        title: `Proposal language: ${title}`,
        type: "Proposal Language",
        content: `DG Academy can position ${title} as a practical capability-building program for ${audience}, focused on business use cases, guided exercises, and measurable next actions.`,
        confidence_score: 78,
      },
      {
        title: `Sales message: ${title}`,
        type: "Sales Message",
        content: `${title} is a concise offer for ${audience}: ${promise}. Use it as a first outreach or follow-up message after a discovery call.`,
        confidence_score: 76,
      },
      {
        title: `Training activity: ${title}`,
        type: "Training Activity",
        content: `Activity: ask participants to map one current workflow, identify one AI-supported improvement, and define a human review checkpoint before testing it.`,
        confidence_score: 74,
      },
    ],
    recommended_expansion_paths: [
      `Adapt ${title} for a higher-ticket executive masterclass.`,
      `Create a shorter briefing version for first-contact clients.`,
      `Build an online cohort version for multi-company participation.`,
      `Package a partner version for associations or sector groups.`,
      `Create a corporate in-house version with stronger implementation support.`,
    ],
  };
}

function mockImprovementOpportunity(
  input: ImprovementOpportunityInput,
): ImprovementOpportunityOutput {
  const source = input.sourceType || "Other";
  const summary = input.sourceSummary || "Improve DG Academy Factory workflow.";

  return {
    title: `Improve ${source}: ${summary.slice(0, 54)}`,
    description: `Convert this ${source} learning into one small, testable DG Academy Factory improvement: ${summary}`,
    category: source.includes("Security")
      ? "Security Improvement"
      : source.includes("QA") || source.includes("Eval")
        ? "Agent Improvement"
        : source.includes("Offer") || source.includes("Genome")
          ? "Business Model Improvement"
          : "Product Feature",
    priority: source.includes("Security") || source.includes("Failed") ? 1 : 2,
    rationale:
      "This improvement links observed business or product learning to a safe Codex implementation task with human approval.",
    suggested_files_modules: [
      "src/lib",
      "src/components",
      "src/app/api",
      "README.md",
      "AGENTS.md",
    ],
    acceptance_criteria: [
      "The change is implemented as one small working increment.",
      "No external sending, deployment, deletion, or client data exposure happens automatically.",
      "Mock/fallback mode continues to work without API keys.",
      "Relevant tests, lint, and build pass.",
      "README or docs are updated when behavior changes.",
    ],
    codex_prompt: [
      "Continue building DG Academy AI Training Production Factory.",
      "",
      `Source learning: ${source}`,
      `Summary: ${summary}`,
      "",
      "Goal:",
      "Implement one small, safe improvement that addresses this learning.",
      "",
      "Tasks:",
      "- Inspect the existing code paths first.",
      "- Make the smallest practical code change.",
      "- Preserve mock mode and local fallback behavior.",
      "- Add or update tests where risk is meaningful.",
      "- Update README/docs if behavior changes.",
      "",
      "Safety:",
      "- Do not send external messages.",
      "- Do not deploy.",
      "- Do not delete production data.",
      "- Do not expose internal margins, private knowledge, prompt templates, or client data.",
      "",
      "Quality:",
      "- Run npm run lint.",
      "- Run npm run typecheck.",
      "- Run npm test if available.",
      "- Run npm run build.",
    ].join("\n"),
  };
}

function mockAdaptiveGrowthRecommendations(
  input: AdaptiveGrowthRecommendationsInput,
): AdaptiveGrowthRecommendationsOutput {
  const data = input.availableData ?? {};
  const score =
    typeof data.adaptationScore === "number" ? data.adaptationScore : 0;
  const topOffer =
    Array.isArray(data.topOffers) && data.topOffers.length
      ? String(data.topOffers[0])
      : "the highest-fitness offer once enough data is available";
  const weakOffer =
    Array.isArray(data.bottomOffers) && data.bottomOffers.length
      ? String(data.bottomOffers[0])
      : "offers with missing market-pull and conversion evidence";

  return {
    what_to_test_next: [
      "Run one small market test for the strongest sector-audience-format niche shown in the dashboard.",
      "Launch a short discovery post or warm-client pitch for the top offer before building more assets.",
    ],
    what_to_kill: [
      `Review ${weakOffer} and kill or park it if no client interest appears after one sharper test.`,
    ],
    what_to_scale: [
      `Prepare a reusable package and proposal path for ${topOffer}.`,
    ],
    what_to_replicate: [
      "Convert active winning patterns into client-safe proposal language only after human review.",
    ],
    what_to_learn: [
      "Capture missing experiment metrics first: inquiries, meetings, proposals sent, deals won, margin, strategic fit, and reusability.",
    ],
    what_codex_should_improve_next: [
      "Add clearer empty-state guidance for offers with incomplete fitness data.",
    ],
    uncertainty_notes: [
      score
        ? `Adaptive Growth Score is ${score}/100 from deterministic app data; recommendations should be treated as directional.`
        : "There is not enough growth data yet, so recommendations are intentionally conservative.",
      "Mock mode recommendations do not invent client outcomes or hidden metrics.",
    ],
  };
}

export const chiefBrainAgent: BrainAgentDefinition = {
  taskType: "improvement_suggestion",
  name: "chiefBrainAgent",
  role: "DG Academy capability factory brain",
  instructions:
    "Route work to the right specialist, preserve deterministic business logic, and recommend small practical improvements.",
  inputSchema: genericInputSchema,
  outputSchema: textOutputSchema,
  mockOutput: () =>
    mockTextOutput(
      "Prioritize one small improvement: add clearer client-specific examples, then run QA review before export.",
    ),
};

export const courseArchitectAgent: BrainAgentDefinition<
  CoursePackageBrainInput,
  TrainingPackageOutputs
> = {
  taskType: "course_package",
  name: "courseArchitectAgent",
  role: "Senior training product architect",
  instructions:
    "Create a complete DG Academy training package with syllabus, proposal, commercial section, deck outline, workbook, follow-up email, and QA checklist. Use deterministic pricing facts only; never invent pricing, discounts, taxes, costs, or margins.",
  inputSchema: coursePackageInputSchema,
  outputSchema: trainingPackageOutputSchema,
  mockOutput: mockCoursePackage,
};

export const proposalAgent: BrainAgentDefinition = {
  taskType: "proposal",
  name: "proposalAgent",
  role: "Corporate training proposal writer",
  instructions:
    "Write client-ready proposal language for practical DG Academy business training. Avoid unsupported guarantees.",
  inputSchema: genericInputSchema,
  outputSchema: textOutputSchema,
  mockOutput: () =>
    mockTextOutput(`# Client Proposal

## Executive Summary
DG Academy will deliver a practical training experience tailored to the client context and participant profile.

## Business Need
The client needs a clear, usable capability-building program that moves participants from awareness into workplace application.

## Proposed Approach
The program combines executive framing, relevant examples, guided exercises, and a clear implementation path.

## Expected Outcomes
- Shared understanding of the capability and business relevance
- Practical examples connected to participant work
- Clear next steps for implementation and follow-up`),
};

export const pricingNarrativeAgent: BrainAgentDefinition = {
  taskType: "pricing_narrative",
  name: "pricingNarrativeAgent",
  role: "Commercial pricing narrative specialist",
  instructions:
    "Explain deterministic pricing outputs in client-facing terms. Never change or invent numbers.",
  inputSchema: genericInputSchema,
  outputSchema: textOutputSchema,
  mockOutput: () =>
    mockTextOutput(
      `# Commercial Proposal

## Investment
The program fee is based on the deterministic pricing assumptions supplied by DG Academy's pricing calculator.

## What Is Included
- Program preparation and learning design
- Training delivery by DG Academy
- Participant workbook and practical exercises
- Follow-up recommendations

## What Is Not Included
- Venue, travel, or special logistics unless listed in the commercial setup
- Custom implementation consulting beyond the agreed training scope

## Payment Terms
Payment terms to be confirmed in the final client agreement.

## Validity
This proposal is valid for 14 days unless otherwise agreed.

## Next Steps
Confirm participant count, delivery date, and client sponsor approval.`,
    ),
};

export const slideAgent: BrainAgentDefinition = {
  taskType: "slide_outline",
  name: "slideAgent",
  role: "Executive slide deck architect",
  instructions:
    "Create clear slide outlines with agenda, section flow, executive framing, and facilitator cues.",
  inputSchema: genericInputSchema,
  outputSchema: textOutputSchema,
  mockOutput: () =>
    mockTextOutput(
      "# Slide Deck Outline\n1. Title and DG Academy positioning\n2. Client context and participant reality\n3. Why this capability matters now\n4. Program promise and learning outcomes\n5. Practical example walkthrough\n6. Guided lab instructions\n7. Group readout template\n8. 30-day implementation plan\n9. Risks, governance, and next steps",
    ),
};

export const workbookAgent: BrainAgentDefinition = {
  taskType: "workbook",
  name: "workbookAgent",
  role: "Participant workbook designer",
  instructions:
    "Create practical workbook activities, reflection prompts, and templates for business training participants.",
  inputSchema: genericInputSchema,
  outputSchema: textOutputSchema,
  mockOutput: () =>
    mockTextOutput(
      "# Participant Workbook\n\n## Starting Point\nName one workflow, decision, or business challenge where this training could create value.\n\n## Opportunity Map\nCapture three opportunities with business value, ease, risk, and owner.\n\n## Applied Exercise\nMap the current workflow, redesign the improved workflow, and define human checkpoints.\n\n## 30-Day Plan\nDocument the first action, owner, stakeholders, success metric, and decision needed.",
    ),
};

export const qaAgent: BrainAgentDefinition<QaReviewInput, QaReviewOutput> = {
  taskType: "qa_review",
  name: "qaAgent",
  role: "Training package QA reviewer",
  instructions:
    "Review DG Academy package content for client readiness, completeness, risks, missing sections, and practical improvement opportunities. Return structured JSON only.",
  inputSchema: qaInputSchema,
  outputSchema: qaReviewOutputSchema,
  mockOutput: mockQaReview,
};

export const salesFollowUpAgent: BrainAgentDefinition = {
  taskType: "follow_up",
  name: "salesFollowUpAgent",
  role: "Corporate training sales follow-up assistant",
  instructions:
    "Draft follow-up email and short message text only. Never imply a message has been sent.",
  inputSchema: genericInputSchema,
  outputSchema: followUpOutputSchema,
  mockOutput: (input) =>
    createMockFollowUpDraft({
      clientName:
        typeof input === "object" && input && "clientName" in input
          ? String((input as { clientName?: unknown }).clientName ?? "")
          : "",
      status: "Lead",
      trainingNeed: "DG Academy training opportunity",
      lastNotes: "",
      nextFollowUpDate: "",
    }),
};

export const deliveryAgent: BrainAgentDefinition = {
  taskType: "delivery_report",
  name: "deliveryAgent",
  role: "Training delivery and reporting assistant",
  instructions:
    "Draft practical delivery checklists, participant messages, agendas, and post-training reports. Do not invent evaluation evidence.",
  inputSchema: genericInputSchema,
  outputSchema: deliveryDraftOutputSchema,
  mockOutput: (input) =>
    createMockDeliveryDraft({
      kind: "post-training-report",
      project:
        typeof input === "object" && input && "project" in input
          ? (input as { project: DeliveryProjectForMock }).project
          : {
              id: "mock",
              opportunityId: null,
              packageId: null,
              clientId: null,
              title: "DG Academy Training Delivery",
              deliveryStatus: "Delivered",
              trainingDate: "",
              location: "",
              trainerName: "",
              participantCount: 0,
              notes: "",
              evaluation: {
                averageSatisfactionScore: 0,
                keyComments: "",
                improvementSuggestions: "",
                trainerReflection: "",
                clientFeedback: "",
                learnerFeedback: "",
              },
              postTrainingReport: "",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
    }),
};

export const improvementAgent: BrainAgentDefinition = {
  taskType: "improvement_suggestion",
  name: "improvementAgent",
  role: "Ralph-style improvement loop agent",
  instructions:
    "Turn QA findings and usage observations into small, testable product improvements.",
  inputSchema: genericInputSchema,
  outputSchema: textOutputSchema,
  mockOutput: () =>
    mockTextOutput(
      "Suggested improvement: add one targeted checklist item and one regression test for the repeated issue.",
    ),
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
  mockOutput: mockOfferMutations,
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
  mockOutput: mockOfferReplication,
};

export const improvementOpportunityAgent: BrainAgentDefinition<
  ImprovementOpportunityInput,
  ImprovementOpportunityOutput
> = {
  taskType: "improvement_opportunity",
  name: "improvementOpportunityAgent",
  role: "Ralph business and software improvement translator",
  instructions:
    "Convert feedback, loop results, eval failures, security findings, and growth lessons into one structured Codex-ready improvement opportunity. Keep it small, testable, safety-aware, and suitable for a one-story Ralph loop. Do not approve, merge, deploy, or execute code changes.",
  inputSchema: improvementOpportunityInputSchema,
  outputSchema: improvementOpportunityOutputSchema,
  mockOutput: mockImprovementOpportunity,
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
  mockOutput: mockAdaptiveGrowthRecommendations,
};

function adaptiveTextAgent({
  taskType,
  name,
  role,
  instructions,
  mockText,
}: {
  taskType: BrainTaskType;
  name: string;
  role: string;
  instructions: string;
  mockText: string;
}): BrainAgentDefinition<Record<string, unknown>, TextAgentOutput> {
  return {
    taskType,
    name,
    role,
    instructions,
    inputSchema: genericInputSchema,
    outputSchema: textOutputSchema,
    mockOutput: () => mockTextOutput(mockText),
  };
}

export const marketSensingAgent = adaptiveTextAgent({
  taskType: "market_sensing",
  name: "marketSensingAgent",
  role: "Adaptive Growth market sensing specialist",
  instructions:
    "Summarize market signals from client notes, training feedback, opportunities, and knowledge items. Treat signals as hypotheses, not truth.",
  mockText:
    "Market sensing recommendation: prioritize signals with recent client pull, named buyer urgency, and repeatable DG Academy delivery fit.",
});

export const experimentDesignerAgent = adaptiveTextAgent({
  taskType: "experiment_design",
  name: "experimentDesignerAgent",
  role: "Offer experiment designer",
  instructions:
    "Design small, testable experiments for DG Academy offers. Recommend test method, channel, success criteria, owner, and evidence to collect.",
  mockText:
    "Experiment design: test one offer with three warm-client pitches, one LinkedIn post, clear success criteria, and no external sending without approval.",
});

export const fitnessEvaluatorAgent = adaptiveTextAgent({
  taskType: "fitness_evaluation",
  name: "fitnessEvaluatorAgent",
  role: "Fitness evidence interpreter",
  instructions:
    "Explain deterministic fitness scores from provided metrics. Never invent market pull, revenue, margin, or conversion data.",
  mockText:
    "Fitness interpretation: use deterministic score components, highlight missing data, and recommend whether the offer needs more evidence before selection.",
});

export const selectionAgent = adaptiveTextAgent({
  taskType: "selection_recommendation",
  name: "selectionAgent",
  role: "Adaptive selection strategist",
  instructions:
    "Recommend Scale, Iterate, Park, Kill, Bundle, Partner, or Productize using deterministic fitness evidence. Status changes require approval.",
  mockText:
    "Selection recommendation: make the smallest evidence-based decision and require approval before Scaling, Productized, or Killed status changes.",
});

export const expansionAgent = adaptiveTextAgent({
  taskType: "expansion_strategy",
  name: "expansionAgent",
  role: "Expansion path strategist",
  instructions:
    "Suggest new sectors, audiences, formats, partner paths, and productization paths from winning patterns only.",
  mockText:
    "Expansion recommendation: adapt proven offers into one adjacent sector, one shorter briefing, and one higher-ticket executive version.",
});

export const learningGenomeAgent = adaptiveTextAgent({
  taskType: "learning_genome",
  name: "learningGenomeAgent",
  role: "Learning genome curator",
  instructions:
    "Turn proven and failed patterns into searchable internal genome items. Keep client details anonymized and internal by default.",
  mockText:
    "Learning genome recommendation: store winning and failed patterns as Internal items until a human marks them Client-safe.",
});

export const extinctionAgent = adaptiveTextAgent({
  taskType: "extinction_recommendation",
  name: "extinctionAgent",
  role: "Weak-offer extinction specialist",
  instructions:
    "Recommend when to kill or park weak offers based on evidence. Never change status directly; create approval requests for risky changes.",
  mockText:
    "Extinction recommendation: park or kill offers only after missing-data checks, one sharper test, and human approval.",
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
  const pricingInputs = normalizePricingInputs(input.pricingInputs ?? defaultPricingInputs);
  const pricingOutputs = input.pricingOutputs ?? calculatePricing(pricingInputs);
  const pricingSummary =
    input.pricingSummary ?? pricingSummaryToMarkdown(pricingInputs, pricingOutputs);

  return {
    task: "Create a complete sellable training package.",
    input,
    deterministicPricing: {
      inputs: pricingInputs,
      outputs: pricingOutputs,
      summary: pricingSummary,
    },
    requirements: [
      "Use markdown for each output.",
      "Make the syllabus complete and timed.",
      "Make the proposal client-ready and executive.",
      "Make commercialProposal a client-facing investment section using only deterministic pricing numbers supplied.",
      "Do not include internal profit, target margin, or direct cost details in commercialProposal.",
      "Make the deck outline concrete enough for slide production.",
      "Make the workbook useful for participants.",
      "Make the follow-up email ready to send.",
      "Make the qualityChecklist cover strategy, learning design, delivery, commercial readiness, and risk.",
    ],
  };
}
