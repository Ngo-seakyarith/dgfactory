import { exportTrainingPackageRequest } from "@/features/training-packages/server/handlers";

export async function POST(request: Request) {
  return exportTrainingPackageRequest(request);
}
