import { generateStructuredOutput } from "@/lib/brain/client";
import {
  chiefBrainAgent,
  courseArchitectAgent,
  type BrainAgentDefinition,
  type CoursePackageBrainInput,
  type ProposalAgentOutput,
  type QaReviewOutput,
  type TextAgentOutput,
} from "@/lib/brain/agents";
import { routeBrainTask } from "@/lib/brain/router";
import type { JsonSchema } from "@/lib/brain/schemas";
import { buildDeterministicPricingFacts } from "@/lib/brain/tools";
import type { PricingInputs } from "@/lib/pricing";
import {
  normalizeTrainingOutputs,
  type TrainingPackage,
  type TrainingPackageInput,
  type TrainingPackageOutputs,
} from "@/lib/training-packages";
import type { KnowledgeSourceNote } from "@/lib/knowledge";

export const packageWorkflowSteps = [
  "Syllabus",
  "Proposal",
] as const;

export type PackageWorkflowStep = (typeof packageWorkflowSteps)[number];
export type PackageWorkflowStatus = "running" | "completed" | "failed";
export type RegeneratablePackageSection =
  | "syllabus"
  | "proposal";

export type PackageWorkflowInput = TrainingPackageInput & {
  pricingInputs?: Partial<PricingInputs>;
  knowledgeContext?: string;
  knowledgeUsed?: KnowledgeSourceNote[];
  workflowId?: string;
};

const syllabusOnlySchema: JsonSchema = {
  type: "object",
  required: ["syllabus"],
  properties: {
    syllabus: { type: "string" },
  },
};

export type AgentOutputRecord = {
  step: PackageWorkflowStep | "Follow-up";
  agent: string;
  mode: "openai";
  model: string;
  summary: string;
};

export type PackageWorkflowState = {
  workflowId: string;
  status: PackageWorkflowStatus;
  currentStep: PackageWorkflowStep;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
  agentOutputs: AgentOutputRecord[];
  finalOutput: TrainingPackageOutputs | null;
  qaReview: QaReviewOutput | null;
  qaScore: number | null;
  improvementRecommendations: string;
};

export type PackageWorkflowResult = {
  workflowId: string;
  output: TrainingPackageOutputs;
  qaReview: QaReviewOutput;
  traceSummary: AgentOutputRecord[];
  state: PackageWorkflowState;
};

function createWorkflowId() {
  return crypto.randomUUID();
}

function createWorkflowState(workflowId = createWorkflowId()): PackageWorkflowState {
  const now = new Date().toISOString();

  return {
    workflowId,
    status: "running",
    currentStep: "Syllabus",
    startedAt: now,
    completedAt: null,
    error: null,
    agentOutputs: [],
    finalOutput: null,
    qaReview: null,
    qaScore: null,
    improvementRecommendations: "",
  };
}

function updateState(
  state: PackageWorkflowState,
  patch: Partial<PackageWorkflowState>,
) {
  return { ...state, ...patch };
}

function recordAgentOutput({
  state,
  step,
  agent,
  mode,
  model,
  content,
}: {
  state: PackageWorkflowState;
  step: PackageWorkflowStep | "Follow-up";
  agent: string;
  mode: "openai";
  model: string;
  content: string;
}) {
  state.agentOutputs.push({
    step,
    agent,
    mode,
    model,
    summary: content.replace(/\s+/g, " ").slice(0, 220),
  });
}

