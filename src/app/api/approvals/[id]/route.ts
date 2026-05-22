import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import {
  getApprovalRequest,
  isApprovalStatus,
  updateApprovalRequest,
} from "@/lib/approvals";
import { requireApproved } from "@/lib/route-guards";

type Context = {
  params: Promise<{ id: string }>;
};

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Approval update failed.";
}

export async function GET(request: Request, context: Context) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const approval = await getApprovalRequest(id);

    if (!approval) {
      return NextResponse.json(
        { error: "Approval request not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ approval });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: Context) {
  const auth = await requireApproved(request);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      status?: unknown;
      humanNote?: unknown;
    };

    if (!isApprovalStatus(body.status)) {
      return NextResponse.json(
        { error: "A valid approval status is required." },
        { status: 400 },
      );
    }

    const result = await updateApprovalRequest({
      id,
      status: body.status,
      humanNote: typeof body.humanNote === "string" ? body.humanNote : "",
    });

    await saveAuditLog({
      actor: auth.user.actor,
      action: "approval_decision",
      entityType: "approval_request",
      entityId: result.approval.id,
      metadata: {
        actionType: result.approval.actionType,
        status: result.approval.status,
        riskLevel: result.approval.riskLevel,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
