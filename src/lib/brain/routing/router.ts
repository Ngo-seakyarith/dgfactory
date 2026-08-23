import {
  generateStructuredOutput,
  type BrainResult,
} from "@/lib/brain/core/structuredOutput";
import {
  brainAgents,
  courseArchitectAgent,
  deliveryAgent,
  solutionReviewAgent,
  evaluationQuestionsAgent,
  facilitatorGuideAgent,
  promptLibraryAgent,
  digitalSolutionProposalAgent,
  syllabusProposalAgent,
  salesFollowUpAgent,
  slideAgent,
  workbookAgent,
  type BrainAgentDefinition,
  type BrainTaskType,
} from "@/lib/brain/agents";

const taskMap: Record<BrainTaskType, BrainAgentDefinition> = {
  course_package: courseArchitectAgent,
  slide_outline: slideAgent,
  workbook: workbookAgent,
  follow_up: salesFollowUpAgent,
  delivery_report: deliveryAgent,
  evaluation_questions: evaluationQuestionsAgent,
  facilitator_guide: facilitatorGuideAgent,
  prompt_library: promptLibraryAgent,
  solution_review: solutionReviewAgent,
  digital_solution_proposal: digitalSolutionProposalAgent,
  syllabus_to_training_proposal: syllabusProposalAgent,
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
