import {
  buildCommercialProposalSection,
  calculatePricing,
  defaultPricingInputs,
  normalizePricingInputs,
  pricingSummaryToMarkdown,
  type PricingInputs,
  type PricingOutputs,
} from "@/lib/pricing";
import type { KnowledgeSourceNote } from "@/lib/knowledge";

export type TrainingPackageInput = {
  courseTitle: string;
  audience: string;
  duration: string;
  client: string;
  promise: string;
  context: string;
  tone: string;
};

export type QualityChecklistItem = {
  category: string;
  item: string;
  status: "ready" | "review";
};

export type TrainingPackageOutputs = {
  syllabus: string;
  proposal: string;
  commercialProposal: string;
  deckOutline: string;
  workbook: string;
  followUpEmail: string;
  qualityChecklist: QualityChecklistItem[];
};

export type PackageOutputKey = keyof TrainingPackageOutputs | "pricing";

export type TrainingPackage = Omit<TrainingPackageInput, "courseTitle"> &
  TrainingPackageOutputs & {
    id: string;
    title: string;
    pricingInputs: PricingInputs;
    pricingOutputs: PricingOutputs;
    knowledgeUsed?: KnowledgeSourceNote[];
    createdAt: string;
    updatedAt: string;
    generationMode?: "openai";
  };

export const packageOutputSections: Array<{
  key: PackageOutputKey;
  label: string;
  description: string;
}> = [
  {
    key: "syllabus",
    label: "Syllabus",
    description: "Learning outcomes, modules, timing, and delivery flow.",
  },
  {
    key: "proposal",
    label: "Proposal",
    description: "Client-ready scope, value case, outcomes, and investment framing.",
  },
  {
    key: "pricing",
    label: "Pricing",
    description: "Deterministic commercial pricing, cost breakdown, and margin view.",
  },
  {
    key: "commercialProposal",
    label: "Commercial Proposal",
    description: "Client-facing investment terms and next steps.",
  },
  {
    key: "deckOutline",
    label: "Slide Deck",
    description: "Executive presentation structure for the facilitator deck.",
  },
  {
    key: "workbook",
    label: "Workbook",
    description: "Participant exercises, reflection prompts, and templates.",
  },
  {
    key: "followUpEmail",
    label: "Follow-Up Email",
    description: "Post-program message with next steps and momentum builders.",
  },
  {
    key: "qualityChecklist",
    label: "QA Checklist",
    description: "Quality controls before a package is sold or delivered.",
  },
];

type RawTrainingInput = Partial<TrainingPackageInput> & {
  title?: string;
};

export function validateTrainingInput(input: RawTrainingInput) {
  const courseTitle = input.courseTitle ?? input.title;
  const missing = [
    ["course title", courseTitle],
    ["target learners", input.audience],
    ["duration", input.duration],
    ["client or market", input.client],
    ["program promise", input.promise],
  ]
    .filter(([, value]) => !String(value ?? "").trim())
    .map(([label]) => label);

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(", ")}.`);
  }
}

export function normalizeTrainingInput(
  input: RawTrainingInput,
): TrainingPackageInput {
  validateTrainingInput(input);
  const courseTitle = input.courseTitle ?? input.title;

  return {
    courseTitle: String(courseTitle).trim(),
    audience: String(input.audience).trim(),
    duration: String(input.duration).trim(),
    client: String(input.client).trim(),
    promise: String(input.promise).trim(),
    context: String(input.context ?? "").trim(),
    tone: String(input.tone ?? "Executive, practical, clear").trim(),
  };
}

export function createTrainingOutputTemplate(
  input: TrainingPackageInput,
  pricingInputs: PricingInputs = defaultPricingInputs,
): TrainingPackageOutputs {
  const pricingOutputs = calculatePricing(pricingInputs);
  const contextLine = input.context
    ? `Context to weave through the program: ${input.context}`
    : "Context to weave through the program: practical DG Academy examples, executive decision-making, and hands-on AI workflow design.";

  return {
    syllabus: `# ${input.courseTitle}

Audience: ${input.audience}
Duration: ${input.duration}
Client or market: ${input.client}
Promise: ${input.promise}
Tone: ${input.tone}

