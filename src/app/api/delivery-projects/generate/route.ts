import { generateDeliveryDraftHandler } from "@/features/delivery/server/handlers";
import { startGenerationJob } from "@/features/generation-jobs/server/start-job";

export async function POST(request: Request) {
  return generateDeliveryDraftHandler(request, startGenerationJob);
}
