import type { BrainAgentDefinition } from "@/lib/brain/agents";
import { masterAgentOutputSchema, type JsonSchema } from "@/lib/brain/schemas";

export const masterAgentWorkflows = [
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
] as const;

export type MasterAgentWorkflow = (typeof masterAgentWorkflows)[number];

export type MasterAgentInput = {
  goal: string;
  workflow?: MasterAgentWorkflow;
  context?: Record<string, unknown>;
};

export type MasterAgentOutput = {
  workflow: MasterAgentWorkflow;
  specialistAgents: string[];
  deterministicTools: string[];
  requiresApproval: boolean;
  riskLevel: "Low" | "Medium" | "High";
  nextStep: string;
};

const masterAgentInputSchema: JsonSchema = {
  type: "object",
  required: ["goal"],
  properties: {
    goal: { type: "string" },
    workflow: { type: "string" },
    context: { type: "object", properties: {} },
  },
};

function classifyWorkflow(input: MasterAgentInput): MasterAgentWorkflow {
  if (input.workflow && masterAgentWorkflows.includes(input.workflow)) {
    return input.workflow;
  }

  const goal = input.goal.toLowerCase();

  if (goal.includes("fitness") || goal.includes("score")) return "evaluate_offer_fitness";
  if (goal.includes("variant") || goal.includes("mutation")) return "create_offer_variants";
  if (goal.includes("replicate") || goal.includes("genome")) return "replicate_winning_offer";
  if (goal.includes("loop")) return "run_adaptive_loop";
  if (goal.includes("codex") || goal.includes("prd")) return "create_codex_improvement_task";
  if (goal.includes("qa") || goal.includes("review")) return "run_qa_review";
  if (goal.includes("follow")) return "create_follow_up_draft";
  if (goal.includes("delivery") || goal.includes("report")) return "create_delivery_report";
  if (goal.includes("pricing") || goal.includes("commercial")) return "generate_pricing_narrative";
  if (goal.includes("proposal")) return "generate_proposal";

  return "create_training_package";
}

function agentsForWorkflow(workflow: MasterAgentWorkflow) {
  const map: Record<MasterAgentWorkflow, string[]> = {
    create_training_package: [
      "chiefBrainAgent",
      "courseArchitectAgent",
      "proposalAgent",
      "slideAgent",
      "workbookAgent",
      "pricingNarrativeAgent",
      "salesFollowUpAgent",
      "qaAgent",
      "improvementAgent",
    ],
    generate_proposal: ["proposalAgent", "qaAgent"],
    generate_pricing_narrative: ["pricingNarrativeAgent", "qaAgent"],
    create_offer_variants: ["marketSensingAgent", "mutationAgent", "qaAgent"],
    evaluate_offer_fitness: ["fitnessEvaluatorAgent", "selectionAgent", "qaAgent"],
    replicate_winning_offer: ["replicationAgent", "learningGenomeAgent", "qaAgent"],
    run_adaptive_loop: ["marketSensingAgent", "selectionAgent", "expansionAgent", "qaAgent"],
    create_codex_improvement_task: ["improvementOpportunityAgent", "qaAgent"],
    run_qa_review: ["qaAgent"],
    create_follow_up_draft: ["salesFollowUpAgent", "qaAgent"],
    create_delivery_report: ["deliveryAgent", "qaAgent"],
  };

  return map[workflow];
}

function toolsForWorkflow(workflow: MasterAgentWorkflow) {
  const common = ["schemaValidation", "approvalRules", "auditLogging"];
  const map: Record<MasterAgentWorkflow, string[]> = {
    create_training_package: ["pricingCalculator", "knowledgeRetrieval", ...common],
    generate_proposal: ["knowledgeRetrieval", ...common],
    generate_pricing_narrative: ["pricingCalculator", "marginProtection", ...common],
    create_offer_variants: ["knowledgeRetrieval", "failedPatternSearch", ...common],
    evaluate_offer_fitness: ["calculateOfferFitness", "missingDataWarnings", ...common],
    replicate_winning_offer: ["knowledgeStorage", "clientSafeVisibilityCheck", ...common],
    run_adaptive_loop: ["loopRunner", "riskClassifier", ...common],
    create_codex_improvement_task: ["improvementPromptBuilder", ...common],
    run_qa_review: ["qaRubrics", ...common],
    create_follow_up_draft: ["externalSendingBlock", ...common],
    create_delivery_report: ["evaluationSummary", ...common],
  };

  return map[workflow];
}

function riskyWorkflow(workflow: MasterAgentWorkflow) {
  return [
    "replicate_winning_offer",
    "run_adaptive_loop",
    "create_codex_improvement_task",
  ].includes(workflow);
}

export const masterAgent: BrainAgentDefinition<MasterAgentInput, MasterAgentOutput> = {
  taskType: "master_workflow",
  name: "masterAgent",
  role: "Enterprise workflow coordinator",
  instructions:
    "Classify DG Academy goals into supported workflows, choose specialist agents, choose deterministic tools, require QA, and identify approval needs. Do not perform specialist work yourself. Do not approve risky actions.",
  inputSchema: masterAgentInputSchema,
  outputSchema: masterAgentOutputSchema,
};
