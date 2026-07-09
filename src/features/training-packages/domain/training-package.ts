import {
  calculatePricing,
  defaultPricingInputs,
  normalizePricingInputs,
  type PricingInputs,
  type PricingOutputs,
} from "./pricing";
import type { KnowledgeSourceNote } from "@/lib/knowledge";
import {
  defaultBillingArrangement,
  defaultPaymentInstructions,
  normalizeProposalBrief,
  type ProposalBrief,
} from "./proposal-brief";
import {
  normalizeProposalContent,
  proposalContentToMarkdown,
  type ProposalContent,
} from "./proposal-content";

export type TrainingPackageInput = {
  courseTitle: string;
  audience: string;
  duration: string;
  client: string;
  promise: string;
  context: string;
  tone: string;
  proposalBrief?: ProposalBrief;
};

export type QualityChecklistItem = {
  category: string;
  item: string;
  status: "ready" | "review";
};

export type TrainingPackageOutputs = {
  syllabus: string;
  proposal: string;
  proposalContent?: ProposalContent;
};

export type PackageOutputKey = "syllabus" | "proposal";

export type TrainingPackage = Omit<TrainingPackageInput, "courseTitle" | "proposalBrief"> &
  {
    id: string;
    title: string;
    syllabus: string;
    proposal: string;
    proposalContent: ProposalContent | null;
    proposalBrief: ProposalBrief;
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
    proposalBrief: normalizeProposalBrief(input.proposalBrief),
  };
}

export function createTrainingOutputTemplate(
  input: TrainingPackageInput,
): TrainingPackageOutputs {
  const contextLine = input.context
    ? `Context to weave through the program: ${input.context}`
    : "Context to weave through the program: practical DG Academy examples, executive decision-making, and hands-on AI workflow design.";

  const proposalContent: ProposalContent = {
    coverTitle: input.proposalBrief?.coverHeading || "Customized Training Proposal",
    coverSubtitle: input.proposalBrief?.coverSubtitle ?? "",
    certificationLabel: input.proposalBrief?.certificationLabel ?? "",
    courseTitle: input.courseTitle,
    client: input.client,
    courseOverview: [
      `DG Academy will deliver a ${input.duration} training experience for ${input.audience}.`,
      `The program is designed for ${input.client} and promises to ${input.promise}.`,
    ],
    courseObjectives: [
      "Explain the business case for the training topic in their own operating context.",
      "Identify high-value use cases and prioritize them with clear criteria.",
      "Practice the core workflows through guided DG Academy exercises.",
      "Convert workshop insights into a 30-day implementation plan.",
    ],
    expectedLearningOutcomes: input.proposalBrief?.expectedLearningOutcomes
      ? input.proposalBrief.expectedLearningOutcomes.split(/\r?\n/).filter(Boolean)
      : [],
    contentOutlines: [
      "Executive framing and success criteria",
      "Core concepts and field examples",
      "Applied workshop labs",
      "Implementation planning",
    ],
    whoShouldAttend: input.proposalBrief?.whoShouldAttend
      ? input.proposalBrief.whoShouldAttend.split(/\r?\n/).filter(Boolean)
      : [],
    trainingMethodology: [
      "Executive briefing",
      "Practical demonstrations",
      "Facilitated exercises",
      "Action-plan readout",
    ],
    trainingTools: input.proposalBrief?.trainingTools
      ? input.proposalBrief.trainingTools.split(/\r?\n/).filter(Boolean)
      : [],
    trainingEvaluation: input.proposalBrief?.evaluationApproach
      ? input.proposalBrief.evaluationApproach.split(/\r?\n/).filter(Boolean)
      : [],
    schedule: {
      duration: input.duration,
      date: "TBC",
      time: "TBC",
      venue: "TBC",
      participants: input.audience,
    },
    trainer: {
      name: input.proposalBrief?.trainerName || "DG Academy Facilitator",
      title: input.proposalBrief?.trainerTitle || "Trainer & Speaker",
      imageUrl: input.proposalBrief?.trainerImageUrl ?? "",
      bio: input.proposalBrief?.trainerBio
        ? [input.proposalBrief.trainerBio]
        : [
            "DG Academy will assign a facilitator with practical business training experience aligned to the client context.",
          ],
      experience: input.proposalBrief?.trainerExperience
        ? input.proposalBrief.trainerExperience.split(/\r?\n/).filter(Boolean)
        : [],
      qualifications: input.proposalBrief?.trainerQualifications
        ? input.proposalBrief.trainerQualifications.split(/\r?\n/).filter(Boolean)
        : [],
    },
    professionalFee: {
      included: [
        "Professional trainer with pre-training consultation",
        "Training preparation and arrangement",
        "Training materials",
        "Certificates of completion",
        "Pre-training and post-training evaluation",
      ],
      totalFee: `Professional fee to be confirmed from Commercial Setup (${input.proposalBrief?.vatStatus || "Excluding VAT"}).`,
      vatStatus: input.proposalBrief?.vatStatus || "Excluding VAT",
      clientResponsibilities: ["Training venue", "Meals or refreshments", "Participants"],
      billingArrangement:
        input.proposalBrief?.billingArrangement || defaultBillingArrangement,
      paymentInstructions:
        input.proposalBrief?.paymentInstructions || defaultPaymentInstructions,
      acceptanceText: "Client acknowledgement and acceptance to be confirmed.",
    },
    signatory: {
      name: "Mr. Hin Sopheap",
      title: "Executive Director",
      date: input.proposalBrief?.proposalDate ?? "",
    },
  };

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

    proposal: proposalContentToMarkdown(proposalContent),
    proposalContent,
  };
}

