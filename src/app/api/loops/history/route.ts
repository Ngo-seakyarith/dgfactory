import { NextResponse } from "next/server";

import { listLoopRuns } from "@/lib/loops/storage";
import { isLoopType } from "@/lib/loops/types";
import { requireApproved } from "@/lib/route-guards";

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Loop history request failed.";
}

export async function GET(request: Request) {
  const access = await requireApproved(request);

  if (!access.ok) {
    return access.response;
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
