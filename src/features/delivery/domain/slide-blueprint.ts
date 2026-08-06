import { z } from "zod";

export const learningBlockTypes = [
  "concept",
  "worked-example",
  "demonstration",
  "role-play",
  "guided-practice",
  "case",
  "reflection",
  "assessment",
  "action-plan",
  "facilitated-discussion",
  "scenario",
  "simulation",
  "group-exercise",
  "peer-feedback",
  "knowledge-check",
  "tool-lab",
] as const;

export type LearningBlockType = (typeof learningBlockTypes)[number];

export const learningBlockLabels: Record<LearningBlockType, string> = {
  concept: "Concept",
  "worked-example": "Worked example",
  demonstration: "Demonstration",
  "role-play": "Role-play",
  "guided-practice": "Guided practice",
  case: "Case",
  reflection: "Reflection",
  assessment: "Assessment",
  "action-plan": "Action plan",
  "facilitated-discussion": "Facilitated discussion",
  scenario: "Decision scenario",
  simulation: "Simulation",
  "group-exercise": "Group exercise",
  "peer-feedback": "Peer feedback",
  "knowledge-check": "Knowledge check",
  "tool-lab": "Tool lab",
};

export const learningBlockDescriptions: Record<LearningBlockType, string> = {
  concept: "Teach an essential idea, framework, or principle.",
  "worked-example": "Solve a realistic example step by step.",
  demonstration: "Show the task live and verify the result.",
  "role-play": "Rehearse a realistic conversation or decision.",
  "guided-practice": "Let participants perform a related task.",
  case: "Apply learning to an integrated business situation.",
  reflection: "Connect learning to experience and judgement.",
  assessment: "Check understanding or practical capability.",
  "action-plan": "Turn learning into committed next actions.",
  "facilitated-discussion": "Explore perspectives through structured questions and synthesis.",
  scenario: "Make a focused decision in a short realistic situation.",
  simulation: "Practise decisions across a realistic multi-step situation.",
  "group-exercise": "Create a shared output through structured team work.",
  "peer-feedback": "Review another participant's work against clear criteria.",
  "knowledge-check": "Quickly check recall and understanding before continuing.",
  "tool-lab": "Complete a hands-on workflow using confirmed software or equipment.",
};

export const learningBlockStages = [
  "teach",
  "show",
  "practice",
  "discuss",
  "assess",
  "transfer",
] as const;

export type LearningBlockStage = (typeof learningBlockStages)[number];

export const learningBlockStageLabels: Record<LearningBlockStage, string> = {
  teach: "Teach",
  show: "Show",
  practice: "Practice",
  discuss: "Discuss",
  assess: "Assess",
  transfer: "Transfer",
};

export const trainingTypes = [
  "AI",
  "Leadership & management",
  "Sales & customer service",
  "Finance & analytics",
  "Soft skills & communication",
  "Operations & process",
] as const;

export type TrainingType = (typeof trainingTypes)[number];

export const learningBlockStagesByType: Record<LearningBlockType, LearningBlockStage> = {
  concept: "teach",
  "worked-example": "show",
  demonstration: "show",
  "role-play": "practice",
  "guided-practice": "practice",
  case: "practice",
  reflection: "discuss",
  assessment: "assess",
  "action-plan": "transfer",
  "facilitated-discussion": "discuss",
  scenario: "practice",
  simulation: "practice",
  "group-exercise": "practice",
  "peer-feedback": "discuss",
  "knowledge-check": "assess",
  "tool-lab": "practice",
};

export function learningBlocksForStage(stage: LearningBlockStage) {
  return learningBlockTypes.filter(
    (type) => learningBlockStagesByType[type] === stage,
  );
}

export type LearningBlockPreset = {
  id: string;
  trainingType: TrainingType;
  label: string;
  type: LearningBlockType;
  description: string;
  generationGuide: string;
  expectedResult: string;
};

function preset(
  trainingType: TrainingType,
  id: string,
  label: string,
  type: LearningBlockType,
  description: string,
  generationGuide: string,
  expectedResult = "",
): LearningBlockPreset {
  return {
    id,
    trainingType,
    label,
    type,
    description,
    generationGuide,
    expectedResult,
  };
}

