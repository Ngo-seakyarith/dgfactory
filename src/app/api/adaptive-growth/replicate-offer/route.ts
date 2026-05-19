import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import { replicateWinningOffer } from "@/lib/adaptive-growth/replicateWinningOffer";
import { requirePermission } from "@/lib/route-guards";

type ReplicateOfferBody = {
  offer_variant_id?: string;
  selection_decision_id?: string;
  package_id?: string | null;
  feedback?: string;
  include_package_assets?: boolean;
  include_sales_assets?: boolean;
  include_delivery_assets?: boolean;
};

export async function POST(request: Request) {
  const auth = await requirePermission(request, "manage_proposals");

  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json().catch(() => ({}))) as ReplicateOfferBody;

  if (!body.offer_variant_id || !body.selection_decision_id) {
    return NextResponse.json(
      { error: "offer_variant_id and selection_decision_id are required." },
      { status: 400 },
    );
  }

  try {
    const result = await replicateWinningOffer({
      offerVariantId: body.offer_variant_id,
      selectionDecisionId: body.selection_decision_id,
      packageId: body.package_id,
      feedback: body.feedback,
      includePackageAssets: body.include_package_assets ?? true,
      includeSalesAssets: body.include_sales_assets ?? true,
      includeDeliveryAssets: body.include_delivery_assets ?? true,
    });

    await saveAuditLog({
      actor: auth.user.actor,
      action: "adaptive_growth_offer_replicated",
      entityType: "adaptive_growth_offer",
      entityId: body.offer_variant_id,
      metadata: {
        selectionDecisionId: body.selection_decision_id,
        genomeItems: result.createdGenomeItems.length,
        templates: result.createdTemplates.length,
        mode: result.mode,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Offer replication failed.",
      },
      { status: 500 },
    );
  }
}
