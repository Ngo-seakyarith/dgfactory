import { generateTrainingPackageRequest } from "@/features/training-packages/server/handlers";
import { startGenerationJob } from "@/features/generation-jobs/server/start-job";

export async function POST(request: Request) {
  return generateTrainingPackageRequest(request, startGenerationJob);
}
