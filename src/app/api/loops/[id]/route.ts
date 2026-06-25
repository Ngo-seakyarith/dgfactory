import { NextResponse } from "next/server";

import { getLoopRun } from "@/lib/loops/storage";
import { requireApproved } from "@/lib/route-guards";

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Loop run request failed.";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await requireApproved(request);

  if (!access.ok) {
    return access.response;
  }

  try {
    const { id } = await context.params;
    const run = await getLoopRun(id);

    if (!run) {
      return NextResponse.json({ error: "Loop run not found." }, { status: 404 });
    }

    return NextResponse.json({ run });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
