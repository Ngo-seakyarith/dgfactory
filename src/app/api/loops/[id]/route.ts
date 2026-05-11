import { NextResponse } from "next/server";

import { validateLoopRequest } from "@/lib/loops/auth";
import { getLoopRun } from "@/lib/loops/storage";

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Loop run request failed.";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const validation = validateLoopRequest(request);

  if (!validation.ok) {
    return validation.response;
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