export const learningBlockPresets: readonly LearningBlockPreset[] = [
  preset(
    "AI",
    "ai-use-case-map",
    "AI use-case map",
    "concept",
    "Connect AI capabilities to realistic participant tasks, decisions, and outputs.",
    "Organize relevant use cases by work outcome. Separate suitable drafting or analysis support from tasks requiring human judgement, evidence, or approval.",
    "A shortlist of relevant AI-assisted tasks and their boundaries.",
  ),
  preset(
    "AI",
    "ai-foundations-boundaries",
    "AI foundations and boundaries",
    "concept",
    "Explain what AI can do, cannot do, and where human judgement remains responsible.",
    "Use plain language, realistic capabilities, limitations, and one memorable responsible-use principle.",
    "Participants can explain AI's role and limits in their own work.",
  ),
  preset(
    "AI",
    "ai-tools-for-task",
    "AI tools for the task",
    "concept",
    "Introduce only the AI tools relevant to the learning task and explain their practical strengths.",
    "Use icon cards for two to four confirmed tools. Explain what each is commonly used for, where it fits the workflow, and what still requires verification. Avoid ranking tools without evidence.",
    "A task-to-tool selection guide.",
  ),
  preset(
    "AI",
    "ai-responsible-use",
    "Responsible AI guardrails",
    "concept",
    "Make privacy, evidence, human review, and approval boundaries visible before practice.",
    "Use concise, workplace-relevant guardrails. Distinguish safe use, use requiring caution, and prohibited or approval-dependent use.",
    "A reusable responsible-use checklist.",
  ),
  preset(
    "AI",
    "ai-workflow-framework",
    "AI workflow framework",
    "concept",
    "Teach a repeatable workflow such as intent, context, prompt, output, verification, and reflection.",
    "Create one practical workflow that participants can reuse across tasks. Connect every stage to a quality decision.",
    "A reusable AI-assisted work sequence.",
  ),
  preset(
    "AI",
    "ai-prompt-method",
    "Prompt method",
    "concept",
    "Teach a concise prompt structure grounded in task, context, constraints, format, and quality criteria.",
    "Explain one prompt method with a copy-ready formula and the purpose of each element.",
    "A prompt formula participants can apply to their work.",
  ),
  preset(
    "AI",
    "ai-weak-to-strong",
    "Weak-to-strong prompt",
    "worked-example",
    "Show how a vague request becomes a useful, checkable instruction.",
    "Present the weak input, improved version, changes made, and why those changes improve the expected result.",
    "An annotated before-and-after prompt.",
  ),
  preset(
    "AI",
    "ai-live-demo",
    "Live AI demonstration",
    "demonstration",
    "Run one realistic task visibly from source input through checked output.",
    "Include realistic source material, the exact instruction to run, trainer actions, observable output, assumptions, and verification checks.",
    "A checked example output participants can inspect.",
  ),
  preset(
    "AI",
    "ai-guided-practice",
    "Guided AI practice",
    "guided-practice",
    "Participants repeat the demonstrated workflow on a related safe task.",
    "Give bounded steps, safe sample data or a low-risk task, a time box, success criteria, and a short debrief.",
    "A completed prompt, output, and verification note.",
  ),
  preset(
    "AI",
    "ai-output-verification",
    "90-second AI quality check",
    "assessment",
    "Check facts, assumptions, evidence, privacy, tone, and approval needs before use.",
    "Create a fast repeatable check using a realistic AI output. Cover accuracy, assumptions, sensitive data, tone, action ownership, and approval needs.",
    "A corrected output and visible verification checklist.",
  ),
  preset(
    "AI",
    "ai-workflow-lab",
    "Applied AI workflow lab",
    "case",
    "Apply AI to an end-to-end workplace case with evidence, constraints, and a useful deliverable.",
    "Provide a realistic scenario, source evidence, role, task, required output, risks, and review criteria. Do not invent results.",
    "A reusable workplace output plus its quality checks.",
  ),
  preset(
    "AI",
    "ai-role-lab",
    "Role-based AI lab",
    "group-exercise",
    "Teams apply the same safe AI workflow to different participant roles or departments.",
    "Give each team a relevant role, recurring task, realistic safe input, required output, verification criteria, and a brief share-out format.",
    "One reusable prompt and one checked role-specific output per team.",
  ),
  preset(
    "AI",
    "ai-prompt-peer-review",
    "Prompt and output peer review",
    "peer-feedback",
    "Participants review specificity, safety, checkability, reusability, and usefulness.",
    "Use explicit review criteria. Require one strength, one risk, and one concrete improvement to the prompt or output.",
    "A revised prompt or output informed by peer feedback.",
  ),
  preset(
    "AI",
    "ai-reusable-prompt-card",
    "Reusable prompt card",
    "worked-example",
    "Convert a successful prompt into a reusable team asset with required inputs and checks.",
    "Show task name, intended user, copy-ready instruction, required inputs, output format, quality check, approval note, and adaptation guidance.",
    "A prompt card another colleague can safely reuse.",
  ),
  preset(
    "AI",
    "ai-workflow-canvas",
    "Personal AI workflow canvas",
    "action-plan",
    "Turn the course into one safe recurring workflow the participant will test.",
    "Capture task, goal, AI role, inputs, prompt approach, verification, risk, deliverable, owner, and first test date.",
    "One practical AI workflow and a committed next step.",
  ),
  preset(
    "Leadership & management",
    "leadership-model",
    "Leadership model",
    "concept",
    "Introduce a practical leadership framework tied to observable behaviour.",
    "Explain the framework, when it applies, and what effective behaviour looks like.",
  ),
  preset(
    "Leadership & management",
    "leadership-dilemma",
    "Leadership dilemma",
    "scenario",
    "Make a decision in an ambiguous people or performance situation.",
    "Provide competing priorities, stakeholder perspectives, constraints, and a clear decision point.",
    "A justified leadership decision and communication approach.",
  ),
  preset(
    "Leadership & management",
    "coaching-demo",
    "Coaching conversation demonstration",
    "demonstration",
    "Show a manager conducting a structured coaching conversation.",
    "Include the employee situation, manager questions, listening moves, feedback, agreement, and debrief cues.",
  ),
  preset(
    "Leadership & management",
    "coaching-role-play",
    "Coaching role-play",
    "role-play",
    "Practise a difficult leadership conversation with observer feedback.",
    "Give manager, employee, and observer roles with goals, boundaries, success criteria, and rotation instructions.",
    "A practised conversation and observer feedback.",
  ),
  preset(
    "Leadership & management",
    "team-decision-case",
    "Team decision case",
    "case",
    "Balance people, performance, risk, and stakeholder needs in one case.",
    "Provide evidence, trade-offs, unanswered questions, decision criteria, and required communication.",
    "A team decision with rationale and next actions.",
  ),
  preset(
    "Leadership & management",
    "leadership-reflection",
    "Leadership reflection",
    "reflection",
    "Connect the framework to the participant's current leadership habits.",
    "Use focused prompts about current behaviour, impact, blind spots, and one alternative response.",
  ),
  preset(
    "Leadership & management",
    "leadership-action-plan",
    "Leadership action plan",
    "action-plan",
    "Commit to one observable leadership behaviour and follow-up measure.",
    "Capture behaviour, situation, stakeholder, success signal, support, and review date.",
  ),
  preset(
    "Sales & customer service",
    "sales-framework",
    "Sales conversation framework",
    "concept",
    "Teach a repeatable structure for discovery, value, objections, and commitment.",
    "Connect each stage to customer evidence and observable seller behaviour.",
  ),
  preset(
    "Sales & customer service",
    "discovery-demo",
    "Discovery conversation demonstration",
    "demonstration",
    "Show how strong questions uncover needs, impact, and decision criteria.",
    "Include customer context, seller questions, likely answers, follow-up probes, and debrief points.",
  ),
  preset(
    "Sales & customer service",
    "objection-role-play",
    "Objection-handling role-play",
    "role-play",
    "Practise responding to realistic customer resistance without becoming defensive.",
    "Define seller, customer, and observer roles, objection context, response criteria, and rotation.",
    "A practised response plus observer feedback.",
  ),
  preset(
    "Sales & customer service",
    "customer-case",
    "Customer decision case",
    "case",
    "Prepare a recommendation from customer facts, needs, constraints, and commercial risk.",
    "Provide evidence and missing information. Require discovery questions, recommendation, risk, and next step.",
  ),
  preset(
    "Sales & customer service",
    "follow-up-example",
    "Customer follow-up worked example",
    "worked-example",
    "Turn conversation notes into a concise, accurate follow-up.",
    "Show source notes, structure, first draft, corrections, and the final customer-ready message.",
  ),
  preset(
    "Sales & customer service",
    "sales-peer-feedback",
    "Sales peer coaching",
    "peer-feedback",
    "Review questioning, listening, value, objection response, and next-step clarity.",
    "Use a short observable rubric and require one reinforcement plus one improvement.",
  ),
  preset(
    "Sales & customer service",
    "sales-action-plan",
    "Sales application plan",
    "action-plan",
    "Apply one sales behaviour to a real account or customer conversation.",
    "Capture target situation, preparation, behaviour, evidence, next step, and review date.",
  ),
  preset(
    "Finance & analytics",
    "finance-principle",
    "Finance principle",
    "concept",
    "Explain a finance or analytics principle with decision relevance.",
    "Define the principle, formula or logic, assumptions, and business implication.",
  ),
  preset(
    "Finance & analytics",
    "worked-calculation",
    "Worked calculation",
    "worked-example",
    "Solve a realistic calculation step by step and interpret the result.",
    "Show inputs, formula, calculation, answer, reasonableness check, and decision meaning.",
    "A checked calculation and interpretation.",
  ),
  preset(
    "Finance & analytics",
    "analysis-demo",
    "Analysis demonstration",
    "demonstration",
    "Show how raw figures become a reliable management insight.",
    "Use supplied or clearly synthetic data. Demonstrate cleaning, calculation, validation, and interpretation.",
  ),
  preset(
    "Finance & analytics",
    "data-scenario",
    "Data interpretation scenario",
    "scenario",
    "Choose an action from incomplete or conflicting financial evidence.",
    "Provide relevant figures, uncertainty, assumptions, and a decision question without inventing certainty.",
  ),
  preset(
    "Finance & analytics",
    "spreadsheet-lab",
    "Spreadsheet lab",
    "tool-lab",
    "Build and check a practical spreadsheet or analysis workflow.",
    "Name the confirmed tool, supplied data, steps, checks, and required output. Never assume unavailable files.",
  ),
  preset(
    "Finance & analytics",
    "finance-case",
    "Finance decision case",
    "case",
    "Evaluate options using calculations, risks, and assumptions.",
    "Require evidence, calculations, recommendation, sensitivity, and control checks.",
  ),
  preset(
    "Finance & analytics",
    "finance-action-plan",
    "Finance application plan",
    "action-plan",
    "Transfer one analysis or control improvement into the participant's work.",
    "Capture process, evidence, control, owner, first test, and review measure.",
  ),
  preset(
    "Soft skills & communication",
    "communication-model",
    "Communication model",
    "concept",
    "Introduce a practical communication or interpersonal framework.",
    "Explain the model through observable language and behaviour, not abstract theory alone.",
  ),
  preset(
    "Soft skills & communication",
    "communication-demo",
    "Communication demonstration",
    "demonstration",
    "Show an ineffective and improved communication approach.",
    "Use a realistic situation, exact language, observable differences, and debrief questions.",
  ),
  preset(
    "Soft skills & communication",
    "communication-role-play",
    "Communication role-play",
    "role-play",
    "Practise a realistic interpersonal conversation with feedback.",
    "Define roles, context, desired behaviour, boundaries, observer criteria, and rotation.",
  ),
  preset(
    "Soft skills & communication",
    "communication-group-exercise",
    "Collaborative communication exercise",
    "group-exercise",
    "Use teamwork to practise clarity, listening, influence, or coordination.",
    "Give roles, task, constraints, shared output, success criteria, and debrief.",
  ),
  preset(
    "Soft skills & communication",
    "communication-peer-feedback",
    "Communication peer feedback",
    "peer-feedback",
    "Review communication against specific observable behaviours.",
    "Use a short rubric and require balanced, actionable feedback.",
  ),
  preset(
    "Soft skills & communication",
    "communication-reflection",
    "Communication reflection",
    "reflection",
    "Identify current habits, triggers, impact, and a better response.",
    "Use focused private reflection followed by optional paired discussion.",
  ),
  preset(
    "Soft skills & communication",
    "communication-action-plan",
    "Communication action plan",
    "action-plan",
    "Commit to one communication behaviour in a real situation.",
    "Capture situation, behaviour, preparation, feedback source, and review date.",
  ),
  preset(
    "Operations & process",
    "process-framework",
    "Process framework",
    "concept",
    "Teach a practical way to understand flow, ownership, controls, and outcomes.",
    "Explain the process model, inputs, steps, handoffs, outputs, risks, and measures.",
  ),
  preset(
    "Operations & process",
    "workflow-demo",
    "Workflow walkthrough",
    "demonstration",
    "Show a process moving from trigger through handoffs to checked completion.",
    "Use a realistic workflow, roles, decisions, exceptions, controls, and verification.",
  ),
  preset(
    "Operations & process",
    "operations-scenario",
    "Operational decision scenario",
    "scenario",
    "Respond to a short operational exception or coordination problem.",
    "Provide the event, evidence, constraints, affected roles, decision point, and escalation boundary.",
  ),
  preset(
    "Operations & process",
    "root-cause-case",
    "Root-cause case",
    "case",
    "Separate symptoms, possible causes, evidence, and test actions.",
    "Require a cause-evidence table, verification owners, risk, and a small test action.",
  ),
  preset(
    "Operations & process",
    "process-simulation",
    "Process simulation",
    "simulation",
    "Practise decisions and handoffs across a changing operational situation.",
    "Define roles, rounds, new information, decisions, output, and debrief criteria.",
  ),
  preset(
    "Operations & process",
    "operations-tool-lab",
    "Operations tool lab",
    "tool-lab",
    "Build or improve a workflow using confirmed software or equipment.",
    "Name the available tool, source inputs, steps, controls, required output, and fallback method.",
  ),
  preset(
    "Operations & process",
    "process-action-plan",
    "Process improvement plan",
    "action-plan",
    "Commit to one controlled process improvement experiment.",
    "Capture problem, change, owner, evidence, risk control, test date, and success measure.",
  ),
];

