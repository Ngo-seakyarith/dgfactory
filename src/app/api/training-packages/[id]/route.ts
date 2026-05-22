import { NextResponse } from "next/server";

import { deleteTrainingPackage, getTrainingPackage } from "@/lib/training-storage";
import { requireApproved } from "@/lib/route-guards";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const pkg = await getTrainingPackage(id);

  if (!pkg) {
    return NextResponse.json(
      { error: "Training package was not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ package: pkg });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const result = await deleteTrainingPackage(id);

  return NextResponse.json(result);
}
