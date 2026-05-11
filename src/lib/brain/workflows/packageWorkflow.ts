import { generateStructuredOutput } from "@/lib/brain/client";
import {
  chiefBrainAgent,
  type BrainAgentDefinition,
  type CoursePackageBrainInput,
  type QaReviewInput,
  type QaReviewOutput,
  type TextAgentOutput,
} from "@/lib/brain/agents";
import { routeBrainTask } from "@/lib/brain/router";
import { buildDeterministicPricingFacts } from "@/lib/brain/tools";
import {
  buildCommercialProposalSection,
  type PricingInputs,
} from "@/lib/pricing";
import {
  createMockTrainingOutputs,
  fullPackageToMarkdown,
  type TrainingPackage,
  type TrainingPackageInput,
  type TrainingPackageOutputs,
} from "@/lib/training-packages";
import type { FollowUpDraft } from "@/lib/crm";
import type { KnowledgeSourceNote } from "@/lib/knowledge";

export const packageWorkflowSteps = [
  "Planning",
  "Syllabus",
  "Proposal",
  "Slides",
  "Workbook",
  "Commercial",
  "QA",
  "Final Review",
] as const;

export type PackageWorkflowStep = (typeof packageWorkflowSteps)[number];
export type PackageWorkflowStatus = "running" | "completed" | "failed";
export type RegeneratablePackageSection =
  | "syllabus"
  | "proposal"
  | "deckOutline"
  | "workbook"
  | "commercialProposal"
  | "followUpEmail";

export type PackageWorkflowInput = TrainingPackageInput & {
  pricingInputs?: Partial<PricingInputs>;
  knowledgeContext?: string;
  knowledgeUsed?: KnowledgeSourceNote[];
  workflowId?: string;
  forceFailStep?: PackageWorkflowStep;
};

