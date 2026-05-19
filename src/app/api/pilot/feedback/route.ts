import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import { getAuthenticatedRequestUser } from "@/lib/auth-production";
import { listPilotFeedback, savePilotFeedback } from "@/lib/pilot-storage";

export async function GET() {
  const feedback = await listPilotFeedback();
  return NextResponse.json({ feedback });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedRequestUser(request);
  const body = await request.json().catch(() => ({}));

  const result = await savePilotFeedback({
    rating: body.rating,
    whatWorked: body.whatWorked,
    whatWasConfusing: body.whatWasConfusing,
    whatShouldImprove: body.whatShouldImprove,
    urgency: body.urgency,
    relatedFeature: body.relatedFeature,
    relatedPage: body.relatedPage,
    relatedPackageId: body.relatedPackageId,
    relatedOpportunityId: body.relatedOpportunityId,
    createdBy: body.createdBy || user.actor,
  });

  await saveAuditLog({
    actor: user.actor,
    action: "pilot_feedback_submitted",
    entityType: "pilot_feedback",
    entityId: result.feedback.id,
    metadata: {
      rating: result.feedback.rating,
      urgency: result.feedback.urgency,
      relatedFeature: result.feedback.relatedFeature,
      relatedPage: result.feedback.relatedPage,
    },
  });

  return NextResponse.json(result);
}