export function learningBlockPresetsForTrainingType(
  trainingType: TrainingType | null,
) {
  return trainingType
    ? learningBlockPresets.filter(
        (blockPreset) => blockPreset.trainingType === trainingType,
      )
    : [];
}

export const slideDeckBlueprintSchema = z.strictObject({
  version: z.literal(2),
  trainingType: z.enum(trainingTypes),
  selectedPresetIds: z.array(z.string().trim().min(1).max(80)).min(1).max(24),
}).superRefine((blueprint, context) => {
  const seen = new Set<string>();
  blueprint.selectedPresetIds.forEach((presetId, index) => {
    if (seen.has(presetId)) {
      context.addIssue({
        code: "custom",
        path: ["selectedPresetIds", index],
        message: "Slide content selections must be unique.",
      });
    }
    seen.add(presetId);
    const blockPreset = learningBlockPresets.find((item) => item.id === presetId);
    if (!blockPreset || blockPreset.trainingType !== blueprint.trainingType) {
      context.addIssue({
        code: "custom",
        path: ["selectedPresetIds", index],
        message: "Each selected slide content item must match the training type.",
      });
    }
  });
});

export type SlideDeckBlueprint = z.infer<typeof slideDeckBlueprintSchema>;

export function inferTrainingType(value: string): TrainingType {
  const text = value.toLowerCase();
  if (/\b(ai|artificial intelligence|chatgpt|prompt|digital|automation)\b/.test(text)) {
    return "AI";
  }
  if (/\b(sales|selling|customer|service|commercial|marketing|negotiation)\b/.test(text)) {
    return "Sales & customer service";
  }
  if (/\b(leadership|leader|manager|management|supervisor|coaching)\b/.test(text)) {
    return "Leadership & management";
  }
  if (/\b(finance|financial|accounting|budget|cost|analytics|excel)\b/.test(text)) {
    return "Finance & analytics";
  }
  if (/\b(operation|operations|process|logistics|supply chain|quality)\b/.test(text)) {
    return "Operations & process";
  }
  if (/\b(communication|presentation|teamwork|soft skill|emotional|time management)\b/.test(text)) {
    return "Soft skills & communication";
  }
  return "AI";
}