export type AgentOutputRecord = {
  step: PackageWorkflowStep | "Follow-up";
  agent: string;
  mode: "mock" | "openai";
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

const globalForWorkflowStore = globalThis as typeof globalThis & {
  __dgPackageWorkflowStore?: Map<string, PackageWorkflowState>;
};

const workflowStore =
  globalForWorkflowStore.__dgPackageWorkflowStore ??
  (globalForWorkflowStore.__dgPackageWorkflowStore = new Map());

function createWorkflowId() {
  return crypto.randomUUID();
}

function createWorkflowState(workflowId = createWorkflowId()): PackageWorkflowState {
  const now = new Date().toISOString();

  return {
    workflowId,
    status: "running",
    currentStep: "Planning",
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
  const next = { ...state, ...patch };
  workflowStore.set(next.workflowId, next);
  return next;
}

function failIfRequested(input: PackageWorkflowInput, step: PackageWorkflowStep) {
  if (input.forceFailStep === step) {
    throw new Error(`Forced failure for workflow step: ${step}`);
  }
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
  mode: "mock" | "openai";
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
  workflowStore.set(state.workflowId, state);
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
    pricingInputs: pricingFacts.inputs,
    pricingOutputs: pricingFacts.outputs,
    knowledgeUsed: input.knowledgeUsed ?? [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    generationMode: "mock",
  };
}

export function getPackageWorkflowState(workflowId: string) {
  return workflowStore.get(workflowId) ?? null;
}

export async function runPackageWorkflow(
  input: PackageWorkflowInput,
): Promise<PackageWorkflowResult> {
  let state = createWorkflowState(input.workflowId);
  workflowStore.set(state.workflowId, state);

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
    const mockPackage = createMockTrainingOutputs(baseInput, pricingFacts.inputs);

    state = updateState(state, { currentStep: "Planning" });
    failIfRequested(input, "Planning");
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
      step: "Planning",
      agent: chiefBrainAgent.name,
      mode: plan.mode,
      model: plan.model,
      content: plan.output.content,
    });

    state = updateState(state, { currentStep: "Syllabus" });
    failIfRequested(input, "Syllabus");
    const syllabusResult = await routeBrainTask<
      CoursePackageBrainInput,
      TrainingPackageOutputs
    >({
      taskType: "course_package",
      input: {
        ...baseInput,
        context: `${baseInput.context}\n\nChief Brain plan:\n${plan.output.content}`,
      },
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
    failIfRequested(input, "Proposal");
    const proposalResult = await routeBrainTask<
      Record<string, unknown>,
      TextAgentOutput
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
      content: proposalResult.output.content,
    });

    state = updateState(state, { currentStep: "Slides" });
    failIfRequested(input, "Slides");
    const slideResult = await routeBrainTask<Record<string, unknown>, TextAgentOutput>({
      taskType: "slide_outline",
      input: {
        input: baseInput,
        plan: plan.output.content,
        syllabus: syllabusResult.output.syllabus,
        proposal: proposalResult.output.content,
      },
    });
    recordAgentOutput({
      state,
      step: "Slides",
      agent: "slideAgent",
      mode: slideResult.mode,
      model: slideResult.model,
      content: slideResult.output.content,
    });

    state = updateState(state, { currentStep: "Workbook" });
    failIfRequested(input, "Workbook");
    const workbookResult = await routeBrainTask<
      Record<string, unknown>,
      TextAgentOutput
    >({
      taskType: "workbook",
      input: {
        input: baseInput,
        syllabus: syllabusResult.output.syllabus,
        deckOutline: slideResult.output.content,
      },
    });
    recordAgentOutput({
      state,
      step: "Workbook",
      agent: "workbookAgent",
      mode: workbookResult.mode,
      model: workbookResult.model,
      content: workbookResult.output.content,
    });

    state = updateState(state, { currentStep: "Commercial" });
    failIfRequested(input, "Commercial");
    const commercialResult = await routeBrainTask<
      Record<string, unknown>,
      TextAgentOutput
    >({
      taskType: "pricing_narrative",
      input: {
        input: baseInput,
        deterministicPricing: pricingFacts,
        proposal: proposalResult.output.content,
      },
    });
    recordAgentOutput({
      state,
      step: "Commercial",
      agent: "pricingNarrativeAgent",
      mode: commercialResult.mode,
      model: commercialResult.model,
      content: commercialResult.output.content,
    });

    const followUpResult = await routeBrainTask<
      Record<string, unknown>,
      FollowUpDraft
    >({
      taskType: "follow_up",
      input: {
        clientName: input.client,
        trainingNeed: input.promise,
        packageTitle: input.courseTitle,
      },
    });
    recordAgentOutput({
      state,
      step: "Follow-up",
      agent: "salesFollowUpAgent",
      mode: followUpResult.mode,
      model: followUpResult.model,
      content: followUpResult.output.followUpEmail,
    });

    const outputs: TrainingPackageOutputs = {
      syllabus: syllabusResult.output.syllabus,
      proposal: proposalResult.output.content,
      commercialProposal:
        commercialResult.output.content ||
        buildCommercialProposalSection({
          title: input.courseTitle,
          client: input.client,
          inputs: pricingFacts.inputs,
          outputs: pricingFacts.outputs,
        }),
      deckOutline: slideResult.output.content,
      workbook: workbookResult.output.content,
      followUpEmail: followUpResult.output.followUpEmail,
      qualityChecklist: syllabusResult.output.qualityChecklist.length
        ? syllabusResult.output.qualityChecklist
        : mockPackage.qualityChecklist,
    };

    state = updateState(state, { currentStep: "QA", finalOutput: outputs });
    failIfRequested(input, "QA");
    const packageContent = fullPackageToMarkdown(
      createTemporaryPackage({ input, outputs }),
    );
    const qaResult = await routeBrainTask<QaReviewInput, QaReviewOutput>({
      taskType: "qa_review",
      input: {
        packageContent,
        client: input.client,
        audience: input.audience,
        context: input.context,
      },
    });
    recordAgentOutput({
      state,
      step: "QA",
      agent: "qaAgent",
      mode: qaResult.mode,
      model: qaResult.model,
      content: `QA score ${qaResult.output.score}/100, readiness ${qaResult.output.clientReadiness}`,
    });

    state = updateState(state, {
      currentStep: "Final Review",
      qaReview: qaResult.output,
      qaScore: qaResult.output.score,
    });
    failIfRequested(input, "Final Review");
    const improvementResult = await routeBrainTask<
      Record<string, unknown>,
      TextAgentOutput
    >({
      taskType: "improvement_suggestion",
      input: {
        input: baseInput,
        qaReview: qaResult.output,
        outputs,
      },
    });
    recordAgentOutput({
      state,
      step: "Final Review",
      agent: "improvementAgent",
      mode: improvementResult.mode,
      model: improvementResult.model,
      content: improvementResult.output.content,
    });

    state = updateState(state, {
      status: "completed",
      completedAt: new Date().toISOString(),
      finalOutput: outputs,
      qaReview: qaResult.output,
      qaScore: qaResult.output.score,
      improvementRecommendations: improvementResult.output.content,
    });

    return {
      workflowId: state.workflowId,
      output: outputs,
      qaReview: qaResult.output,
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
    const result = await routeBrainTask<Record<string, unknown>, TextAgentOutput>({
      taskType: "proposal",
      input: baseContext,
    });
    return { section, content: result.output.content, mode: result.mode };
  }

  if (section === "deckOutline") {
    const result = await routeBrainTask<Record<string, unknown>, TextAgentOutput>({
      taskType: "slide_outline",
      input: baseContext,
    });
    return { section, content: result.output.content, mode: result.mode };
  }

  if (section === "workbook") {
    const result = await routeBrainTask<Record<string, unknown>, TextAgentOutput>({
      taskType: "workbook",
      input: baseContext,
    });
    return { section, content: result.output.content, mode: result.mode };
  }

  if (section === "commercialProposal") {
    const result = await routeBrainTask<Record<string, unknown>, TextAgentOutput>({
      taskType: "pricing_narrative",
      input: baseContext,
    });
    return { section, content: result.output.content, mode: result.mode };
  }

  const result = await routeBrainTask<Record<string, unknown>, FollowUpDraft>({
    taskType: "follow_up",
    input: baseContext,
  });
  return { section, content: result.output.followUpEmail, mode: result.mode };
}
