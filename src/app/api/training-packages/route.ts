import {
  listTrainingPackagesRequest,
  saveTrainingPackageRequest,
} from "@/features/training-packages/server/handlers";

export async function GET(request: Request) {
  return listTrainingPackagesRequest(request);
}

export async function POST(request: Request) {
  return saveTrainingPackageRequest(request);
}
