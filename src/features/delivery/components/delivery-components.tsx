"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";

import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";
import { QueryErrorState } from "@/components/query-error-state";
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
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useClientsQuery } from "@/features/clients/queries";
import {
  deliveryStatuses,
  deliveryTaskCategories,
  deliveryTaskStatuses,
  normalizeDeliveryTask,
  type DeliveryDraft,
  type DeliveryProject,
  type DeliveryStatus,
  type DeliveryTask,
} from "@/features/delivery";
import {
  useDeleteDeliveryProjectMutation,
  useDeleteDeliveryTaskMutation,
  useDeliveryProjectQuery,
  useDeliveryProjectsQuery,
  useDeliveryTasksQuery,
  useSaveDeliveryProjectMutation,
  useSaveDeliveryTaskMutation,
} from "@/features/delivery/queries";
import { EvaluationFormPanel } from "@/features/delivery/components/evaluation-panel";
import { MaterialsPanel } from "@/features/delivery/components/materials-panel";
import { useTrainingPackagesQuery } from "@/features/training-packages/queries";
import { MarkdownPreview } from "@/features/training-packages/components/markdown-preview";
import { errorMessage, requestJson } from "@/lib/api-client";

type DeliveryStage = "before" | "day" | "after";

const stages: Array<{
  id: DeliveryStage;
  label: string;
  description: string;
  icon: typeof CalendarCheck;
}> = [
  {
    id: "before",
    label: "Before Training",
    description: "Assess participants and generate delivery materials.",
    icon: CalendarCheck,
  },
  {
    id: "day",
    label: "Training Day",
    description: "Record attendance, notes, and issues.",
    icon: Users,
  },
  {
    id: "after",
    label: "After Training",
    description: "Capture feedback and complete the report.",
    icon: ClipboardCheck,
  },
];

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function statusStage(status: DeliveryStatus): DeliveryStage {
  if (status === "Completed" || status === "Delivered") return "after";
  return "before";
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const variant =
    status === "Completed" || status === "Delivered"
      ? "teal"
      : status === "Cancelled" ||
          status === "Proposal Sent" ||
          status === "Syllabus Sent"
        ? "outline"
        : "gold";

  return <Badge variant={variant}>{status}</Badge>;
}

