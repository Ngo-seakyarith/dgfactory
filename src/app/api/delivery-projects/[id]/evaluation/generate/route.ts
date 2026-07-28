import { generateDeliveryEvaluationQuestionsHandler } from "@/features/delivery/server/evaluation-handlers";
import { startGenerationJob } from "@/features/generation-jobs/server/start-job";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return generateDeliveryEvaluationQuestionsHandler(
    request,
    context,
    startGenerationJob,
  );
}
