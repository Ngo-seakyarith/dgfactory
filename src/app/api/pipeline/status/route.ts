import { NextResponse } from "next/server";

import { requireApproved } from "@/lib/route-guards";
import { saveAuditLog } from "@/lib/audit";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isProposalStage } from "@/features/pipeline/domain";
import { getTrainingPackage } from "@/features/training-packages/storage/training-storage";
import { getSolutionProposal } from "@/features/digital-solution-proposals/storage/solution-proposal-storage";
import {
  ensureDeliveryProjectForPackage,
  findDeliveryProjectByPackageId,
} from "@/features/delivery/storage/delivery-storage";

export async function PATCH(request: Request) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { id, kind, status } = body;
    if (
      typeof id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
      (kind !== "training_package" && kind !== "system_proposal") ||
      !isProposalStage(status)
    ) {
      return NextResponse.json({ error: "Invalid proposal or status." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) throw new Error("Proposal storage is unavailable.");

    if (kind === "training_package") {
      const pkg = await getTrainingPackage(id);
      if (!pkg) return NextResponse.json({ error: "Package not found." }, { status: 404 });
      if (pkg.status !== "Generated" && status !== "Not Sent") {
        return NextResponse.json({ error: "Generate the package before changing its proposal status." }, { status: 409 });
      }
      const delivery = await findDeliveryProjectByPackageId(id);
      if (delivery && status !== "Won" && status !== "Delivered") {
        return NextResponse.json({ error: "Delete the linked delivery before moving this proposal out of Won or Delivered." }, { status: 409 });
      }
      if (status === "Delivered") {
        if (!delivery) {
          return NextResponse.json({ error: "Mark the proposal Won to create Delivery before marking it Delivered." }, { status: 409 });
        }
        const { error } = await supabase.from("delivery_projects")
          .update({ delivery_status: "Delivered", updated_at: new Date().toISOString() }).eq("id", delivery.id);
        if (error) throw new Error(error.message);
      } else if (status === "Won" && delivery?.deliveryStatus === "Delivered") {
        const { error } = await supabase.from("delivery_projects")
          .update({ delivery_status: "Prepared", updated_at: new Date().toISOString() }).eq("id", delivery.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("training_packages").update({ sales_status: status, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) throw new Error(error.message);
        try {
          if (status === "Won") {
            await ensureDeliveryProjectForPackage({ ...pkg, salesStatus: status });
          }
        } catch (error) {
          if (!delivery) {
            await supabase.from("training_packages").update({ sales_status: pkg.salesStatus }).eq("id", id);
          }
          throw error;
        }
      }
    } else {
      const proposal = await getSolutionProposal(id);
      if (!proposal) return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
      if (proposal.status !== "Generated" && status !== "Not Sent") {
        return NextResponse.json({ error: "Generate the proposal before changing its proposal status." }, { status: 409 });
      }
      const { error } = await supabase.from("intelligent_system_proposals").update({ sales_status: status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw new Error(error.message);
    }

    await saveAuditLog({
      actor: auth.user.actor,
      action: "proposal_status_changed",
      entityType: kind,
      entityId: id,
      metadata: { status },
    });
    return NextResponse.json({ status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Proposal status could not be saved." },
      { status: 500 },
    );
  }
}
