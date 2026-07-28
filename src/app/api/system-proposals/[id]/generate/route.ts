import { generateSystemProposalRequest } from "@/features/intelligent-system-proposals/server/handlers";
import { startGenerationJob } from "@/features/generation-jobs/server/start-job";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return generateSystemProposalRequest(request, context, startGenerationJob);
}