## Learning Outcomes
By the end of the program, participants will be able to:
1. Explain the business case for the training topic in their own operating context.
2. Identify high-value use cases and prioritize them with clear criteria.
3. Practice the core workflows through guided DG Academy exercises.
4. Convert workshop insights into a 30-day implementation plan.

## Module Flow
1. Executive framing and success criteria
   - Why this capability matters now
   - Baseline assessment and participant expectations
   - Shared definition of practical outcomes

2. Core concepts and field examples
   - Concepts translated into business language
   - ${contextLine}
   - Discussion: what this means for ${input.client}

3. Applied workshop labs
   - Lab 1: map current workflow and friction points
   - Lab 2: redesign the workflow with AI-enabled support
   - Lab 3: define measures, risks, and owner handoffs

4. Implementation planning
   - 30-day action plan
   - Governance checkpoints
   - Executive readout and next-step commitments

## Suggested Timing
- Opening and alignment: 10%
- Teaching and examples: 25%
- Guided labs: 45%
- Readout, commitments, and next steps: 20%`,

    proposal: `# Client Proposal: ${input.courseTitle}

## Executive Summary
DG Academy will deliver a ${input.duration} training experience for ${input.audience}. The program is designed for ${input.client} and promises to ${input.promise}.

## Business Need
Organizations need practical AI capability that moves beyond awareness into repeatable business workflows. This program gives participants a clear operating language, hands-on practice, and an implementation path they can use immediately.

## Program Design
The experience combines executive briefing, practical demonstrations, facilitated exercises, participant workbook activities, and a final action-plan readout. The tone will be ${input.tone.toLowerCase()}.

## Deliverables
- Full syllabus and facilitator flow
- Slide deck outline for executive delivery
- Participant workbook with exercises and templates
- Follow-up email and post-session next steps
- Quality checklist for readiness review

## Expected Outcomes
- Shared understanding of the topic and its business value
- Prioritized opportunity map for ${input.client}
- Practical workflow prototypes or implementation ideas
- Clear 30-day follow-up plan with owners and measures

## Next Step
Confirm audience profile, delivery date, and decision-maker priorities, then finalize the examples and workshop cases.`,

    commercialProposal: buildCommercialProposalSection({
      title: input.courseTitle,
      client: input.client,
      inputs: normalizePricingInputs(pricingInputs),
      outputs: pricingOutputs,
    }),

    deckOutline: `# Slide Deck Outline: ${input.courseTitle}

1. Title and DG Academy positioning
2. Why this topic matters now
3. Audience reality: ${input.audience}
4. Program promise: ${input.promise}
5. What participants will build or decide
6. Core concept 1: the operating shift
7. Core concept 2: opportunity selection
8. Core concept 3: risk and governance
9. Example walkthrough for ${input.client}
10. Lab instructions: workflow map
11. Lab instructions: AI-enabled redesign
12. Lab instructions: success metrics
13. Group readout template
14. 30-day implementation plan
15. Next steps and DG Academy support options`,

    workbook: `# Participant Workbook: ${input.courseTitle}

## Section 1: Starting Point
- What is one current workflow or decision that feels slower than it should?
- Who is affected by that friction?
- What would improve if this training promise became real: ${input.promise}?

## Section 2: Opportunity Map
Capture 3 opportunities:
- Opportunity
- Business value
- Ease of implementation
- Data or policy dependency
- Owner

## Section 3: Lab Template
Current workflow:
1. Trigger
2. Inputs
3. Steps
4. Decisions
5. Outputs
6. Risks

Improved workflow:
1. Where AI assists
2. Human checkpoints
3. Quality controls
4. Measurement

## Section 4: 30-Day Plan
- First action within 48 hours
- Owner
- Stakeholders
- Success metric
- Risk to manage
- Decision needed from leadership`,

    followUpEmail: `Subject: Next steps from ${input.courseTitle}

Hi team,

Thank you for joining the ${input.courseTitle} program with DG Academy. The focus was practical: helping ${input.audience} move from idea to action around this promise: ${input.promise}.

