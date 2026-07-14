"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  CalendarCheck,
  Clipboard,
  FileText,
  Loader2,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createDefaultDeliveryTasks,
  createEmptyDeliveryProject,
  deliveryStatuses,
  deliveryTaskCategories,
  deliveryTaskStatuses,
  normalizeDeliveryProject,
  normalizeDeliveryTask,
  type DeliveryDraft,
  type DeliveryDraftKind,
  type DeliveryProject,
  type DeliveryStatus,
  type DeliveryTask,
} from "@/features/delivery";
import {
  normalizeClient,
  normalizeOpportunity,
  type Client,
  type Opportunity,
} from "@/lib/crm";
import type { TrainingPackage } from "@/features/training-packages";
import { PilotFeedbackButton } from "@/app/pilot/_components/pilot-feedback-button";

function useDeliveryData() {
  const [projects, setProjects] = useState<DeliveryProject[]>([]);
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [packages, setPackages] = useState<TrainingPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState("Loading delivery projects...");

  async function refresh() {
    try {
      const [
        projectsResponse,
        tasksResponse,
        clientsResponse,
        opportunitiesResponse,
        packagesResponse,
      ] = await Promise.all([
        fetch("/api/delivery-projects", { cache: "no-store" }),
        fetch("/api/delivery-tasks", { cache: "no-store" }),
        fetch("/api/clients", { cache: "no-store" }),
        fetch("/api/opportunities", { cache: "no-store" }),
        fetch("/api/training-packages", { cache: "no-store" }),
      ]);
      const projectsPayload = (await projectsResponse.json()) as {
        projects?: DeliveryProject[];
        error?: string;
      };
      const tasksPayload = (await tasksResponse.json()) as {
        tasks?: DeliveryTask[];
        error?: string;
      };
      const clientsPayload = (await clientsResponse.json()) as {
        clients?: Client[];
        error?: string;
      };
      const opportunitiesPayload = (await opportunitiesResponse.json()) as {
        opportunities?: Opportunity[];
        error?: string;
      };
      const packagesPayload = (await packagesResponse.json()) as {
        packages?: TrainingPackage[];
        error?: string;
      };

      if (!projectsResponse.ok) throw new Error(projectsPayload.error ?? "Delivery project database read failed.");
      if (!tasksResponse.ok) throw new Error(tasksPayload.error ?? "Delivery task database read failed.");
      if (!clientsResponse.ok) throw new Error(clientsPayload.error ?? "Client database read failed.");
      if (!opportunitiesResponse.ok) throw new Error(opportunitiesPayload.error ?? "Opportunity database read failed.");
      if (!packagesResponse.ok) throw new Error(packagesPayload.error ?? "Package database read failed.");

      setProjects(projectsPayload.projects ?? []);
      setTasks(tasksPayload.tasks ?? []);
      setClients(clientsPayload.clients ?? []);
      setOpportunities(opportunitiesPayload.opportunities ?? []);
      setPackages(packagesPayload.packages ?? []);
      setNotice("Showing Supabase-backed delivery records.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Database read was unavailable.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    projects,
    setProjects,
    tasks,
    setTasks,
    clients,
    opportunities,
    packages,
    isLoading,
    notice,
    refresh,
  };
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const variant =
    status === "Completed" || status === "Delivered" || status === "Report Sent"
      ? "teal"
      : status === "Cancelled"
        ? "outline"
        : "gold";

  return <Badge variant={variant}>{status}</Badge>;
}

export function DeliveryProjectForm({
  existingProject,
}: {
  existingProject?: DeliveryProject;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clients, opportunities, packages } = useDeliveryData();
  const opportunityIdFromQuery = searchParams.get("opportunityId") ?? "";
  const packageIdFromQuery = searchParams.get("packageId") ?? "";
  const clientIdFromQuery = searchParams.get("clientId") ?? "";
  const sourceOpportunity = useMemo(
    () => opportunities.find((item) => item.id === opportunityIdFromQuery),
    [opportunities, opportunityIdFromQuery],
  );
  const sourcePackage = useMemo(
    () =>
      packages.find(
        (pkg) =>
          pkg.id === (sourceOpportunity?.linkedPackageId ?? packageIdFromQuery),
      ),
    [packageIdFromQuery, packages, sourceOpportunity],
  );
  const [project, setProject] = useState<DeliveryProject>(() =>
    existingProject ??
    createEmptyDeliveryProject({
      opportunityId: opportunityIdFromQuery || null,
      packageId: (sourcePackage?.id ?? packageIdFromQuery) || null,
      clientId: sourceOpportunity?.clientId || clientIdFromQuery || null,
      title: sourcePackage?.title ?? sourceOpportunity?.title ?? "",
      participantCount: sourcePackage?.pricingInputs.numberOfParticipants ?? 0,
    }),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (existingProject) {
      return;
    }

    setProject((current) => ({
      ...current,
      opportunityId: current.opportunityId ?? (opportunityIdFromQuery || null),
      packageId:
        current.packageId ?? ((sourcePackage?.id ?? packageIdFromQuery) || null),
      clientId:
        current.clientId ??
        sourceOpportunity?.clientId ??
        (clientIdFromQuery || null),
      title: current.title || sourcePackage?.title || sourceOpportunity?.title || "",
      participantCount:
        current.participantCount ||
        sourcePackage?.pricingInputs.numberOfParticipants ||
        0,
    }));
  }, [
    clientIdFromQuery,
    existingProject,
    opportunityIdFromQuery,
    packageIdFromQuery,
    sourceOpportunity,
    sourcePackage,
  ]);

  function updateField<K extends keyof DeliveryProject>(
    key: K,
    value: DeliveryProject[K],
  ) {
    setProject((current) => ({ ...current, [key]: value }));
  }

  async function saveProject() {
    setIsSaving(true);
    setNotice("");

    const projectToSave = normalizeDeliveryProject({
      ...project,
      updatedAt: new Date().toISOString(),
    });

    try {
      const response = await fetch("/api/delivery-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectToSave),
      });
      const payload = (await response.json()) as {
        project?: DeliveryProject;
        error?: string;
      };

      if (!response.ok || !payload.project) {
        throw new Error(payload.error ?? "Delivery project save failed.");
      }

      if (!existingProject) {
        const defaultTasks = createDefaultDeliveryTasks(payload.project.id);
        await Promise.all(
          defaultTasks.map(async (task) => {
            const taskResponse = await fetch("/api/delivery-tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(task),
            });
            if (!taskResponse.ok) {
              const taskPayload = (await taskResponse.json().catch(() => ({}))) as { error?: string };
              throw new Error(taskPayload.error ?? "Default delivery task save failed.");
            }
          }),
        );
      }

      router.push(`/delivery/${payload.project.id}`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Delivery project saved locally only.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardTitle>
          {existingProject ? "Edit Delivery Project" : "New Delivery Project"}
        </CardTitle>
        <CardDescription>
          Manage preparation, execution, evaluation, certificates, and reporting.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Project title">
          <Input
            value={project.title}
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="AI Leadership Training delivery"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client">
            <Select
              value={project.clientId ?? ""}
              onChange={(event) => updateField("clientId", event.target.value || null)}
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Opportunity">
            <Select
              value={project.opportunityId ?? ""}
              onChange={(event) =>
                updateField("opportunityId", event.target.value || null)
              }
            >
              <option value="">No linked opportunity</option>
              {opportunities.map((opportunity) => (
                <option key={opportunity.id} value={opportunity.id}>
                  {opportunity.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Training package">
            <Select
              value={project.packageId ?? ""}
              onChange={(event) => updateField("packageId", event.target.value || null)}
            >
              <option value="">No linked package</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Delivery status">
            <Select
              value={project.deliveryStatus}
              onChange={(event) =>
                updateField("deliveryStatus", event.target.value as DeliveryStatus)
              }
            >
              {deliveryStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Training date">
            <Input
              type="date"
              value={project.trainingDate}
              onChange={(event) => updateField("trainingDate", event.target.value)}
            />
          </Field>
          <Field label="Location">
            <Input
              value={project.location}
              onChange={(event) => updateField("location", event.target.value)}
              placeholder="Client office, hotel venue, Zoom"
            />
          </Field>
          <Field label="Trainer name">
            <Input
              value={project.trainerName}
              onChange={(event) => updateField("trainerName", event.target.value)}
              placeholder="Lead trainer"
            />
          </Field>
          <Field label="Participant count">
            <Input
              type="number"
              min="0"
              value={project.participantCount}
              onChange={(event) =>
                updateField("participantCount", Number(event.target.value))
              }
            />
          </Field>
        </div>
        <Field label="Delivery notes">
          <Textarea
            value={project.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Client expectations, room setup, trainer notes, special risks"
          />
        </Field>
        {notice ? (
          <p className="rounded-lg border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">
            {notice}
          </p>
        ) : null}
        <Button type="button" variant="gold" onClick={saveProject} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Delivery Project
        </Button>
      </CardContent>
    </Card>
  );
}

export function DeliveryProjectsPageClient() {
  const { projects, clients, notice } = useDeliveryData();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return projects;
    }

    return projects.filter((project) =>
      [project.title, project.deliveryStatus, project.location, project.trainerName]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [projects, query]);

  return (
    <div className="space-y-5">
      <Toolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search delivery projects"
        href="/delivery/new"
        label="New Delivery Project"
      />
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>Training Delivery OS</CardTitle>
          <CardDescription>{notice}</CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {filtered.map((project) => (
                <DeliveryProjectCard
                  key={project.id}
                  project={project}
                  client={clients.find((client) => client.id === project.clientId)}
                />
              ))}
            </div>
          ) : (
            <EmptyDeliveryState
              title="No delivery projects yet"
              href="/delivery/new"
              label="Create Delivery Project"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function DeliveryProjectCard({
  project,
  client,
}: {
  project: DeliveryProject;
  client?: Client;
}) {
  return (
    <Link
      href={`/delivery/${project.id}`}
      className="group rounded-lg border border-white/10 bg-[#07111f]/55 p-4 transition hover:border-teal-300/35 hover:bg-teal-300/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-2 font-semibold leading-6 text-white">
            {project.title}
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {client?.name ?? "Unassigned client"} - {project.trainingDate || "Date TBD"}
          </p>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-teal-100" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <DeliveryStatusBadge status={project.deliveryStatus} />
        <Badge variant="outline">{project.participantCount || 0} participants</Badge>
        {project.location ? <Badge variant="outline">{project.location}</Badge> : null}
      </div>
    </Link>
  );
}

export function DeliveryProjectDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const {
    projects,
    setProjects,
    tasks,
    setTasks,
    clients,
    opportunities,
    packages,
    isLoading,
  } = useDeliveryData();
  const project = projects.find((item) => item.id === id);
  const projectTasks = tasks.filter((task) => task.deliveryProjectId === id);
  const client = clients.find((item) => item.id === project?.clientId);
  const opportunity = opportunities.find((item) => item.id === project?.opportunityId);
  const linkedPackage = packages.find((pkg) => pkg.id === project?.packageId);

  async function saveProjectUpdate(nextProject: DeliveryProject) {
    const normalized = normalizeDeliveryProject({
      ...nextProject,
      updatedAt: new Date().toISOString(),
    });
    const response = await fetch("/api/delivery-projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalized),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      project?: DeliveryProject;
      error?: string;
    };
    if (!response.ok || !payload.project) {
      throw new Error(payload.error ?? "Delivery project update failed.");
    }
    setProjects((current) => [
      payload.project as DeliveryProject,
      ...current.filter((item) => item.id !== payload.project?.id),
    ]);
  }

  async function saveTask(nextTask: DeliveryTask) {
    const normalized = normalizeDeliveryTask({
      ...nextTask,
      updatedAt: new Date().toISOString(),
    });
    const response = await fetch("/api/delivery-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalized),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      task?: DeliveryTask;
      error?: string;
    };
    if (!response.ok || !payload.task) {
      throw new Error(payload.error ?? "Delivery task update failed.");
    }
    setTasks((current) => [
      payload.task as DeliveryTask,
      ...current.filter((item) => item.id !== payload.task?.id),
    ]);
  }

  async function deleteProject() {
    if (!project || !window.confirm(`Delete "${project.title}"?`)) {
      return;
    }

    const response = await fetch(`/api/delivery-projects/${project.id}`, { method: "DELETE" });
    if (response.ok) {
      router.push("/delivery");
    }
  }

  async function deleteTask(id: string) {
    const response = await fetch(`/api/delivery-tasks/${id}`, { method: "DELETE" });
    if (response.ok) {
      setTasks((current) => current.filter((task) => task.id !== id));
    }
  }

  if (isLoading && !project) {
    return <LoadingCard label="Loading delivery project..." />;
  }

  if (!project) {
    return <MissingCard label="Delivery project not found" href="/delivery" />;
  }

  return (
    <div className="space-y-5">
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <DeliveryStatusBadge status={project.deliveryStatus} />
              <Badge variant="outline">{project.participantCount || 0} participants</Badge>
              <Badge variant="outline">{project.trainingDate || "Date TBD"}</Badge>
            </div>
            <CardTitle>{project.title}</CardTitle>
            <CardDescription className="mt-2">
              {client?.name ?? "No client selected"} - {project.location || "Location TBD"}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/delivery/new">
                <Plus className="h-4 w-4" />
                New Delivery Project
              </Link>
            </Button>
            <Button type="button" variant="destructive" onClick={deleteProject}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <InfoBlock label="Trainer" value={project.trainerName || "-"} />
          <InfoBlock
            label="Opportunity"
            value={opportunity?.title ?? "No linked opportunity"}
          />
          <InfoBlock
            label="Package"
            value={linkedPackage?.title ?? "No linked package"}
          />
        </CardContent>
      </Card>

      <DeliveryProjectForm existingProject={project} />

      <DeliveryChecklist
        projectId={project.id}
        tasks={projectTasks}
        onSaveTask={saveTask}
        onDeleteTask={deleteTask}
      />

      <PilotFeedbackButton
        relatedPage={`/delivery/${project.id}`}
        relatedFeature="Delivery project"
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <TrainerNotes project={project} onSave={saveProjectUpdate} />
        <EvaluationSummary project={project} onSave={saveProjectUpdate} />
      </div>

      <CertificatePlaceholder project={project} />

      <PostTrainingReportGenerator
        project={project}
        tasks={projectTasks}
        clientName={client?.name ?? ""}
        packageTitle={linkedPackage?.title ?? ""}
        learningObjectives={linkedPackage?.promise ?? opportunity?.trainingNeed ?? ""}
        onSaveProject={saveProjectUpdate}
      />
    </div>
  );
}

export function DeliveryChecklist({
  projectId,
  tasks,
  onSaveTask,
  onDeleteTask,
}: {
  projectId: string;
  tasks: DeliveryTask[];
  onSaveTask: (task: DeliveryTask) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}) {
  const [draftTasks, setDraftTasks] = useState<DeliveryTask[]>(tasks);
  const [isSaving, setIsSaving] = useState("");

  useEffect(() => {
    setDraftTasks(tasks);
  }, [tasks]);

  function updateTask<K extends keyof DeliveryTask>(
    id: string,
    key: K,
    value: DeliveryTask[K],
  ) {
    setDraftTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, [key]: value } : task)),
    );
  }

  function addTask() {
    setDraftTasks((current) => [
      ...current,
      normalizeDeliveryTask({
        deliveryProjectId: projectId,
        title: "",
        category: "Materials",
        status: "Open",
      }),
    ]);
  }

  async function seedDefaultTasks() {
    const defaults = createDefaultDeliveryTasks(projectId);
    setDraftTasks(defaults);
    await Promise.all(defaults.map(onSaveTask));
  }

  async function save(task: DeliveryTask) {
    setIsSaving(task.id);
    await onSaveTask(task);
    setIsSaving("");
  }

  const completed = draftTasks.filter((task) => task.status === "Done").length;

  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <CardTitle>Delivery Checklist</CardTitle>
          <CardDescription>
            {completed} of {draftTasks.length} tasks completed.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={seedDefaultTasks}>
            <CalendarCheck className="h-4 w-4" />
            Add Default Checklist
          </Button>
          <Button type="button" variant="gold" onClick={addTask}>
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {draftTasks.length ? (
          draftTasks.map((task) => (
            <div
              key={task.id}
              className="grid gap-3 rounded-lg border border-white/10 bg-[#07111f]/55 p-4 xl:grid-cols-[1.5fr_1fr_0.8fr_0.9fr_0.9fr_auto]"
            >
              <Field label="Task">
                <Input
                  value={task.title}
                  onChange={(event) => updateTask(task.id, "title", event.target.value)}
                  placeholder="Task title"
                />
              </Field>
              <Field label="Category">
                <Select
                  value={task.category}
                  onChange={(event) =>
                    updateTask(
                      task.id,
                      "category",
                      event.target.value as DeliveryTask["category"],
                    )
                  }
                >
                  {deliveryTaskCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={task.status}
                  onChange={(event) =>
                    updateTask(
                      task.id,
                      "status",
                      event.target.value as DeliveryTask["status"],
                    )
                  }
                >
                  {deliveryTaskStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Due date">
                <Input
                  type="date"
                  value={task.dueDate}
                  onChange={(event) =>
                    updateTask(task.id, "dueDate", event.target.value)
                  }
                />
              </Field>
              <Field label="Owner">
                <Input
                  value={task.owner}
                  onChange={(event) => updateTask(task.id, "owner", event.target.value)}
                  placeholder="Owner"
                />
              </Field>
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => save(task)}
                  disabled={isSaving === task.id || !task.title.trim()}
                >
                  {isSaving === task.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => onDeleteTask(task.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="xl:col-span-6">
                <Field label="Notes">
                  <Textarea
                    value={task.notes}
                    onChange={(event) =>
                      updateTask(task.id, "notes", event.target.value)
                    }
                    placeholder="Task details, dependencies, or confirmation notes"
                  />
                </Field>
              </div>
            </div>
          ))
        ) : (
          <EmptyDeliveryState
            title="No delivery tasks yet"
            href="#"
            label="Add Default Checklist"
            onClick={seedDefaultTasks}
          />
        )}
      </CardContent>
    </Card>
  );
}

export function TrainerNotes({
  project,
  onSave,
}: {
  project: DeliveryProject;
  onSave: (project: DeliveryProject) => Promise<void>;
}) {
  const [notes, setNotes] = useState(project.notes);
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    setIsSaving(true);
    await onSave({ ...project, notes });
    setIsSaving(false);
  }

  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardTitle>Trainer Notes</CardTitle>
        <CardDescription>
          Internal preparation notes, facilitation cues, and delivery risks.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Capture trainer reminders and client context."
        />
        <Button type="button" variant="outline" onClick={save} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Notes
        </Button>
      </CardContent>
    </Card>
  );
}

export function EvaluationSummary({
  project,
  onSave,
}: {
  project: DeliveryProject;
  onSave: (project: DeliveryProject) => Promise<void>;
}) {
  const [evaluation, setEvaluation] = useState(project.evaluation);
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    setIsSaving(true);
    await onSave({ ...project, evaluation });
    setIsSaving(false);
  }

  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardTitle>Evaluation Summary</CardTitle>
        <CardDescription>
          Capture evidence for the post-training report and improvement loop.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Field label="Average satisfaction score">
          <Input
            type="number"
            min="0"
            max="5"
            step="0.1"
            value={evaluation.averageSatisfactionScore}
            onChange={(event) =>
              setEvaluation((current) => ({
                ...current,
                averageSatisfactionScore: Number(event.target.value),
              }))
            }
          />
        </Field>
        <Field label="Key comments">
          <Textarea
            value={evaluation.keyComments}
            onChange={(event) =>
              setEvaluation((current) => ({
                ...current,
                keyComments: event.target.value,
              }))
            }
          />
        </Field>
        <Field label="Improvement suggestions">
          <Textarea
            value={evaluation.improvementSuggestions}
            onChange={(event) =>
              setEvaluation((current) => ({
                ...current,
                improvementSuggestions: event.target.value,
              }))
            }
          />
        </Field>
        <Field label="Trainer reflection">
          <Textarea
            value={evaluation.trainerReflection}
            onChange={(event) =>
              setEvaluation((current) => ({
                ...current,
                trainerReflection: event.target.value,
              }))
            }
          />
        </Field>
        <Field label="Client feedback">
          <Textarea
            value={evaluation.clientFeedback}
            onChange={(event) =>
              setEvaluation((current) => ({
                ...current,
                clientFeedback: event.target.value,
              }))
            }
          />
        </Field>
        <Field label="Learner feedback">
          <Textarea
            value={evaluation.learnerFeedback}
            onChange={(event) =>
              setEvaluation((current) => ({
                ...current,
                learnerFeedback: event.target.value,
              }))
            }
          />
        </Field>
        <Button type="button" variant="outline" onClick={save} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Evaluation
        </Button>
      </CardContent>
    </Card>
  );
}

export function CertificatePlaceholder({ project }: { project: DeliveryProject }) {
  return (
    <Card className="border-gold-300/20 bg-gold-300/10 shadow-executive">
      <CardHeader>
        <CardTitle>Certificates</CardTitle>
        <CardDescription>
          Certificate generation is staged for a later release. Participant names can be
          prepared here before automation is added.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm text-gold-50/85">
          <Award className="h-5 w-5" />
          {project.participantCount || 0} certificate placeholders expected.
        </div>
        <Button type="button" variant="outline" disabled>
          Certificate Automation Coming Later
        </Button>
      </CardContent>
    </Card>
  );
}

export function PostTrainingReportGenerator({
  project,
  tasks,
  clientName,
  packageTitle,
  learningObjectives,
  onSaveProject,
}: {
  project: DeliveryProject;
  tasks: DeliveryTask[];
  clientName: string;
  packageTitle: string;
  learningObjectives: string;
  onSaveProject: (project: DeliveryProject) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Partial<Record<DeliveryDraftKind, DeliveryDraft>>>(
    {},
  );
  const [isGenerating, setIsGenerating] = useState<DeliveryDraftKind | "">("");
  const [isExporting, setIsExporting] = useState<"docx" | "">("");
  const [notice, setNotice] = useState("");

  async function generate(kind: DeliveryDraftKind) {
    setIsGenerating(kind);
    setNotice("");

    try {
      const response = await fetch("/api/delivery-projects/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          project,
          tasks,
          clientName,
          packageTitle,
          learningObjectives,
        }),
      });
      const payload = (await response.json()) as {
        draft?: DeliveryDraft;
        mode?: "openai";
        notice?: string;
        error?: string;
      };

      if (!response.ok || !payload.draft) {
        throw new Error(payload.error ?? "Delivery draft generation failed.");
      }

      setDrafts((current) => ({ ...current, [kind]: payload.draft }));
      setNotice(payload.notice ?? `Draft generated with ${payload.mode}.`);

      if (kind === "post-training-report") {
        await onSaveProject({ ...project, postTrainingReport: payload.draft.body });
      }
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Delivery draft generation failed.",
      );
    } finally {
      setIsGenerating("");
    }
  }

  async function exportReport(format: "docx") {
    setIsExporting(format);
    setNotice("");

    try {
      const response = await fetch("/api/delivery-projects/export-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          project,
          clientName,
          packageTitle,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Export failed.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filename =
        disposition.match(/filename="(.+)"/)?.[1] ??
        `DGAcademy_${project.title}_PostTrainingReport.${format}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setNotice("Post-training report export started.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setIsExporting("");
    }
  }

  const reportDraft = drafts["post-training-report"]?.body ?? project.postTrainingReport;

  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardTitle>Delivery AI Support + Reporting</CardTitle>
        <CardDescription>
          Generate drafts for preparation and reporting. Nothing is sent automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <GenerateButton
            label="Trainer Checklist"
            kind="trainer-checklist"
            active={isGenerating}
            onClick={generate}
          />
          <GenerateButton
            label="Participant Email"
            kind="participant-email"
            active={isGenerating}
            onClick={generate}
          />
          <GenerateButton
            label="Training-Day Agenda"
            kind="training-day-agenda"
            active={isGenerating}
            onClick={generate}
          />
          <GenerateButton
            label="Post-Training Report"
            kind="post-training-report"
            active={isGenerating}
            onClick={generate}
          />
        </div>
        {notice ? (
          <p className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-3 text-sm text-teal-50">
            {notice}
          </p>
        ) : null}
        <div className="grid gap-3 lg:grid-cols-2">
          {(["trainer-checklist", "participant-email", "training-day-agenda"] as const).map(
            (kind) =>
              drafts[kind] ? (
                <DraftBlock key={kind} draft={drafts[kind] as DeliveryDraft} />
              ) : null,
          )}
          {reportDraft ? (
            <DraftBlock
              draft={{
                title: "Post-Training Report Draft",
                body: reportDraft,
                suggestedNextStep:
                  "Review internally and export once the evaluation details are accurate.",
              }}
            />
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => exportReport("docx")}
            disabled={!reportDraft || Boolean(isExporting)}
          >
            {isExporting === "docx" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Export Report DOCX
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function GenerateButton({
  label,
  kind,
  active,
  onClick,
}: {
  label: string;
  kind: DeliveryDraftKind;
  active: DeliveryDraftKind | "";
  onClick: (kind: DeliveryDraftKind) => void;
}) {
  return (
    <Button
      type="button"
      variant="gold"
      onClick={() => onClick(kind)}
      disabled={Boolean(active)}
    >
      {active === kind ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {label}
    </Button>
  );
}

function Toolbar({
  query,
  onQueryChange,
  placeholder,
  href,
  label,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder: string;
  href: string;
  label: string;
}) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={placeholder}
            className="pl-9"
          />
        </div>
        <Button asChild variant="gold" className="w-full sm:w-auto">
          <Link href={href}>
            <Plus className="h-4 w-4" />
            {label}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-white">{label}</span>
      {children}
    </label>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium leading-6 text-white">{value}</div>
    </div>
  );
}

function EmptyDeliveryState({
  title,
  href,
  label,
  onClick,
}: {
  title: string;
  href: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-white/15 bg-[#07111f]/45 p-8 text-center">
      <CalendarCheck className="mx-auto h-8 w-8 text-teal-100" />
      <div className="mt-4 text-base font-semibold text-white">{title}</div>
      {onClick ? (
        <Button type="button" variant="gold" className="mt-5" onClick={onClick}>
          <Plus className="h-4 w-4" />
          {label}
        </Button>
      ) : (
        <Button asChild variant="gold" className="mt-5">
          <Link href={href}>
            <Plus className="h-4 w-4" />
            {label}
          </Link>
        </Button>
      )}
    </div>
  );
}

function LoadingCard({ label }: { label: string }) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}
      </CardContent>
    </Card>
  );
}

function MissingCard({ label, href }: { label: string; href: string }) {
  return (
    <Card className="border-red-300/25 bg-red-400/10 shadow-executive">
      <CardContent className="p-6">
        <div className="font-semibold text-red-100">{label}</div>
        <Button asChild variant="outline" className="mt-4">
          <Link href={href}>Go Back</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function DraftBlock({ draft }: { draft: DeliveryDraft }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(draft.body);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-white">{draft.title}</div>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          <Clipboard className="h-4 w-4" />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="mt-3 max-h-[460px] overflow-auto whitespace-pre-wrap font-sans text-sm leading-6 text-slate-100">
        {draft.body}
      </pre>
      <p className="mt-3 text-sm text-muted-foreground">{draft.suggestedNextStep}</p>
    </div>
  );
}
