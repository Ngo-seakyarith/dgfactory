import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ClientProject, ClientProjectInput } from "../project-domain";
import { setProposalStage } from "./proposal-stage";
import { ProjectRequestError } from "./errors";

export type ClientProjectRow = {
  id: string; client_id: string | null; title: string;
  project_type: ClientProjectInput["projectType"]; stage: ClientProjectInput["stage"];
  expected_outcomes: string; target_value: number | null; actual_value: number | null;
  payment_received_date: string | null;
  start_period: string; end_period: string; status_note: string;
  next_opportunities: string; next_action: string; notes: string;
  training_package_id: string | null; system_proposal_id: string | null;
  created_at: string; updated_at: string;
  clients?: { name: string; account_owner: string } | null;
};

export function projectFromRow(row: ClientProjectRow): ClientProject {
  return {
    id: row.id, clientId: row.client_id, clientName: row.clients?.name ?? "",
    clientOwner: row.clients?.account_owner ?? "",
    title: row.title, projectType: row.project_type, stage: row.stage,
    expectedOutcomes: row.expected_outcomes,
    targetValue: row.target_value === null ? null : Number(row.target_value),
    actualValue: row.actual_value === null ? null : Number(row.actual_value),
    paymentReceivedDate: row.payment_received_date ?? null,
    startPeriod: row.start_period, endPeriod: row.end_period, statusNote: row.status_note,
    nextOpportunities: row.next_opportunities, nextAction: row.next_action,
    notes: row.notes, trainingPackageId: row.training_package_id, systemProposalId: row.system_proposal_id,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export function projectToRow(input: ClientProjectInput) {
  return {
    client_id: input.clientId, title: input.title, project_type: input.projectType,
    stage: input.stage, expected_outcomes: input.expectedOutcomes, target_value: input.targetValue,
    actual_value: input.actualValue, start_period: input.startPeriod, end_period: input.endPeriod,
    ...(input.paymentReceivedDate === undefined ? {} : { payment_received_date: input.paymentReceivedDate }),
    status_note: input.statusNote, next_opportunities: input.nextOpportunities,
    next_action: input.nextAction, notes: input.notes, training_package_id: input.trainingPackageId,
    system_proposal_id: input.systemProposalId,
  };
}

function database() {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Project storage is unavailable.");
  return supabase;
}

const selection = "*,clients(name,account_owner)";

export async function listClientProjects() {
  const { data, error } = await database().from("client_projects").select(selection).order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ClientProjectRow[]).map(projectFromRow);
}

export async function getClientProject(id: string) {
  const { data, error } = await database().from("client_projects").select(selection).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? projectFromRow(data as ClientProjectRow) : null;
}

export async function saveClientProject(input: ClientProjectInput, id?: string) {
  const supabase = database();
  // Proposal links are immutable here; generation attaches a proposal to an existing project.
  const previous = id ? await getClientProject(id) : null;
  if (id && !previous) throw new ProjectRequestError("Project not found.", 404);
  if (input.trainingPackageId !== (previous?.trainingPackageId ?? null) || input.systemProposalId !== (previous?.systemProposalId ?? null)) {
    throw new ProjectRequestError("Use proposal generation to link a proposal to this project.");
  }
  if (previous?.clientId && (previous.trainingPackageId || previous.systemProposalId) && input.clientId !== previous.clientId) {
    throw new ProjectRequestError("A linked proposal and project must use the same client.", 409);
  }
  const { data: client, error: clientError } = await supabase.from("clients").select("id,name").eq("id", input.clientId).maybeSingle();
  if (clientError) throw new Error(clientError.message);
  if (!client) throw new ProjectRequestError("Client not found.", 404);
  if (previous && !previous.clientId && (previous.trainingPackageId || previous.systemProposalId)) {
    const { error } = await supabase.from(previous.trainingPackageId ? "training_packages" : "intelligent_system_proposals")
      .update({ client_id: client.id, client_name: client.name, updated_at: new Date().toISOString() })
      .eq("id", previous.trainingPackageId ?? previous.systemProposalId!);
    if (error) throw new Error(error.message);
  }
  if (previous && input.stage !== previous.stage) {
    const sourceId = previous.trainingPackageId ?? previous.systemProposalId;
    if (sourceId) await setProposalStage(sourceId, previous.trainingPackageId ? "training_package" : "system_proposal", input.stage);
  }
  const row = { ...projectToRow(input), updated_at: new Date().toISOString() };
  const { data, error } = await (id
    ? supabase.from("client_projects").update(row).eq("id", id)
    : supabase.from("client_projects").insert(row)
  ).select(selection).single();
  if (error) throw new Error(error.message);
  return projectFromRow(data as ClientProjectRow);
}

export async function deleteClientProject(id: string) {
  const project = await getClientProject(id);
  if (!project) throw new ProjectRequestError("Project not found.", 404);
  if (project.trainingPackageId || project.systemProposalId) {
    throw new ProjectRequestError("Delete the linked proposal first. Project deletion never deletes proposals or deliveries.", 409);
  }
  const { error } = await database().from("client_projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
