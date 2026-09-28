import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getTrainingPackage } from "@/features/training-packages/storage/training-storage";
import { getSolutionProposal } from "@/features/digital-solution-proposals/storage/solution-proposal-storage";
import { ensureDeliveryProjectForPackage, findDeliveryProjectByPackageId } from "@/features/delivery/storage/delivery-storage";
import type { ProposalStage } from "../domain";
import { ProjectRequestError } from "./errors";

export async function setProposalStage(id: string, kind: "training_package" | "system_proposal", status: ProposalStage) {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Proposal storage is unavailable.");
  if (kind === "system_proposal") {
    const proposal = await getSolutionProposal(id);
    if (!proposal) throw new ProjectRequestError("Proposal not found.", 404);
    const { error } = await supabase.from("intelligent_system_proposals").update({ sales_status: status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  const pkg = await getTrainingPackage(id);
  if (!pkg) throw new ProjectRequestError("Package not found.", 404);
  const delivery = await findDeliveryProjectByPackageId(id);
  if (delivery && status !== "Contracted" && status !== "Delivered") {
    throw new ProjectRequestError("Delete the linked delivery before moving this project out of Contracted or Delivered.", 409);
  }
  if (status === "Delivered") {
    if (!delivery) throw new ProjectRequestError("Mark the project Contracted to create Delivery before marking it Delivered.", 409);
    const { error } = await supabase.from("delivery_projects").update({ delivery_status: "Delivered", updated_at: new Date().toISOString() }).eq("id", delivery.id);
    if (error) throw new Error(error.message);
  } else if (status === "Contracted" && delivery?.deliveryStatus === "Delivered") {
    const { error } = await supabase.from("delivery_projects").update({ delivery_status: "Prepared", updated_at: new Date().toISOString() }).eq("id", delivery.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("training_packages").update({ sales_status: status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(error.message);
    try {
      if (status === "Contracted" && pkg.status === "Generated") await ensureDeliveryProjectForPackage({ ...pkg, salesStatus: status });
    } catch (error) {
      if (!delivery) await supabase.from("training_packages").update({ sales_status: pkg.salesStatus }).eq("id", id);
      throw error;
    }
  }
}
