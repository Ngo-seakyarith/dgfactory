import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ProjectRequestError } from "./errors";

export async function validateProjectForProposal(projectId: string | undefined, clientId: string | null, sourceId: string) {
  if (!projectId) return;
  z.uuid().parse(projectId);
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Project storage is unavailable.");
  const { data, error } = await supabase.from("client_projects").select("client_id,stage,training_package_id,system_proposal_id").eq("id", projectId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new ProjectRequestError("Project not found.", 404);
  if (data.client_id !== clientId) throw new ProjectRequestError("Use the project's selected client.", 409);
  const linkedId = data.training_package_id ?? data.system_proposal_id;
  if (linkedId && linkedId !== sourceId) throw new ProjectRequestError("This project already has a proposal.", 409);
  if (!linkedId && data.stage === "Delivered") throw new ProjectRequestError("A delivered project cannot create another proposal.", 409);
}

export async function trackClientProposal(kind: "training_package" | "system_proposal", sourceId: string, projectId?: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Project storage is unavailable.");
  const { error } = await supabase.rpc("track_client_proposal", { p_kind: kind, p_source_id: sourceId, p_project_id: projectId ?? null });
  if (error) throw new Error(error.message);
}