function createTemporaryPackage({
  input,
  outputs,
}: {
  input: PackageWorkflowInput;
  outputs: TrainingPackageOutputs;
}): TrainingPackage {
  const pricingFacts = buildDeterministicPricingFacts(undefined);

  return {
    id: "workflow-preview",
    title: input.courseTitle,
    audience: input.audience,
    duration: input.duration,
    client: input.client,
    promise: input.promise,
    context: input.context,
    tone: input.tone,
    ...outputs,
    proposalContent: outputs.proposalContent ?? null,
    commercialProposal: "",
    deckOutline: "",
    workbook: "",
    followUpEmail: "",
    qualityChecklist: [],
    pricingInputs: pricingFacts.inputs,
    pricingOutputs: pricingFacts.outputs,
    knowledgeUsed: input.knowledgeUsed ?? [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    generationMode: "openai",
  };
}

export async function runPackageWorkflow(
  input: PackageWorkflowInput,
): Promise<PackageWorkflowResult> {
  let state = createWorkflowState(input.workflowId);

  try {
    const pricingFacts = buildDeterministicPricingFacts(input.pricingInputs);
    const baseInput: CoursePackageBrainInput = {
      courseTitle: input.courseTitle,
      audience: input.audience,
      duration: input.duration,
      client: input.client,
      promise: input.promise,
      context: [
        input.context,
        input.knowledgeContext
          ? `Relevant DG Academy knowledge:\n${input.knowledgeContext}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      tone: input.tone,
      pricingInputs: pricingFacts.inputs,
      pricingOutputs: pricingFacts.outputs,
      pricingSummary: pricingFacts.summary,
    };
    state = updateState(state, { currentStep: "Syllabus" });
    const plan = await generateStructuredOutput<
      Record<string, unknown>,
      TextAgentOutput
    >({
      agent: chiefBrainAgent as BrainAgentDefinition<
        Record<string, unknown>,
        TextAgentOutput
      >,
      input: {
        task: "Create a package plan before specialist generation.",
        input: baseInput,
      },
    });
    recordAgentOutput({
      state,
      step: "Syllabus",
      agent: chiefBrainAgent.name,
      mode: plan.mode,
      model: plan.model,
      content: plan.output.content,
    });

    const syllabusResult = await generateStructuredOutput<
      CoursePackageBrainInput,
      { syllabus: string }
    >({
      agent: courseArchitectAgent as BrainAgentDefinition<
        CoursePackageBrainInput,
        { syllabus: string }
      >,
      input: {
        ...baseInput,
        context: `${baseInput.context}\n\nChief Brain plan:\n${plan.output.content}\n\nGenerate only the syllabus for this step. The proposal agent will create proposalContent separately.`,
      },
      schema: syllabusOnlySchema,
    });
    recordAgentOutput({
      state,
      step: "Syllabus",
      agent: "courseArchitectAgent",
      mode: syllabusResult.mode,
      model: syllabusResult.model,
      content: syllabusResult.output.syllabus,
    });

    state = updateState(state, { currentStep: "Proposal" });
    const proposalResult = await routeBrainTask<
      Record<string, unknown>,
      ProposalAgentOutput
    >({
      taskType: "proposal",
      input: {
        input: baseInput,
        plan: plan.output.content,
        syllabus: syllabusResult.output.syllabus,
      },
    });
    recordAgentOutput({
      state,
      step: "Proposal",
      agent: "proposalAgent",
      mode: proposalResult.mode,
      model: proposalResult.model,
      content: normalizeTrainingOutputs(
        {
          syllabus: syllabusResult.output.syllabus,
          proposalContent: proposalResult.output.proposalContent,
        },
        baseInput,
      ).proposal,
    });

    const outputs: TrainingPackageOutputs = normalizeTrainingOutputs(
      {
        syllabus: syllabusResult.output.syllabus,
        proposalContent: proposalResult.output.proposalContent,
      },
      baseInput,
    );

    state = updateState(state, {
      status: "completed",
      completedAt: new Date().toISOString(),
      finalOutput: outputs,
    });

    return {
      workflowId: state.workflowId,
      output: outputs,
      qaReview: {
        score: 0,
        strengths: [],
        weaknesses: [],
        missingSections: [],
        risks: [],
        recommendedImprovements: [],
        clientReadiness: "medium",
      },
      traceSummary: state.agentOutputs,
      state,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Package workflow failed.";
    state = updateState(state, {
      status: "failed",
      completedAt: new Date().toISOString(),
      error: message,
    });
    throw Object.assign(new Error(message), { workflowState: state });
  }
}

export async function regeneratePackageSection({
  section,
  packageInput,
  currentPackage,
}: {
  section: RegeneratablePackageSection;
  packageInput: PackageWorkflowInput;
  currentPackage: TrainingPackageOutputs;
}) {
  const pricingFacts = buildDeterministicPricingFacts(packageInput.pricingInputs);
  const baseContext = {
    input: packageInput,
    currentPackage,
    deterministicPricing: pricingFacts,
    instruction: `Regenerate only ${section}. Keep the rest of the package conceptually aligned.`,
  };

  if (section === "syllabus") {
    const result = await routeBrainTask<CoursePackageBrainInput, TrainingPackageOutputs>({
      taskType: "course_package",
      input: {
        courseTitle: packageInput.courseTitle,
        audience: packageInput.audience,
        duration: packageInput.duration,
        client: packageInput.client,
        promise: packageInput.promise,
        context: packageInput.context,
        tone: packageInput.tone,
        pricingInputs: pricingFacts.inputs,
        pricingOutputs: pricingFacts.outputs,
        pricingSummary: pricingFacts.summary,
      },
    });
    return { section, content: result.output.syllabus, mode: result.mode };
  }

  if (section === "proposal") {
    const result = await routeBrainTask<Record<string, unknown>, ProposalAgentOutput>({
      taskType: "proposal",
      input: baseContext,
    });
    return {
      section,
      content: normalizeTrainingOutputs(
        {
          syllabus: currentPackage.syllabus,
          proposalContent: result.output.proposalContent,
        },
        packageInput,
      ).proposal,
      mode: result.mode,
    };
  }

  throw new Error("Only syllabus and proposal can be regenerated for packages.");
}