export function normalizeTrainingOutputs(
  outputs: Partial<TrainingPackageOutputs>,
  input: TrainingPackageInput,
): TrainingPackageOutputs {
  const fallbackProposal = String(outputs.proposal ?? "").trim();
  const proposalContent = normalizeProposalContent(
    outputs.proposalContent,
    fallbackProposal,
    {
      title: input.courseTitle,
      client: input.client,
      audience: input.audience,
      duration: input.duration,
      promise: input.promise,
      proposalBrief: input.proposalBrief,
    },
  );

  return {
    syllabus: String(outputs.syllabus ?? "").trim(),
    proposal: fallbackProposal || proposalContentToMarkdown(proposalContent),
    proposalContent,
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
  createdAt = new Date().toISOString(),
  pricingInputs = defaultPricingInputs,
  knowledgeUsed = [],
}: {
  input: TrainingPackageInput;
  outputs: TrainingPackageOutputs;
  id?: string;
  createdAt?: string;
  pricingInputs?: PricingInputs;
  knowledgeUsed?: KnowledgeSourceNote[];
}): TrainingPackage {
  const normalizedPricingInputs = normalizePricingInputs(pricingInputs);
  const pricingOutputs = calculatePricing(normalizedPricingInputs);
  const proposalBrief = normalizeProposalBrief(input.proposalBrief);
  const normalizedInput: TrainingPackageInput = { ...input, proposalBrief };
  const normalizedOutputs = normalizeTrainingOutputs(outputs, normalizedInput);

  return {
    title: input.courseTitle,
    audience: input.audience,
    duration: input.duration,
    client: input.client,
    promise: input.promise,
    context: input.context,
    tone: input.tone,
    proposalBrief,
    ...normalizedOutputs,
    commercialProposal: "",
    proposalContent: normalizedOutputs.proposalContent ?? null,
    deckOutline: "",
    workbook: "",
    followUpEmail: "",
    qualityChecklist: [],
    pricingInputs: normalizedPricingInputs,
    pricingOutputs,
    knowledgeUsed,
    id,
    createdAt,
    updatedAt: new Date().toISOString(),
  };
}
