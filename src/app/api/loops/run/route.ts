import { NextResponse } from "next/server";

import { runBusinessLoop } from "@/lib/loops/runner";
import { isLoopType, normalizeLoopPayload } from "@/lib/loops/types";
import { requireApproved } from "@/lib/route-guards";

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Loop run request failed.";
}

export async function POST(request: Request) {
  const access = await requireApproved(request);

  if (!access.ok) {
    return access.response;
  }

  try {
    const body = await request.json().catch(() => ({}));

    if (!isLoopType(body.loopType)) {
      return NextResponse.json(
        { error: "Invalid loopType provided." },
        { status: 400 },
      );
    }

    const run = await runBusinessLoop({
      loopType: body.loopType,
      input: normalizeLoopPayload(body.input),
    });

    return NextResponse.json({ run });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
