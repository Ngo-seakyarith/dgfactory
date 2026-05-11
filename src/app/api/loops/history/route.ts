import { NextResponse } from "next/server";

import { validateLoopRequest } from "@/lib/loops/auth";
import { listLoopRuns } from "@/lib/loops/storage";
import { isLoopType } from "@/lib/loops/types";

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Loop history request failed.";
}

export async function GET(request: Request) {
  const validation = validateLoopRequest(request);

  if (!validation.ok) {
    return validation.response;
  }

  try {
    const url = new URL(request.url);
    const loopType = url.searchParams.get("loopType");
    const runs = await listLoopRuns({
      loopType: isLoopType(loopType) ? loopType : undefined,
    });

    return NextResponse.json({ runs });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
