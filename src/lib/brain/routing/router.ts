import {
  generateStructuredOutput,
  type BrainResult,
} from "@/lib/brain/core/structuredOutput";
import {
  adaptiveGrowthRecommendationsAgent,
  brainAgents,
  courseArchitectAgent,
  deliveryAgent,
  dataDiscoveryAgent,
  evaluationQuestionsAgent,
  experimentDesignerAgent,
  expansionAgent,
  extinctionAgent,
  fitnessEvaluatorAgent,
  improvementAgent,
  improvementOpportunityAgent,
  intelligentSystemProposalAgent,
  learningGenomeAgent,
  marketSensingAgent,
  mutationAgent,
  pricingNarrativeAgent,
  proposalAgent,
  qaAgent,
  replicationAgent,
  salesFollowUpAgent,
  selectionAgent,
  slideAgent,
  workbookAgent,
  type BrainAgentDefinition,
  type BrainTaskType,
} from "@/lib/brain/agents";
import { masterAgent } from "@/lib/brain/agents/masterAgent";

const taskMap: Record<BrainTaskType, BrainAgentDefinition> = {
  master_workflow: masterAgent,
  course_package: courseArchitectAgent,
  proposal: proposalAgent,
  pricing_narrative: pricingNarrativeAgent,
  slide_outline: slideAgent,
  workbook: workbookAgent,
  follow_up: salesFollowUpAgent,
  delivery_report: deliveryAgent,
  evaluation_questions: evaluationQuestionsAgent,
  qa_review: qaAgent,
  improvement_suggestion: improvementAgent,
  offer_mutation: mutationAgent,
  offer_replication: replicationAgent,
  improvement_opportunity: improvementOpportunityAgent,
  adaptive_growth_recommendations: adaptiveGrowthRecommendationsAgent,
  market_sensing: marketSensingAgent,
  experiment_design: experimentDesignerAgent,
  fitness_evaluation: fitnessEvaluatorAgent,
  selection_recommendation: selectionAgent,
  expansion_strategy: expansionAgent,
  learning_genome: learningGenomeAgent,
  extinction_recommendation: extinctionAgent,
  data_discovery: dataDiscoveryAgent,
  intelligent_system_proposal: intelligentSystemProposalAgent,
};

export function getAgentForTask(taskType: BrainTaskType) {
  return taskMap[taskType];
}

export function listBrainAgents() {
  return brainAgents;
}

export async function routeBrainTask<TInput, TOutput>({
  taskType,
  input,
  retries,
}: {
  taskType: BrainTaskType;
  input: TInput;
  retries?: number;
}): Promise<BrainResult<TOutput>> {
  const agent = getAgentForTask(taskType) as BrainAgentDefinition<TInput, TOutput>;

  return generateStructuredOutput({
    agent,
    input,
    retries,
  });
}
