import { generateDeliveryMaterialHandler } from "@/features/delivery/server/materials-handlers";
import { startGenerationJob } from "@/features/generation-jobs/server/start-job";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return generateDeliveryMaterialHandler(request, context, startGenerationJob);
}
