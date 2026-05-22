import { NextResponse } from "next/server";

import { isApprovalStatus, listApprovalRequests } from "@/lib/approvals";
import { requireApproved } from "@/lib/route-guards";

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Approval request failed.";
}

export async function GET(request: Request) {
  const auth = await requireApproved(request);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const approvals = await listApprovalRequests({
      status: isApprovalStatus(status) ? status : undefined,
    });

    return NextResponse.json({ approvals });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
