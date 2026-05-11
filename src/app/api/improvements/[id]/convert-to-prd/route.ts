import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import {
  getImprovementOpportunity,
  saveImprovementOpportunity,
} from "@/lib/improvement-storage";
import { appendImprovementToPrd } from "@/lib/ralph";
import { requirePermission } from "@/lib/route-guards";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requirePermission(request, "manage_proposals");

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const opportunity = await getImprovementOpportunity(id);

  if (!opportunity) {
    return NextResponse.json({ error: "Improvement not found." }, { status: 404 });
  }

  if (opportunity.status !== "Approved" && opportunity.status !== "Converted to PRD") {
    return NextResponse.json(
      { error: "Approve the improvement before converting it to a Ralph story." },
      { status: 400 },
    );
  }

  const result = await appendImprovementToPrd(opportunity);
  const saved = await saveImprovementOpportunity({
    ...opportunity,
    status: "Converted to PRD",
  });

  await saveAuditLog({
    actor: auth.user.actor,
    action: "improvement_converted_to_prd",
    entityType: "improvement_opportunity",
    entityId: opportunity.id,
    metadata: {
      storyId: result.story.id,
      written: result.written,
      storage: saved.storage,
    },
  });

  return NextResponse.json({
    ...result,
    opportunity: saved.opportunity,
  });
}