Recommended next steps:
1. Review the opportunity map and select one priority workflow.
2. Assign an owner and define a simple 30-day success measure.
3. Confirm any data, policy, or approval requirements before implementation.
4. Schedule a short follow-up session to review progress and unblock decisions.

DG Academy can support the next phase with implementation coaching, executive alignment, or a deeper workflow design sprint.

Best,
DG Academy`,

    qualityChecklist: [
      {
        category: "Strategic Fit",
        item: "The program promise is specific, commercial, and relevant to the buyer.",
        status: "ready",
      },
      {
        category: "Learning Design",
        item: `The syllabus matches ${input.audience} and balances teaching with practical labs.`,
        status: "ready",
      },
      {
        category: "Client Relevance",
        item: `Examples and discussion prompts are tailored to ${input.client}.`,
        status: "ready",
      },
      {
        category: "Commercial Readiness",
        item: "Proposal language avoids unsupported guarantees and makes next steps clear.",
        status: "review",
      },
      {
        category: "Delivery Readiness",
        item: "Slides, workbook, and follow-up email are coherent enough for facilitator review.",
        status: "ready",
      },
      {
        category: "Risk Control",
        item: "No confidential client data is included unless it has been approved for use.",
        status: "review",
      },
    ],
  };
}

export function qualityChecklistToMarkdown(
  checklist: QualityChecklistItem[] | string,
) {
  if (typeof checklist === "string") {
    return checklist;
  }

  return [
    "# Quality Checklist",
    "",
    ...checklist.map(
      (item) =>
        `- [${item.status === "ready" ? "x" : " "}] **${item.category}:** ${item.item}`,
    ),
  ].join("\n");
}

export function outputToText(
  pkg: TrainingPackage,
  key: PackageOutputKey,
) {
  if (key === "qualityChecklist") {
    return qualityChecklistToMarkdown(pkg.qualityChecklist);
  }

  if (key === "pricing") {
    return pricingSummaryToMarkdown(pkg.pricingInputs, pkg.pricingOutputs);
  }

  return pkg[key];
}

export function fullPackageToMarkdown(pkg: TrainingPackage) {
  return [
    `# ${pkg.title}`,
    "",
    `Audience: ${pkg.audience}`,
    `Duration: ${pkg.duration}`,
    `Client or market: ${pkg.client}`,
    `Promise: ${pkg.promise}`,
    `Tone: ${pkg.tone}`,
    "",
    pkg.syllabus,
    "",
    pkg.proposal,
    "",
    pkg.commercialProposal,
    "",
    pricingSummaryToMarkdown(pkg.pricingInputs, pkg.pricingOutputs),
    "",
    pkg.deckOutline,
    "",
    pkg.workbook,
    "",
    pkg.followUpEmail,
    "",
    qualityChecklistToMarkdown(pkg.qualityChecklist),
  ].join("\n\n");
}

export function buildPackageFromParts({
  input,
  outputs,
  id = crypto.randomUUID(),
  generationMode = "openai",
  createdAt = new Date().toISOString(),
  pricingInputs = defaultPricingInputs,
  knowledgeUsed = [],
}: {
  input: TrainingPackageInput;
  outputs: TrainingPackageOutputs;
  id?: string;
  generationMode?: "openai";
  createdAt?: string;
  pricingInputs?: PricingInputs;
  knowledgeUsed?: KnowledgeSourceNote[];
}): TrainingPackage {
  const normalizedPricingInputs = normalizePricingInputs(pricingInputs);
  const pricingOutputs = calculatePricing(normalizedPricingInputs);
  const commercialProposal =
    outputs.commercialProposal?.trim() ||
    buildCommercialProposalSection({
      title: input.courseTitle,
      client: input.client,
      inputs: normalizedPricingInputs,
      outputs: pricingOutputs,
    });

  return {
    title: input.courseTitle,
    audience: input.audience,
    duration: input.duration,
    client: input.client,
    promise: input.promise,
    context: input.context,
    tone: input.tone,
    ...outputs,
    commercialProposal,
    pricingInputs: normalizedPricingInputs,
    pricingOutputs,
    knowledgeUsed,
    id,
    generationMode,
    createdAt,
    updatedAt: new Date().toISOString(),
  };
}
