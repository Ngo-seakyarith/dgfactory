import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  normalizeDeliveryProject,
  normalizeDeliveryTask,
  normalizeEvaluation,
  type DeliveryEvaluation,
  type DeliveryProject,
  type DeliveryStatus,
  type DeliveryTask,
  type DeliveryTaskCategory,
  type DeliveryTaskStatus,
} from "@/lib/delivery";

type DeliveryProjectRow = {
  id: string;
  opportunity_id: string | null;
  package_id: string | null;
  client_id: string | null;
  title: string;
  delivery_status: DeliveryStatus | null;
  training_date: string | null;
  location: string | null;
  trainer_name: string | null;
  participant_count: number | null;
  notes: string | null;
  evaluation: Partial<DeliveryEvaluation> | null;
  post_training_report: string | null;
  created_at: string;
  updated_at: string;
};

type DeliveryTaskRow = {
  id: string;
  delivery_project_id: string;
  title: string;
  category: DeliveryTaskCategory | null;
  status: DeliveryTaskStatus | null;
  due_date: string | null;
  owner: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function projectToRow(project: DeliveryProject) {
  return {
    id: project.id,
    opportunity_id: project.opportunityId,
    package_id: project.packageId,
    client_id: project.clientId,
    title: project.title,
    delivery_status: project.deliveryStatus,
    training_date: project.trainingDate || null,
    location: project.location,
    trainer_name: project.trainerName,
    participant_count: project.participantCount,
    notes: project.notes,
    evaluation: project.evaluation,
    post_training_report: project.postTrainingReport,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };
}

function projectFromRow(row: DeliveryProjectRow): DeliveryProject {
  return normalizeDeliveryProject({
    id: row.id,
    opportunityId: row.opportunity_id,
    packageId: row.package_id,
    clientId: row.client_id,
    title: row.title,
    deliveryStatus: row.delivery_status ?? "Planning",
    trainingDate: row.training_date ?? "",
    location: row.location ?? "",
    trainerName: row.trainer_name ?? "",
    participantCount: row.participant_count ?? 0,
    notes: row.notes ?? "",
    evaluation: normalizeEvaluation(row.evaluation),
    postTrainingReport: row.post_training_report ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function taskToRow(task: DeliveryTask) {
  return {
    id: task.id,
    delivery_project_id: task.deliveryProjectId,
    title: task.title,
    category: task.category,
    status: task.status,
    due_date: task.dueDate || null,
    owner: task.owner,
    notes: task.notes,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  };
}

function taskFromRow(row: DeliveryTaskRow): DeliveryTask {
  return normalizeDeliveryTask({
    id: row.id,
    deliveryProjectId: row.delivery_project_id,
    title: row.title,
    category: row.category ?? "Materials",
    status: row.status ?? "Open",
    dueDate: row.due_date ?? "",
    owner: row.owner ?? "",
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export async function listDeliveryProjects() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to list delivery projects.");
  }

  const { data, error } = await supabase
    .from("delivery_projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as DeliveryProjectRow[]).map(projectFromRow);
}

export async function getDeliveryProject(id: string) {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("delivery_projects")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      return projectFromRow(data as DeliveryProjectRow);
    }
  }

  throw new Error("Supabase is required to load delivery projects.");
}

export async function saveDeliveryProject(input: Partial<DeliveryProject>) {
  const project = normalizeDeliveryProject({
    ...input,
    updatedAt: new Date().toISOString(),
  });
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to save delivery projects.");
  }

  const { data, error } = await supabase
    .from("delivery_projects")
    .upsert(projectToRow(project), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    project: projectFromRow(data as DeliveryProjectRow),
    storage: "supabase" as const,
  };
}

export async function deleteDeliveryProject(id: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to delete delivery projects.");
  }

  const { error } = await supabase.from("delivery_projects").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  return { deleted: true, storage: "supabase" as const };
}

export async function listDeliveryTasks(deliveryProjectId?: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to list delivery tasks.");
  }

  let query = supabase.from("delivery_tasks").select("*").order("created_at");

  if (deliveryProjectId) {
    query = query.eq("delivery_project_id", deliveryProjectId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data as DeliveryTaskRow[]).map(taskFromRow);
}

export async function saveDeliveryTask(input: Partial<DeliveryTask>) {
  const task = normalizeDeliveryTask({
    ...input,
    updatedAt: new Date().toISOString(),
  });
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to save delivery tasks.");
  }

  const { data, error } = await supabase
    .from("delivery_tasks")
    .upsert(taskToRow(task), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { task: taskFromRow(data as DeliveryTaskRow), storage: "supabase" as const };
}

export async function deleteDeliveryTask(id: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to delete delivery tasks.");
  }

  const { error } = await supabase.from("delivery_tasks").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  return { deleted: true, storage: "supabase" as const };
}
