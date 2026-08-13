import { runSolutionReviewRequest } from "@/features/digital-solution-proposals/server/handlers";
import { startGenerationJob } from "@/features/generation-jobs/server/start-job";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return runSolutionReviewRequest(request, context, startGenerationJob);
}