export function DeliveryProjectsPageClient() {
  const projectsQuery = useDeliveryProjectsQuery();
  const clientsQuery = useClientsQuery();
  const [search, setSearch] = useState("");
  const clientsById = useMemo(
    () => new Map((clientsQuery.data ?? []).map((client) => [client.id, client])),
    [clientsQuery.data],
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (projectsQuery.data ?? []).filter((project) => {
      const clientName = project.clientId
        ? clientsById.get(project.clientId)?.name ?? ""
        : "";
      return !query || `${project.title} ${clientName}`.toLowerCase().includes(query);
    });
  }, [clientsById, projectsQuery.data, search]);

  if (projectsQuery.isPending || clientsQuery.isPending) {
    return <PageLoadingSkeleton label="Loading training deliveries" />;
  }

  if (projectsQuery.isError || clientsQuery.isError) {
    return (
      <QueryErrorState
        title="Could not load training deliveries"
        detail={errorMessage(projectsQuery.error ?? clientsQuery.error)}
        onRetry={() => {
          void projectsQuery.refetch();
          void clientsQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by training or client"
          className="pl-9"
        />
      </div>

      {filtered.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((project) => (
            <Link key={project.id} href={`/delivery/${project.id}`}>
              <Card className="h-full transition-colors hover:border-teal-300/40 hover:bg-white/[0.06]">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{project.title}</CardTitle>
                      <CardDescription className="mt-2">
                        {project.clientId
                          ? clientsById.get(project.clientId)?.name ?? "Client"
                          : "No client linked"}
                      </CardDescription>
                    </div>
                    <DeliveryStatusBadge status={project.deliveryStatus} />
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Date</div>
                    <div className="mt-1 font-medium">
                      {project.trainingDate || "Not scheduled"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Trainer</div>
                    <div className="mt-1 font-medium">
                      {project.trainerName || "Not assigned"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-white/15 py-14 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 font-semibold">
            {search ? "No matching deliveries" : "No training deliveries yet"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {search
              ? "Try a different training or client name."
              : "A delivery is created automatically each time you save a training proposal. It starts as Syllabus Sent until the client confirms."}
          </p>
        </div>
      )}
    </div>
  );
}

function StageNavigation({ stage, onChange }: { stage: DeliveryStage; onChange: (stage: DeliveryStage) => void }) {
  return (
    <div className="grid gap-2 md:grid-cols-3" role="tablist" aria-label="Delivery stages">
      {stages.map((item, index) => {
        const Icon = item.icon;
        const active = stage === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`flex min-h-24 items-start gap-3 rounded-md border p-4 text-left transition-colors ${
              active
                ? "border-teal-300/55 bg-teal-400/10"
                : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.06]">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Stage {index + 1}</div>
              <div className="mt-1 font-semibold">{item.label}</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DeliveryChecklist({ projectId }: { projectId: string }) {
  const tasksQuery = useDeliveryTasksQuery(projectId);
  const saveTask = useSaveDeliveryTaskMutation();
  const deleteTask = useDeleteDeliveryTaskMutation();
  const [title, setTitle] = useState("");

  if (tasksQuery.isPending) return <PageLoadingSkeleton label="Loading delivery checklist" />;
  if (tasksQuery.isError) return <QueryErrorState detail={errorMessage(tasksQuery.error)} onRetry={() => void tasksQuery.refetch()} />;

  async function addTask() {
    if (!title.trim()) return;
    await saveTask.mutateAsync(normalizeDeliveryTask({ deliveryProjectId: projectId, title, category: "Materials", status: "Open" }));
    setTitle("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preparation Checklist</CardTitle>
        <CardDescription>Complete the operational work before the trainer arrives.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {(tasksQuery.data ?? []).map((task) => (
          <div key={task.id} className="grid gap-3 rounded-md border border-white/10 p-3 lg:grid-cols-[1fr_180px_150px_40px]">
            <Input defaultValue={task.title} onBlur={(event) => { if (event.target.value.trim() && event.target.value !== task.title) saveTask.mutate({ ...task, title: event.target.value }); }} />
            <Select value={task.category} onChange={(event) => saveTask.mutate({ ...task, category: event.target.value as DeliveryTask["category"] })}>
              {deliveryTaskCategories.map((category) => <option key={category}>{category}</option>)}
            </Select>
            <Select value={task.status} onChange={(event) => saveTask.mutate({ ...task, status: event.target.value as DeliveryTask["status"] })}>
              {deliveryTaskStatuses.map((status) => <option key={status}>{status}</option>)}
            </Select>
            <Button type="button" variant="ghost" size="icon" title="Delete task" onClick={() => deleteTask.mutate(task)}><Trash2 /></Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a preparation task" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void addTask(); } }} />
          <Button type="button" variant="outline" onClick={() => void addTask()} disabled={!title.trim() || saveTask.isPending}><Plus /> Add</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TrainingDay({ project, onSave }: { project: DeliveryProject; onSave: (project: DeliveryProject) => Promise<void> }) {
  const [draft, setDraft] = useState(project);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => setDraft(project), [project]);

  async function save(delivered = false) {
    setBusy(true);
    try {
      await onSave({ ...draft, deliveryStatus: delivered ? "Delivered" : draft.deliveryStatus });
      setNotice(delivered ? "Training marked as delivered." : "Training-day record saved.");
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Training-Day Record</CardTitle><CardDescription>Capture what actually happened during delivery.</CardDescription></CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <Field label="Actual participants"><Input type="number" min="0" value={draft.participantCount || ""} onChange={(event) => setDraft({ ...draft, participantCount: Number(event.target.value) })} placeholder="Number attended" /></Field>
        <Field label="Trainer"><Input value={draft.trainerName} onChange={(event) => setDraft({ ...draft, trainerName: event.target.value })} /></Field>
        <Field label="Trainer notes and issues" className="md:col-span-2"><Textarea className="min-h-36" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Participation, timing changes, technical issues, strong discussion points, and follow-up items" /></Field>
        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <Button type="button" variant="outline" onClick={() => void save()} disabled={busy}><Save /> Save Record</Button>
          <Button type="button" variant="gold" onClick={() => void save(true)} disabled={busy}><CheckCircle2 /> Mark Delivered</Button>
          {notice ? <span className="text-sm text-muted-foreground">{notice}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function EvaluationAndReport({ project, clientName, packageTitle, onSave }: { project: DeliveryProject; clientName: string; packageTitle: string; onSave: (project: DeliveryProject) => Promise<void> }) {
  const [draft, setDraft] = useState(project);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => setDraft(project), [project]);

  function evaluation(key: keyof DeliveryProject["evaluation"], value: string | number) {
    setDraft((current) => ({ ...current, evaluation: { ...current.evaluation, [key]: value } }));
  }

  async function save(status?: DeliveryStatus) {
    setBusy(true);
    setNotice("");
    try {
      await onSave({ ...draft, deliveryStatus: status ?? draft.deliveryStatus });
      setNotice(status === "Completed" ? "Delivery completed." : "Evaluation saved.");
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    setBusy(true);
    setNotice("");
    try {
      const payload = await requestJson<{ draft: DeliveryDraft }>("/api/delivery-projects/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: draft }),
      });
      const updated = { ...draft, postTrainingReport: payload.draft.body };
      setDraft(updated);
      await onSave(updated);
      setNotice("Post-training report generated and saved.");
    } catch (error) {
      setNotice(errorMessage(error, "Could not generate the report."));
    } finally {
      setBusy(false);
    }
  }

  async function exportDocx() {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/delivery-projects/export-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "docx", project: draft, clientName, packageTitle }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Report export failed.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `DGAcademy_${draft.title.replace(/[^a-z0-9]+/gi, "_")}_PostTrainingReport.docx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle>Client &amp; Trainer Notes</CardTitle><CardDescription>Participant scores and comments come from the evaluation form above. Record here what only the client sponsor and trainer can tell you.</CardDescription></CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Client feedback"><Textarea value={draft.evaluation.clientFeedback} onChange={(event) => evaluation("clientFeedback", event.target.value)} placeholder="What the client sponsor said after the training" /></Field>
          <Field label="Trainer reflection"><Textarea value={draft.evaluation.trainerReflection} onChange={(event) => evaluation("trainerReflection", event.target.value)} placeholder="What worked, what to adjust next time" /></Field>
          <Field label="Improvement suggestions" className="md:col-span-2"><Textarea value={draft.evaluation.improvementSuggestions} onChange={(event) => evaluation("improvementSuggestions", event.target.value)} placeholder="Internal takeaways for the next delivery" /></Field>
          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => void save()} disabled={busy}><Save /> Save Notes</Button>
            <Button type="button" variant="gold" onClick={() => void save("Completed")} disabled={busy}><CheckCircle2 /> Complete Delivery</Button>
            {notice ? <span className="text-sm text-muted-foreground">{notice}</span> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><CardTitle>Post-Training Report</CardTitle><CardDescription className="mt-2">AI drafts the report from the delivery record and feedback above.</CardDescription></div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="gold" onClick={() => void generate()} disabled={busy}><Sparkles /> {draft.postTrainingReport ? "Regenerate Report" : "Generate Report"}</Button>
              {draft.postTrainingReport ? <Button type="button" variant="outline" onClick={() => void exportDocx()} disabled={busy}><Download /> Export DOCX</Button> : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {draft.postTrainingReport ? (
            <div className="overflow-hidden rounded-md border border-white/10 bg-[#07111f]/55"><MarkdownPreview value={draft.postTrainingReport} /></div>
          ) : (
            <div className="border border-dashed border-white/15 p-10 text-center text-sm text-muted-foreground">Save real attendance and feedback, then generate the client report.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function DeliveryProjectDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const projectQuery = useDeliveryProjectQuery(id);
  const clientsQuery = useClientsQuery();
  const packagesQuery = useTrainingPackagesQuery();
  const saveProject = useSaveDeliveryProjectMutation();
  const deleteProject = useDeleteDeliveryProjectMutation();
  const [stage, setStage] = useState<DeliveryStage>("before");
  const [statusInitialized, setStatusInitialized] = useState(false);

  const project = projectQuery.data;
  useEffect(() => {
    if (project && !statusInitialized) {
      setStage(statusStage(project.deliveryStatus));
      setStatusInitialized(true);
    }
  }, [project, statusInitialized]);

  if (projectQuery.isPending) return <PageLoadingSkeleton label="Loading delivery" />;
  if (projectQuery.isError || !project) return <QueryErrorState title="Could not load this delivery" detail={errorMessage(projectQuery.error)} onRetry={() => void projectQuery.refetch()} />;

  const projectId = project.id;
  const client = (clientsQuery.data ?? []).find((item) => item.id === project.clientId);
  const trainingPackage = (packagesQuery.data ?? []).find((item) => item.id === project.packageId);

  async function save(updated: DeliveryProject) {
    await saveProject.mutateAsync(updated);
  }

  async function remove() {
    if (!window.confirm("Delete this training delivery and its checklist?")) return;
    await deleteProject.mutateAsync(projectId);
    router.push("/delivery");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/delivery" className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-[#a94b18] focus-visible:text-[#a94b18]"><ArrowLeft className="h-4 w-4" /> Training Delivery</Link>
          <div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-semibold">{project.title}</h1><DeliveryStatusBadge status={project.deliveryStatus} /></div>
          <p className="mt-2 text-sm text-muted-foreground">{client?.name || "No client linked"}{project.trainingDate ? ` · ${project.trainingDate}` : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={project.deliveryStatus} onChange={(event) => void save({ ...project, deliveryStatus: event.target.value as DeliveryStatus })} className="w-40">
            {deliveryStatuses.map((status) => <option key={status}>{status}</option>)}
          </Select>
          <Button type="button" variant="destructive" size="icon" title="Delete delivery" onClick={() => void remove()} disabled={deleteProject.isPending}><Trash2 /></Button>
        </div>
      </div>

      <StageNavigation stage={stage} onChange={setStage} />

      {stage === "before" ? (
        <div className="space-y-5">
          <EvaluationFormPanel project={project} formType="pre_training" />
          <MaterialsPanel project={project} />
          <DeliveryChecklist projectId={project.id} />
        </div>
      ) : null}
      {stage === "day" ? <TrainingDay project={project} onSave={save} /> : null}
      {stage === "after" ? (
        <div className="space-y-5">
          <EvaluationFormPanel project={project} />
          <EvaluationAndReport project={project} clientName={client?.name ?? ""} packageTitle={trainingPackage?.title ?? project.title} onSave={save} />
        </div>
      ) : null}
    </div>
  );
}