export function createDefaultSlideBlueprint(
  trainingType: TrainingType,
): SlideDeckBlueprint {
  return {
    version: 2,
    trainingType,
    selectedPresetIds: learningBlockPresetsForTrainingType(trainingType).map(
      (blockPreset) => blockPreset.id,
    ),
  };
}

export function normalizeSlideDeckBlueprint(
  value: unknown,
  starterTitle = "Module 1",
): SlideDeckBlueprint {
  const result = slideDeckBlueprintSchema.safeParse(value);
  if (result.success) return result.data;

  const legacy = value && typeof value === "object" && !Array.isArray(value)
    ? value as {
        trainingType?: unknown;
        modules?: Array<{ blocks?: Array<{ presetId?: unknown }> }>;
      }
    : null;
  const trainingType = trainingTypes.includes(legacy?.trainingType as TrainingType)
    ? legacy?.trainingType as TrainingType
    : inferTrainingType(starterTitle);
  const validPresetIds = new Set(
    learningBlockPresetsForTrainingType(trainingType).map((item) => item.id),
  );
  const selectedPresetIds = legacy?.modules
    ?.flatMap((module) => module.blocks ?? [])
    .map((block) => String(block.presetId ?? ""))
    .filter((presetId) => validPresetIds.has(presetId));

  return selectedPresetIds?.length
    ? { version: 2, trainingType, selectedPresetIds: [...new Set(selectedPresetIds)] }
    : createDefaultSlideBlueprint(trainingType);
}
