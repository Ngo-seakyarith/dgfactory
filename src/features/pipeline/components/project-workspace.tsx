"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FileText, MonitorCog, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { QueryErrorState } from "@/components/query-error-state";
import { AutosaveIndicator } from "@/components/autosave-indicator";
import { useAutosave } from "@/hooks/use-autosave";
import { useClientsQuery } from "@/features/crm/queries";
import { Field } from "@/features/crm/components/shared";
import { formatDateTime } from "@/lib/date-time";
import { clientProjectInput, emptyClientProject, projectInputSchema, projectStages, projectTypes, type ClientProject, type ClientProjectInput } from "../project-domain";
import { useDeleteClientProjectMutation, useSaveClientProjectMutation } from "../project-queries";

export function ProjectEditor({ project, clientId, projectType = "Training", onCreated, onClose }: {
  project?: ClientProject;
  clientId?: string;
  projectType?: ClientProjectInput["projectType"];
  onCreated?: (project: ClientProject) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const clientsQuery = useClientsQuery();
  const saveMutation = useSaveClientProjectMutation();
  const deleteMutation = useDeleteClientProjectMutation();
  const [form, setForm] = useState<ClientProjectInput>(() => project ? clientProjectInput(project) : { ...emptyClientProject(clientId), projectType });
  const [error, setError] = useState("");
  const lastSaved = useRef(JSON.stringify(form));
  const removed = useRef(false);
  const linked = Boolean(project?.trainingPackageId || project?.systemProposalId);
  const valid = projectInputSchema.safeParse(form).success;
  const autosave = useAutosave({
    value: form, enabled: Boolean(project) && valid && !deleteMutation.isPending,
    async onSave(input) {
      setError("");
      await saveMutation.mutateAsync({ id: project?.id, input });
      lastSaved.current = JSON.stringify(input);
    },
    onError(error) { setError(error instanceof Error ? error.message : "Project could not be saved."); },
  });
  const flushRef = useRef(autosave.flush);
  flushRef.current = autosave.flush;
  useEffect(() => () => { if (!removed.current) void flushRef.current(); }, []);
  useEffect(() => {
    if (!project || JSON.stringify(form) !== lastSaved.current) return;
    const incoming = clientProjectInput(project);
    // Only replace local fields when no unsaved edits would be lost.
    lastSaved.current = JSON.stringify(incoming);
    setForm(incoming);
    autosave.markSaved(incoming);
  // Changes to server data should not reinitialize an actively edited form.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.updatedAt]);

  function update<K extends keyof ClientProjectInput>(key: K, value: ClientProjectInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  async function create() {
    const parsed = projectInputSchema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the project details."); return; }
    setError("");
    try { const { project: saved } = await saveMutation.mutateAsync({ input: parsed.data }); onCreated?.(saved); }
    catch (error) { setError(error instanceof Error ? error.message : "Project could not be created."); }
  }
  async function remove() {
    if (!project || !window.confirm(`Delete project "${project.title}"?`)) return;
    autosave.cancel();
    await autosave.waitForPending();
    removed.current = true;
    try { await deleteMutation.mutateAsync(project.id); onClose(); }
    catch (error) { removed.current = false; setError(error instanceof Error ? error.message : "Project could not be deleted."); }
  }
  async function openProposal(href: string) {
    await autosave.flush();
    await autosave.waitForPending();
    if (JSON.stringify(form) !== lastSaved.current) {
      setError("Save the project changes before creating its proposal.");
      return;
    }
    router.push(href);
  }
  async function close() {
    if (project) {
      await autosave.flush();
      await autosave.waitForPending();
      if (JSON.stringify(form) !== lastSaved.current) { setError("Check and save your changes before closing."); return; }
    } else if (JSON.stringify(form) !== lastSaved.current && !window.confirm("Discard this unsaved training or system?")) return;
    onClose();
  }
  const client = clientsQuery.data?.find((client) => client.id === form.clientId);
  const clientName = client?.name ?? project?.clientName ?? "";
  const trainingHref = project ? `/packages/new?${new URLSearchParams({ projectId: project.id, clientId: form.clientId, client: clientName, courseTitle: form.title })}` : "";
  const systemHref = project ? `/solution-proposals/new?${new URLSearchParams({ projectId: project.id, clientId: form.clientId, client: clientName, title: form.title })}` : "";
  const canCreateProposal = project && form.clientId && form.stage !== "Delivered";
  return <div className="space-y-5 border-t border-border py-5">
    <header className="flex flex-wrap items-center gap-3">
      <h3 className="mr-auto font-semibold">{project ? "Edit details" : `New ${projectType === "Intelligent System" ? "system" : "training"}`}</h3>
      {project ? <AutosaveIndicator status={autosave.status} /> : null}
      <Button type="button" variant="ghost" size="icon" title="Close editor" aria-label="Close editor" disabled={saveMutation.isPending || deleteMutation.isPending} onClick={() => void close()}><X className="h-4 w-4" /></Button>
    </header>
    {project ? <p className="text-xs text-muted-foreground">Created {formatDateTime(project.createdAt)}</p> : null}
    {error ? <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><p className="flex-1">{error}</p>{project ? <Button type="button" variant="outline" onClick={() => void autosave.flush()}><RotateCcw className="h-4 w-4" />Retry</Button> : null}</div> : null}
    {clientsQuery.isError ? <QueryErrorState title="Clients could not be loaded" detail={clientsQuery.error.message} onRetry={() => void clientsQuery.refetch()} /> : null}
    <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); void (project ? autosave.flush() : create()); }}>
      <section className="grid gap-4 md:grid-cols-2">
        {!clientId ? <Field label="Client"><Select required value={form.clientId} disabled={Boolean(linked && project?.clientId) || clientsQuery.isPending} onChange={(event) => update("clientId", event.target.value)}><option value="">Select client</option>{clientsQuery.data?.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</Select></Field> : null}
        <Field label="Title"><Input required maxLength={300} value={form.title} onChange={(event) => update("title", event.target.value)} /></Field>
        <Field label="Type"><Select value={form.projectType} disabled={linked} onChange={(event) => update("projectType", event.target.value as ClientProjectInput["projectType"])}>{projectTypes.map((type) => <option key={type}>{type}</option>)}</Select></Field>
        <Field label="Stage"><Select value={form.stage} disabled={saveMutation.isPending} onChange={(event) => update("stage", event.target.value as ClientProjectInput["stage"])}>{projectStages.map((stage) => <option key={stage}>{stage}</option>)}</Select></Field>
        <Field label="Status notes"><Input value={form.statusNote} onChange={(event) => update("statusNote", event.target.value)} /></Field>
      </section>
      <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Target (USD)"><Input type="number" min={0} step="0.01" value={form.targetValue ?? ""} onChange={(event) => update("targetValue", event.target.value === "" ? null : Number(event.target.value))} /></Field>
          <Field label="Actual (USD)"><Input type="number" min={0} step="0.01" value={form.actualValue ?? ""} onChange={(event) => update("actualValue", event.target.value === "" ? null : Number(event.target.value))} /></Field>
          <Field label="Payment received date"><Input type="date" value={form.paymentReceivedDate ?? ""} onChange={(event) => update("paymentReceivedDate", event.target.value || null)} /></Field>
        </div>
      </section>
      <details className="border-t border-border pt-4"><summary className="cursor-pointer text-sm font-medium">Timing and additional details</summary><section className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="Start"><Input placeholder="Q4, October, or a date" value={form.startPeriod} onChange={(event) => update("startPeriod", event.target.value)} /></Field>
        <Field label="End"><Input placeholder="Q4, October, or a date" value={form.endPeriod} onChange={(event) => update("endPeriod", event.target.value)} /></Field>
        <div className="md:col-span-2"><Field label="Expected revenue and additional work"><Textarea rows={2} value={form.expectedOutcomes} onChange={(event) => update("expectedOutcomes", event.target.value)} /></Field></div>
        <Field label="Next action"><Textarea rows={3} value={form.nextAction} onChange={(event) => update("nextAction", event.target.value)} /></Field>
        <Field label="Next opportunities"><Textarea rows={3} value={form.nextOpportunities} onChange={(event) => update("nextOpportunities", event.target.value)} /></Field>
        <div className="md:col-span-2"><Field label="Notes"><Textarea rows={3} value={form.notes} onChange={(event) => update("notes", event.target.value)} /></Field></div>
      </section></details>
      {!project ? <Button type="submit" variant="gold" disabled={saveMutation.isPending || clientsQuery.isPending}><Save className="h-4 w-4" />{saveMutation.isPending ? "Adding..." : "Add to pipeline"}</Button> : null}
    </form>
    {project ? <section className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
      {project.trainingPackageId ? <Button type="button" variant="outline" onClick={() => void openProposal(`/packages/${project.trainingPackageId}`)}><FileText className="h-4 w-4" />Training proposal</Button> : project.systemProposalId ? <Button type="button" variant="outline" onClick={() => void openProposal(`/solution-proposals/${project.systemProposalId}`)}><MonitorCog className="h-4 w-4" />System proposal</Button> : canCreateProposal ? <>
        {form.projectType === "Training" ? <Button type="button" variant="outline" disabled={!valid} onClick={() => void openProposal(trainingHref)}><Plus className="h-4 w-4" />Create training proposal</Button> : form.projectType === "Intelligent System" ? <Button type="button" variant="outline" disabled={!valid} onClick={() => void openProposal(systemHref)}><Plus className="h-4 w-4" />Create system proposal</Button> : null}
      </> : null}
      {!linked ? <Button type="button" variant="outline" className="sm:ml-auto" disabled={deleteMutation.isPending} onClick={() => void remove()}><Trash2 className="h-4 w-4" />Delete</Button> : null}
    </section> : null}
  </div>;
}
