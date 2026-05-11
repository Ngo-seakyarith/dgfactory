import { calculateOfferFitness } from "@/lib/adaptive-growth/fitness";
import type {
  AdaptiveGrowthData,
  ExperimentMetrics,
  GrowthExperiment,
  MarketSignal,
  OfferVariant,
} from "@/lib/adaptive-growth";
import { routeBrainTask } from "@/lib/brain/router";
import type { MasterAgentInput, MasterAgentOutput } from "@/lib/brain/agents/masterAgent";
import type { TextAgentOutput } from "@/lib/brain/agents";
import { classifyRiskyAction, type RiskClassification } from "@/lib/safety/riskClassifier";

export type AdaptiveGrowthWorkflowType =
  | "market_sensing"
  | "offer_mutation"
  | "experiment_design"
  | "fitness_evaluation"
  | "selection"
  | "replication"
  | "expansion"
  | "learning_genome"
  | "extinction";

export type AdaptiveGrowthWorkflowInput = {
  workflow: AdaptiveGrowthWorkflowType;
  goal: string;
  data?: Partial<AdaptiveGrowthData>;
  offer?: Partial<OfferVariant> | null;
  signal?: Partial<MarketSignal> | null;
  experiment?: Partial<GrowthExperiment> | null;
  metrics?: Partial<ExperimentMetrics> | null;
  proposedAction?: string;
  autonomyLevel?: string;
};

export type AdaptiveGrowthWorkflowResult = {
  workflow: AdaptiveGrowthWorkflowType;
  masterPlan: MasterAgentOutput;
  deterministicResult: Record<string, unknown>;
  agentRecommendation: string;
  risk: RiskClassification;
  requiresApproval: boolean;
};

function workflowToMasterWorkflow(
  workflow: AdaptiveGrowthWorkflowType,
): MasterAgentInput["workflow"] {
  if (workflow === "offer_mutation") return "create_offer_variants";
  if (workflow === "fitness_evaluation" || workflow === "selection") {
    return "evaluate_offer_fitness";
  }
  if (workflow === "replication" || workflow === "learning_genome") {
    return "replicate_winning_offer";
  }
  if (workflow === "market_sensing" || workflow === "expansion") {
    return "run_adaptive_loop";
  }
  if (workflow === "experiment_design") return "run_adaptive_loop";
  if (workflow === "extinction") return "evaluate_offer_fitness";
  return "run_adaptive_loop";
}

function agentTaskForWorkflow(workflow: AdaptiveGrowthWorkflowType) {
  const map = {
    market_sensing: "market_sensing",
    offer_mutation: "offer_mutation",
    experiment_design: "experiment_design",
    fitness_evaluation: "fitness_evaluation",
    selection: "selection_recommendation",
    replication: "offer_replication",
    expansion: "expansion_strategy",
    learning_genome: "learning_genome",
    extinction: "extinction_recommendation",
  } as const;

  return map[workflow];
}

function deterministicResultFor(input: AdaptiveGrowthWorkflowInput) {
  if (input.workflow === "fitness_evaluation" || input.workflow === "selection" || input.workflow === "extinction") {
    const fitness = calculateOfferFitness({
      offer: input.offer,
      signal: input.signal,
      experiment: input.experiment,
      metrics: input.metrics,
    });

    return {
      fitnessScore: fitness.fitnessScore,
      recommendation: fitness.recommendation,
      componentScores: fitness.componentScores,
      missingDataWarnings: fitness.missingDataWarnings,
      scoreCompletenessPercent: fitness.scoreCompletenessPercent,
      rationale: fitness.rationale,
    };
  }

  return {
    note: "No numerical deterministic calculation required for this workflow.",
  };
}

export async function runAdaptiveGrowthWorkflow(
  input: AdaptiveGrowthWorkflowInput,
): Promise<AdaptiveGrowthWorkflowResult> {
  const master = await routeBrainTask<MasterAgentInput, MasterAgentOutput>({
    taskType: "master_workflow",
    input: {
      goal: input.goal,
      workflow: workflowToMasterWorkflow(input.workflow),
      context: {
        workflow: input.workflow,
        proposedAction: input.proposedAction,
      },
      autonomyLevel: input.autonomyLevel,
    },
  });
  const deterministicResult = deterministicResultFor(input);
  const agentTask = agentTaskForWorkflow(input.workflow);
  const agent = await routeBrainTask<Record<string, unknown>, TextAgentOutput>({
    taskType: agentTask,
    input: {
      goal: input.goal,
      deterministicResult,
      data: input.data,
      offer: input.offer,
      signal: input.signal,
      experiment: input.experiment,
      metrics: input.metrics,
      safetyInstruction:
        "Do not execute risky changes. Recommend only; approval is required for Scaling, Productized, Killed, Client Visible, external sending, export with internal notes, or deletion.",
    },
  });
  const risk = classifyRiskyAction({
    actionType: input.proposedAction || input.workflow,
    payload: {
      workflow: input.workflow,
      deterministicResult,
      recommendation: deterministicResult.recommendation,
    },
  });

  return {
    workflow: input.workflow,
    masterPlan: master.output,
    deterministicResult,
    agentRecommendation: agent.output.content,
    risk,
    requiresApproval: master.output.requiresApproval || risk.requiresApproval,
  };
}
