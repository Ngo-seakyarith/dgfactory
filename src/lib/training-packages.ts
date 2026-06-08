import {
  calculatePricing,
  defaultPricingInputs,
  normalizePricingInputs,
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
};

export type PackageOutputKey = keyof TrainingPackageOutputs;

export type TrainingPackage = Omit<TrainingPackageInput, "courseTitle"> &
  TrainingPackageOutputs & {
    id: string;
    title: string;
    pricingInputs: PricingInputs;
    pricingOutputs: PricingOutputs;
    commercialProposal: string;
    deckOutline: string;
    workbook: string;
    followUpEmail: string;
    qualityChecklist: QualityChecklistItem[];
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
): TrainingPackageOutputs {
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
The experience combines executive briefing, practical demonstrations, facilitated exercises, and a final action-plan readout. The tone will be ${input.tone.toLowerCase()}.

## Deliverables
- Full syllabus and facilitator flow
- Client-ready proposal

## Expected Outcomes
- Shared understanding of the topic and its business value
- Prioritized opportunity map for ${input.client}
- Practical workflow prototypes or implementation ideas
- Clear 30-day follow-up plan with owners and measures

## Next Step
Confirm audience profile, delivery date, and decision-maker priorities, then finalize the examples and workshop cases.`,
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

  return {
    title: input.courseTitle,
    audience: input.audience,
    duration: input.duration,
    client: input.client,
    promise: input.promise,
    context: input.context,
    tone: input.tone,
    ...outputs,
    commercialProposal: "",
    deckOutline: "",
    workbook: "",
    followUpEmail: "",
    qualityChecklist: [],
    pricingInputs: normalizedPricingInputs,
    pricingOutputs,
    knowledgeUsed,
    id,
    generationMode,
    createdAt,
    updatedAt: new Date().toISOString(),
  };
}
