import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scopeAppData, withAppScope } from "@/lib/request-scope";
import {
  createDefaultDeliveryTasks,
  normalizeDeliveryMaterials,
  normalizeDeliveryProject,
  normalizeDeliveryTask,
  normalizeEvaluation,
  type DeliveryEvaluation,
  type DeliveryMaterials,
  type DeliveryProject,
  type DeliveryStatus,
  type DeliveryTask,
  type DeliveryTaskCategory,
  type DeliveryTaskStatus,
} from "@/features/delivery";
import type { TrainingPackage } from "@/features/training-packages/domain/training-package";

type DeliveryProjectRow = {
  id: string;
  opportunity_id: string | null;
  package_id: string | null;
  client_id: string | null;
  title: string;
  delivery_status:
    | DeliveryStatus
    | "Planning"
    | "Materials Preparation"
    | "Report Sent"
    | null;
  training_date: string | null;
  location: string | null;
  trainer_name: string | null;
  participant_count: number | null;
  notes: string | null;
  evaluation: Partial<DeliveryEvaluation> | null;
  materials: Partial<DeliveryMaterials> | null;
  post_training_report: string | null;
  created_at: string;
  updated_at: string;
};

function statusToRow(status: DeliveryStatus): DeliveryProjectRow["delivery_status"] {
  return status === "Preparing" ? "Planning" : status;
}

function statusFromRow(status: DeliveryProjectRow["delivery_status"]): DeliveryStatus {
  if (status === "Planning" || status === "Materials Preparation") {
    return "Preparing";
  }

  if (status === "Report Sent") {
    return "Delivered";
  }

  return status ?? "Preparing";
}

type DeliveryTaskRow = {
  id: string;
  delivery_project_id: string;
  title: string;
  category:
    | DeliveryTaskCategory
    | "Certificates"
    | "Post-training Report"
    | null;
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
    delivery_status: statusToRow(project.deliveryStatus),
    training_date: project.trainingDate || null,
    location: project.location,
    trainer_name: project.trainerName,
    participant_count: project.participantCount,
    notes: project.notes,
    evaluation: project.evaluation,
    materials: project.materials,
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
    deliveryStatus: statusFromRow(row.delivery_status),
    trainingDate: row.training_date ?? "",
    location: row.location ?? "",
    trainerName: row.trainer_name ?? "",
    participantCount: row.participant_count ?? 0,
    notes: row.notes ?? "",
    evaluation: normalizeEvaluation(row.evaluation),
    materials: normalizeDeliveryMaterials(row.materials),
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
    category:
      row.category === "Certificates" || row.category === "Post-training Report"
        ? "Follow-up"
        : row.category ?? "Materials",
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

  const query = supabase
    .from("delivery_projects")
    .select("*")
    .order("updated_at", { ascending: false });
  const { data, error } = await scopeAppData(query);

  if (error) {
    throw new Error(error.message);
  }

  return (data as DeliveryProjectRow[]).map(projectFromRow);
}

export async function getDeliveryProject(id: string) {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await scopeAppData(
      supabase.from("delivery_projects").select("*").eq("id", id),
    ).maybeSingle();

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
    .upsert(withAppScope(projectToRow(project)), { onConflict: "id" })
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

export async function findDeliveryProjectByPackageId(packageId: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to load delivery projects.");
  }

  const { data, error } = await scopeAppData(
    supabase
      .from("delivery_projects")
      .select("*")
      .eq("package_id", packageId)
      .order("created_at", { ascending: true })
      .limit(1),
  );

  if (error) {
    throw new Error(error.message);
  }

  const row = (data as DeliveryProjectRow[])[0];
  return row ? projectFromRow(row) : null;
}

export async function ensureDeliveryProjectForPackage(pkg: TrainingPackage) {
  const existing = await findDeliveryProjectByPackageId(pkg.id);

  if (existing) {
    return { project: existing, created: false as const };
  }

  const brief = pkg.proposalBrief;
  const scheduleDate = String(brief?.scheduleDate ?? "").trim();
  const scheduleVenue = String(brief?.scheduleVenue ?? "").trim();
  const project = normalizeDeliveryProject({
    packageId: pkg.id,
    clientId: pkg.clientId,
    title: pkg.title,
    deliveryStatus: "Syllabus Sent",
    trainingDate: /^\d{4}-\d{2}-\d{2}$/.test(scheduleDate) ? scheduleDate : "",
    location: scheduleVenue.toUpperCase() === "TBC" ? "" : scheduleVenue,
    trainerName: String(brief?.trainerName ?? "").trim(),
    participantCount: pkg.pricingInputs?.numberOfParticipants ?? 0,
  });

  const saved = await saveDeliveryProject(project);
  const tasks = createDefaultDeliveryTasks(saved.project.id);
  await Promise.all(tasks.map((task) => saveDeliveryTask(task)));

  return { project: saved.project, created: true as const };
}

export async function deleteDeliveryProject(id: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to delete delivery projects.");
  }

  const { error } = await scopeAppData(
    supabase.from("delivery_projects").delete().eq("id", id),
  );
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

  let query = scopeAppData(supabase.from("delivery_tasks").select("*").order("created_at"));

  if (deliveryProjectId) {
    query = query.eq("delivery_project_id", deliveryProjectId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data as DeliveryTaskRow[])
    .filter(
      (row) =>
        row.category !== "Certificates" &&
        row.category !== "Post-training Report",
    )
    .map(taskFromRow);
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
    .upsert(withAppScope(taskToRow(task)), { onConflict: "id" })
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

  const { error } = await scopeAppData(
    supabase.from("delivery_tasks").delete().eq("id", id),
  );
  if (error) {
    throw new Error(error.message);
  }
  return { deleted: true, storage: "supabase" as const };
}
