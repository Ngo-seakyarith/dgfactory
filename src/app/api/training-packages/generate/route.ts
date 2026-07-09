import { generateTrainingPackageRequest } from "@/features/training-packages/server/handlers";

export async function POST(request: Request) {
  return generateTrainingPackageRequest(request);
}
