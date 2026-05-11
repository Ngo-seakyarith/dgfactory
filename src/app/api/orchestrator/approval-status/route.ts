import { NextResponse } from "next/server";

import { validateOrchestratorRequest } from "@/lib/orchestrator/auth";
import { getApprovalRequest, listApprovalRequests } from "@/lib/orchestrator/storage";

export async function GET(request: Request) {
  const auth = validateOrchestratorRequest(request);

  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (id) {
    const approval = await getApprovalRequest(id);

    if (!approval) {
      return NextResponse.json(
        { error: "Approval request not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ approvalRequest: approval });
  }

  const approvals = await listApprovalRequests({ status: "Pending" });
  return NextResponse.json({ approvalRequests: approvals });
}
