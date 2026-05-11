import { NextResponse } from "next/server";

import { validateLoopRequest } from "@/lib/loops/auth";
import { runBusinessLoop } from "@/lib/loops/runner";
import { isLoopType, normalizeLoopPayload } from "@/lib/loops/types";

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Loop run request failed.";
}

export async function POST(request: Request) {
  const validation = validateLoopRequest(request);

  if (!validation.ok) {
    return validation.response;
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
