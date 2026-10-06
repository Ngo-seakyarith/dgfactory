"use client";

import { useRouter } from "next/navigation";
import { formOptions, useSelector } from "@tanstack/react-form";
import { memo, useEffect, useRef, useState } from "react";
import { FileText, MonitorCog, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppForm, withForm } from "@/components/ui/form";
import { QueryErrorState } from "@/components/query-error-state";
import { AutosaveIndicator } from "@/components/autosave-indicator";
import { useAutosave } from "@/hooks/use-autosave";
import { useClientsQuery } from "@/features/crm/queries";
import type { Client } from "@/features/crm/domain";
import { formatDateTime } from "@/lib/date-time";
import { clientProjectInput, emptyClientProject, projectInputSchema, projectSources, projectStages, projectTiers, projectTypes, type ClientProject, type ClientProjectInput } from "../project-domain";
import { useDeleteClientProjectMutation, useSaveClientProjectMutation } from "../project-queries";
import { stageRules } from "../domain";

const projectFormOptions = formOptions({
  defaultValues: emptyClientProject(),
  validators: { onChange: projectInputSchema, onSubmit: projectInputSchema },
});

const ProjectFields = memo(withForm({
  ...projectFormOptions,
  props: { clientId: "", linked: false, linkedClient: false, clients: [] as Client[], pendingClients: false, pendingSave: false },
  render: function ProjectFields({ form, clientId, linked, linkedClient, clients, pendingClients, pendingSave }) {
    return <>
      <section className="grid gap-4 md:grid-cols-2">
        {!clientId ? <form.AppField name="clientId">{(field) => <field.SelectField label="Account" required disabled={linkedClient || pendingClients}><option value="">Select account</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</field.SelectField>}</form.AppField> : null}
        <form.AppField name="title">{(field) => <field.TextField label="Project" required maxLength={300} />}</form.AppField>
        <form.AppField name="projectType">{(field) => <field.SelectField label="Type" disabled={linked}>{projectTypes.map((type) => <option key={type}>{type}</option>)}</field.SelectField>}</form.AppField>
        <div className="space-y-2">
          <form.AppField name="stage">{(field) => <field.SelectField label="Stage" disabled={pendingSave}>{projectStages.map((stage) => <option key={stage}>{stage}</option>)}</field.SelectField>}</form.AppField>
          <form.Subscribe selector={(state) => state.values.stage}>{(stage) => <p className="text-xs text-muted-foreground" aria-live="polite">Win probability {stageRules[stage].probability}% · {stageRules[stage].group}</p>}</form.Subscribe>
        </div>
        <form.AppField name="statusNote">{(field) => <field.TextField label="Status notes" />}</form.AppField>
        <form.AppField name="tier">{(field) => <field.SelectField label="Tier">{projectTiers.map((tier) => <option key={tier} value={tier}>{tier || "Not set"}</option>)}</field.SelectField>}</form.AppField>
        <form.AppField name="source">{(field) => <field.SelectField label="Source">{projectSources.map((source) => <option key={source} value={source}>{source || "Not set"}</option>)}</field.SelectField>}</form.AppField>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <form.AppField name="targetValue">{(field) => <field.NumberField label="Value (USD)" min={0} step="0.01" />}</form.AppField>
        <form.AppField name="actualValue">{(field) => <field.NumberField label="Actual (USD)" min={0} step="0.01" />}</form.AppField>
        <form.AppField name="paymentReceivedDate">{(field) => <field.DateField label="Payment received date" />}</form.AppField>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <form.AppField name="nextAction">{(field) => <field.TextareaField label="Next step" rows={2} />}</form.AppField>
        <form.AppField name="nextStepDate">{(field) => <field.TextField label="Next step date" placeholder="24-Jul, November, or Q4" maxLength={100} />}</form.AppField>
        <form.Field name="aiEurekaAttached">{(field) => <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-primary" checked={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.checked)} />AI Eureka attached</label>}</form.Field>
        <form.Field name="isSignal">{(field) => <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-primary" checked={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.checked)} />IS signal</label>}</form.Field>
      </section>
      <details className="border-t border-border pt-4"><summary className="cursor-pointer text-sm font-medium">Timing and additional details</summary><section className="mt-4 grid gap-4 md:grid-cols-2">
        <form.AppField name="startPeriod">{(field) => <field.TextField label="Start" placeholder="Q4, October, or a date" />}</form.AppField>
        <form.AppField name="endPeriod">{(field) => <field.TextField label="End" placeholder="Q4, October, or a date" />}</form.AppField>
        <div className="md:col-span-2"><form.AppField name="expectedOutcomes">{(field) => <field.TextareaField label="Expected revenue and additional work" rows={2} />}</form.AppField></div>
        <div className="md:col-span-2"><form.AppField name="nextOpportunities">{(field) => <field.TextareaField label="Next opportunity" rows={3} />}</form.AppField></div>
        <div className="md:col-span-2"><form.AppField name="notes">{(field) => <field.TextareaField label="Notes" rows={3} />}</form.AppField></div>
      </section></details>
    </>;
  },
}));

const noClients: Client[] = [];

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
  const [initialValues] = useState<ClientProjectInput>(() => project ? clientProjectInput(project) : { ...emptyClientProject(clientId), projectType });
  const [error, setError] = useState("");
  const form = useAppForm({
    ...projectFormOptions,
    defaultValues: initialValues,
    async onSubmit({ value }) {
      if (project) { await autosave.flush(); return; }
      setError("");
      try {
        const { project: saved } = await saveMutation.mutateAsync({ input: projectInputSchema.parse(value) });
        onCreated?.(saved);
      } catch (error) { setError(error instanceof Error ? error.message : "Project could not be created."); }
    },
  });
  const values = useSelector(form.store, (state) => state.values);
  const lastSaved = useRef(JSON.stringify(initialValues));
  const removed = useRef(false);
  const linked = Boolean(project?.trainingPackageId || project?.systemProposalId);
  const valid = projectInputSchema.safeParse(values).success;
  const autosave = useAutosave({
    value: values, enabled: Boolean(project) && valid && !deleteMutation.isPending,
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
    if (!project || JSON.stringify(form.state.values) !== lastSaved.current) return;
    const incoming = clientProjectInput(project);
    // Only replace local fields when no unsaved edits would be lost.
    lastSaved.current = JSON.stringify(incoming);
    form.reset(incoming, { keepDefaultValues: true });
    autosave.markSaved(incoming);
  // Changes to server data should not reinitialize an actively edited form.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.updatedAt]);

  async function remove() {
    if (!project) return;
    const warning = project.trainingPackageId
      ? `Delete training "${project.title}" and its linked proposal? Any linked delivery, checklist, materials, evaluation forms, and responses will also be permanently deleted. This cannot be undone.`
      : `Delete ${project.projectType === "Training" ? "training" : "project"} "${project.title}"? This cannot be undone.`;
    if (!window.confirm(warning)) return;
    autosave.cancel();
    await autosave.waitForPending();
    removed.current = true;
    try { await deleteMutation.mutateAsync(project.id); onClose(); }
    catch (error) { removed.current = false; setError(error instanceof Error ? error.message : "Project could not be deleted."); }
  }
  async function openProposal(href: string) {
    await autosave.flush();
    await autosave.waitForPending();
    if (JSON.stringify(form.state.values) !== lastSaved.current) {
      setError("Save the project changes before creating its proposal.");
      return;
    }
    router.push(href);
  }
  async function close() {
    if (project) {
      await autosave.flush();
      await autosave.waitForPending();
      if (JSON.stringify(form.state.values) !== lastSaved.current) { setError("Check and save your changes before closing."); return; }
    } else if (JSON.stringify(form.state.values) !== lastSaved.current && !window.confirm("Discard this unsaved training or system?")) return;
    onClose();
  }
  const client = clientsQuery.data?.find((client) => client.id === values.clientId);
  const clientName = client?.name ?? project?.clientName ?? "";
  const trainingHref = project ? `/packages/new?${new URLSearchParams({ projectId: project.id, clientId: values.clientId, client: clientName, courseTitle: values.title })}` : "";
  const systemHref = project ? `/solution-proposals/new?${new URLSearchParams({ projectId: project.id, clientId: values.clientId, client: clientName, title: values.title })}` : "";
  const canCreateProposal = project && values.clientId && values.stage !== "Delivered";
  return <div className="space-y-5 border-t border-border py-5">
    <header className="flex flex-wrap items-center gap-3">
      <h3 className="mr-auto font-semibold">{project ? "Edit details" : `New ${projectType === "Intelligent System" ? "system" : "training"}`}</h3>
      {project ? <AutosaveIndicator status={autosave.status} /> : null}
      <Button type="button" variant="ghost" size="icon" title="Close editor" aria-label="Close editor" disabled={saveMutation.isPending || deleteMutation.isPending} onClick={() => void close()}><X className="h-4 w-4" /></Button>
    </header>
    {project ? <p className="text-xs text-muted-foreground">Created {formatDateTime(project.createdAt)}</p> : null}
    {error ? <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><p className="flex-1">{error}</p>{project ? <Button type="button" variant="outline" onClick={() => void autosave.flush()}><RotateCcw className="h-4 w-4" />Retry</Button> : null}</div> : null}
    {clientsQuery.isError ? <QueryErrorState title="Clients could not be loaded" detail={clientsQuery.error.message} onRetry={() => void clientsQuery.refetch()} /> : null}
    <form className="space-y-6" noValidate onSubmit={(event) => { event.preventDefault(); void form.handleSubmit(); }}>
      <ProjectFields form={form} clientId={clientId ?? ""} linked={linked} linkedClient={Boolean(linked && project?.clientId)} clients={clientsQuery.data ?? noClients} pendingClients={clientsQuery.isPending} pendingSave={saveMutation.isPending} />
      {!project ? <form.Subscribe selector={(state) => state.isSubmitting}>{(isSubmitting) => <Button type="submit" variant="gold" disabled={isSubmitting || clientsQuery.isPending}><Save className="h-4 w-4" />{isSubmitting ? "Adding..." : "Add to pipeline"}</Button>}</form.Subscribe> : null}
    </form>
    {project ? <section className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
      {project.trainingPackageId ? <Button type="button" variant="outline" onClick={() => void openProposal(`/packages/${project.trainingPackageId}`)}><FileText className="h-4 w-4" />Training proposal</Button> : project.systemProposalId ? <Button type="button" variant="outline" onClick={() => void openProposal(`/solution-proposals/${project.systemProposalId}`)}><MonitorCog className="h-4 w-4" />System proposal</Button> : canCreateProposal ? <>
        {values.projectType === "Training" ? <Button type="button" variant="outline" disabled={!valid} onClick={() => void openProposal(trainingHref)}><Plus className="h-4 w-4" />Create training proposal</Button> : values.projectType === "Intelligent System" ? <Button type="button" variant="outline" disabled={!valid} onClick={() => void openProposal(systemHref)}><Plus className="h-4 w-4" />Create system proposal</Button> : null}
      </> : null}
      {!project.systemProposalId ? <Button type="button" variant="outline" className="sm:ml-auto" disabled={deleteMutation.isPending} onClick={() => void remove()}><Trash2 className="h-4 w-4" />Delete</Button> : null}
    </section> : null}
  </div>;
}
