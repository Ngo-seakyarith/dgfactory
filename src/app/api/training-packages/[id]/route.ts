import {
  deleteTrainingPackageRequest,
  getTrainingPackageRequest,
} from "@/features/training-packages/server/handlers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return getTrainingPackageRequest(request, params);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return deleteTrainingPackageRequest(request, params);
}
