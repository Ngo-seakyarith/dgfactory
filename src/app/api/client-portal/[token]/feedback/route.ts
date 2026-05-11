import { NextResponse, type NextRequest } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import {
  getPortalItemForClient,
  saveClientFeedback,
  validatePortalToken,
} from "@/lib/client-portal/storage";
import { isPortalDecisionStatus } from "@/lib/client-portal/types";
import { listOpportunities, saveOpportunity } from "@/lib/crm-storage";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const validation = await validatePortalToken(token);

  if (validation.status !== "valid") {
    return NextResponse.json(
      { error: `Client portal access is ${validation.status.replace("_", " ")}.` },
      { status: validation.status === "not_found" ? 404 : 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    portalItemId?: string;
    relatedItemType?: string;
    relatedItemId?: string;
    rating?: number;
    comments?: string;
    requestedChanges?: string;
    decisionStatus?: string;
    nextStepPreference?: string;
  };
  const portalItem = body.portalItemId
    ? await getPortalItemForClient(validation.access.clientId, body.portalItemId)
    : null;
  const relatedItemType = portalItem?.itemType ?? body.relatedItemType ?? "Feedback Form";
  const relatedItemId =
    portalItem?.itemId ?? body.relatedItemId ?? validation.access.clientId;

  if (!body.comments && !body.requestedChanges && !body.decisionStatus) {
    return NextResponse.json(
      { error: "Please add comments, requested changes, or a decision status." },
      { status: 400 },
    );
  }

  const saved = await saveClientFeedback({
    clientId: validation.access.clientId,
    relatedItemType,
    relatedItemId,
    rating: body.rating ?? null,
    comments: body.comments ?? "",
    requestedChanges: body.requestedChanges ?? "",
    decisionStatus: isPortalDecisionStatus(body.decisionStatus)
      ? body.decisionStatus
      : "",
    nextStepPreference: body.nextStepPreference ?? "",
  });

  if (
    saved.feedback.decisionStatus &&
    (portalItem?.itemType === "Proposal" || relatedItemType === "Proposal")
  ) {
    const opportunities = await listOpportunities();
    const linked = opportunities.find(
      (opportunity) =>
        opportunity.clientId === validation.access.clientId &&
        opportunity.linkedPackageId === relatedItemId,
    );
    const nextStatus =
      saved.feedback.decisionStatus === "Approved"
        ? "Negotiation"
        : saved.feedback.decisionStatus === "Needs Revision"
          ? "Proposal Draft"
          : saved.feedback.decisionStatus === "Not Approved"
            ? "Lost"
            : "Proposal Sent";

    if (linked) {
      await saveOpportunity({
        ...linked,
        status: nextStatus,
        notes: `${linked.notes}\n\nClient portal decision: ${saved.feedback.decisionStatus}. ${saved.feedback.comments}`.trim(),
      });
    }
  }

  await saveAuditLog({
    actor: validation.access.contactEmail || "Client portal visitor",
    action: "client_feedback_submitted",
    entityType: relatedItemType,
    entityId: relatedItemId,
    metadata: {
      clientId: validation.access.clientId,
      decisionStatus: saved.feedback.decisionStatus || null,
      storage: saved.storage,
    },
  });

  return NextResponse.json({
    feedback: saved.feedback,
    storage: saved.storage,
  });
}
