"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronRight, FileText, MonitorCog, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ListLoadingSkeleton } from "@/components/page-loading-skeleton";
import { QueryErrorState } from "@/components/query-error-state";
import { ClientForm } from "@/features/crm/components/clients";
import { useClientsQuery, useDeleteClientMutation } from "@/features/crm/queries";
import { formatDate, formatDateTime } from "@/lib/date-time";
import { groupClientPipeline, filterClientPipeline, type ClientPipelineGroup } from "../client-pipeline";
import { projectStages, type ClientProject, type ClientProjectInput, type ProjectStage } from "../project-domain";
import { useClientProjectsQuery } from "../project-queries";
import { ProjectEditor } from "./project-workspace";
import { ProjectStageSelect } from "./project-stage-select";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

function WorkRow({ project, clientId, visible, selected, onSelect }: { project: ClientProject; clientId?: string; visible: boolean; selected: boolean; onSelect: (id: string) => void }) {
  const [editing, setEditing] = useState(selected);
  const [visited, setVisited] = useState(selected);
  useEffect(() => { if (selected) { setEditing(true); setVisited(true); } }, [selected]);
  const href = project.trainingPackageId ? `/packages/${project.trainingPackageId}` : project.systemProposalId ? `/solution-proposals/${project.systemProposalId}` : null;
  function edit() { setEditing(true); setVisited(true); onSelect(project.id); }
  return <div hidden={!visible} className="border-t border-border py-4">
    <div className="flex flex-wrap items-start gap-3">
      <div className="min-w-0 flex-1 basis-64">
        <button type="button" className="max-w-full break-words text-left font-medium hover:text-primary" onClick={edit}>{project.title}</button>
        <p className="mt-1 text-xs text-muted-foreground">{project.projectType} · Updated {formatDateTime(project.updatedAt)}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {project.targetValue !== null ? <span>Target {money(project.targetValue)}</span> : null}
          {project.actualValue !== null ? <span>Actual {money(project.actualValue)}</span> : null}
          {project.paymentReceivedDate ? <span>Payment received {formatDate(project.paymentReceivedDate)}</span> : null}
        </div>
      </div>
      {!editing ? <div className="w-40 shrink-0"><ProjectStageSelect project={project} /></div> : <span className="text-sm text-muted-foreground">{project.stage}</span>}
      {!editing ? <Button type="button" variant="ghost" size="icon" title={`Edit ${project.title}`} aria-label={`Edit ${project.title}`} onClick={edit}><Pencil className="h-4 w-4" /></Button> : null}
      {!editing && href ? <Button asChild variant="ghost" size="icon" title={`Open proposal for ${project.title}`}><Link href={href} aria-label={`Open proposal for ${project.title}`}><ArrowUpRight className="h-4 w-4" /></Link></Button> : null}
    </div>
    {visited ? <div hidden={!editing}><ProjectEditor project={project} clientId={clientId} onClose={() => setEditing(false)} /></div> : null}
  </div>;
}

function ClientGroup({ group, visible, visibleProjects, selectedClient, selectedProject, newProject, onSelect }: {
  group: ClientPipelineGroup;
  visible: boolean;
  visibleProjects: readonly ClientProject[];
  selectedClient: boolean;
  selectedProject: string | null;
  newProject: boolean;
  onSelect: (clientId?: string, projectId?: string, reveal?: boolean) => void;
}) {
  const [open, setOpen] = useState(selectedClient);
  const [visited, setVisited] = useState(selectedClient);
  const [editingClient, setEditingClient] = useState(false);
  const [newType, setNewType] = useState<ClientProjectInput["projectType"] | null>(newProject ? "Training" : null);
  const [error, setError] = useState("");
  const sectionRef = useRef<HTMLElement>(null);
  const deleteMutation = useDeleteClientMutation();
  useEffect(() => {
    if (!selectedClient) return;
    setOpen(true); setVisited(true);
    const frame = requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ block: "nearest" }));
    return () => cancelAnimationFrame(frame);
  }, [selectedClient]);
  useEffect(() => { if (newProject) setNewType("Training"); }, [newProject]);
  const client = group.client;
  const name = client?.name ?? "Client not selected";
  const trainingCount = visibleProjects.filter((project) => project.projectType === "Training").length;
  const systemCount = visibleProjects.filter((project) => project.projectType === "Intelligent System").length;
  const otherCount = visibleProjects.length - trainingCount - systemCount;
  const workSummary = [[trainingCount, "training"], [systemCount, "system proposal"], [otherCount, "other item"]]
    .filter(([count]) => count).map(([count, label]) => `${count} ${label}${count === 1 ? "" : "s"}`).join(" · ") || "No work yet";
  const visibleIds = new Set(visibleProjects.map((project) => project.id));
  async function removeClient() {
    if (!client || !window.confirm(`Delete client "${client.name}"? Linked proposals will remain, without this client assignment.`)) return;
    setError("");
    try { await deleteMutation.mutateAsync(client.id); }
    catch (error) { setError(error instanceof Error ? error.message : "Client could not be deleted."); }
  }
  function toggle() {
    setOpen(!open); setVisited(true);
    if (!open) onSelect(group.id);
  }
  return <section ref={sectionRef} hidden={!visible} className="border-b border-border">
    <button type="button" aria-expanded={open} aria-controls={`client-${group.id}`} onClick={toggle} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-1 py-4 text-left transition-colors hover:bg-muted/50 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
      <div className="min-w-0"><h2 className="break-words font-semibold">{name}</h2><p className="mt-1 text-sm text-muted-foreground">{workSummary}</p><p className="mt-1 text-xs text-muted-foreground lg:hidden">{client?.accountOwner || "Unassigned"}{client?.contactPerson ? ` · ${client.contactPerson}` : ""}</p></div>
      <span className="hidden text-sm text-muted-foreground lg:block">{client?.accountOwner || "Unassigned"}</span>
      <span className="hidden text-sm text-muted-foreground lg:block">{client?.contactPerson || "—"}</span>
      <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
    </button>
    {visited ? <div id={`client-${group.id}`} hidden={!open} className="pb-5 pl-1 sm:pl-5">
      {error ? <p role="alert" className="mb-4 text-sm text-destructive">{error}</p> : null}
      {client ? <>
        {editingClient ? <div className="mb-5 border-t border-border pt-4"><ClientForm key={client.updatedAt} existingClient={client} onSaved={() => setEditingClient(false)} onCancel={() => setEditingClient(false)} /></div> : <>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4 border-t border-border pt-4">
            <dl className="grid min-w-0 flex-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
              {[["Contact", [client.contactPerson, client.contactPosition].filter(Boolean).join(", ")], ["Email", client.email], ["Phone", client.phone], ["Sector", client.sector], ["Client type", client.clientType], ["Next action", client.nextAction]].filter(([, value]) => value).map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{value}</dd></div>)}
            </dl>
            <div className="flex shrink-0 gap-1"><Button type="button" variant="outline" size="sm" onClick={() => setEditingClient(true)}><Pencil className="h-4 w-4" />Edit client</Button><Button type="button" variant="ghost" size="icon" title={`Delete ${name}`} aria-label={`Delete ${name}`} disabled={deleteMutation.isPending} onClick={() => void removeClient()}><Trash2 className="h-4 w-4" /></Button></div>
          </div>
          {client.relationshipHistory || client.notes ? <details className="mb-4 text-sm"><summary className="cursor-pointer text-muted-foreground">Relationship and notes</summary>{client.relationshipHistory ? <p className="mt-2 whitespace-pre-wrap break-words">{client.relationshipHistory}</p> : null}{client.notes ? <p className="mt-2 whitespace-pre-wrap break-words">{client.notes}</p> : null}</details> : null}
        </>}
        <div className="mb-4 flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" disabled={Boolean(newType)} onClick={() => setNewType("Training")}><FileText className="h-4 w-4" />Add training</Button><Button type="button" variant="outline" size="sm" disabled={Boolean(newType)} onClick={() => setNewType("Intelligent System")}><MonitorCog className="h-4 w-4" />Add system</Button></div>
      </> : null}
      {newType ? <ProjectEditor key={`new-${newType}`} clientId={client?.id} projectType={newType} onCreated={(project) => { setNewType(null); onSelect(project.clientId ?? undefined, project.id, true); }} onClose={() => setNewType(null)} /> : null}
      {group.projects.map((project) => <WorkRow key={project.id} project={project} clientId={client?.id} visible={visibleIds.has(project.id)} selected={selectedProject === project.id} onSelect={(id) => onSelect(client?.id, id)} />)}
      {!visibleProjects.length && !newType ? <p className="py-3 text-sm text-muted-foreground">{group.projects.length ? "No work matches the selected filters." : "No training or system proposals yet."}</p> : null}
    </div> : null}
  </section>;
}

export function ClientPipelineWorkspace() {
  const clientsQuery = useClientsQuery();
  const projectsQuery = useClientProjectsQuery();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("All");
  const [stage, setStage] = useState<ProjectStage | "All">("All");
  const [newClient, setNewClient] = useState(searchParams.get("newClient") === "1");
  const groups = useMemo(() => groupClientPipeline(clientsQuery.data ?? [], projectsQuery.data ?? []), [clientsQuery.data, projectsQuery.data]);
  const owners = useMemo(() => [...new Set((clientsQuery.data ?? []).map((client) => client.accountOwner.trim() || "Unassigned"))].sort(), [clientsQuery.data]);
  const selectedProject = searchParams.get("projectId");
  const requestedClient = searchParams.get("clientId");
  const selectedGroup = groups.find((group) => group.id === requestedClient || group.projects.some((project) => project.id === selectedProject));
  const visible = groups.map((group) => ({ group, ...filterClientPipeline(group, { search, owner, stage }) }));
  const loading = clientsQuery.isPending || projectsQuery.isPending;
  const failed = clientsQuery.isError || projectsQuery.isError;
  const ready = clientsQuery.data !== undefined && projectsQuery.data !== undefined;
  const visibleClientCount = visible.filter((group) => group.visible && group.group.client).length;
  const visibleWorkCount = visible.reduce((total, group) => total + group.projects.length, 0);
  function select(clientId?: string, projectId?: string, reveal = false) {
    if (reveal) { setSearch(""); setOwner("All"); setStage("All"); }
    const params = new URLSearchParams();
    if (clientId) params.set("clientId", clientId);
    if (projectId) params.set("projectId", projectId);
    router.replace(`/pipeline${params.size ? `?${params}` : ""}`, { scroll: false });
  }
  return <div className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-4"><div className="page-heading"><div className="page-eyebrow">Business development</div><h1 className="page-title">Clients &amp; Pipeline</h1></div><Button type="button" variant="gold" disabled={newClient} onClick={() => setNewClient(true)}><Plus className="h-4 w-4" />New client</Button></header>
    {newClient ? <section className="border-y border-border py-5"><ClientForm onSaved={(client) => { setNewClient(false); setSearch(""); setOwner("All"); setStage("All"); select(client.id); }} onCancel={() => { setNewClient(false); select(requestedClient ?? undefined, selectedProject ?? undefined); }} /></section> : null}
    {searchParams.get("newProject") === "1" && !selectedGroup && !loading && !failed ? <ProjectEditor onCreated={(project) => select(project.clientId ?? undefined, project.id, true)} onClose={() => select()} /> : null}
    <div className="flex flex-wrap gap-3">
      <div className="relative min-w-0 flex-1 basis-64"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search clients and work" placeholder="Search clients, contacts, or training" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" /></div>
      <Select aria-label="Filter by owner" value={owner} onChange={(event) => setOwner(event.target.value)} className="w-full sm:w-44"><option value="All">All owners</option>{owners.map((owner) => <option key={owner}>{owner}</option>)}</Select>
      <Select aria-label="Filter by stage" value={stage} onChange={(event) => setStage(event.target.value as ProjectStage | "All")} className="w-full sm:w-44"><option value="All">All stages</option>{projectStages.map((stage) => <option key={stage}>{stage}</option>)}</Select>
    </div>
    {failed ? <QueryErrorState title="Clients and pipeline could not be loaded" detail={clientsQuery.error?.message ?? projectsQuery.error?.message ?? "Try again."} onRetry={() => { void clientsQuery.refetch(); void projectsQuery.refetch(); }} /> : null}
    {!ready && loading && !failed ? <ListLoadingSkeleton /> : null}
    {ready ? <>
      {(requestedClient || selectedProject) && !selectedGroup ? <p role="status" className="text-sm text-muted-foreground">This client or training is no longer available.</p> : null}
      <div className="border-t border-border">
        <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 border-b border-border px-1 py-2 text-xs text-muted-foreground lg:grid"><span>Client</span><span>Owner</span><span>Contact</span><span className="w-4" /></div>
        {visible.map(({ group, visible: show, projects }) => <ClientGroup key={group.id} group={group} visible={show} visibleProjects={projects} selectedClient={selectedGroup?.id === group.id} selectedProject={selectedProject} newProject={searchParams.get("newProject") === "1" && selectedGroup?.id === group.id} onSelect={select} />)}
      </div>
      {!visible.some((group) => group.visible) ? <p className="py-8 text-center text-sm text-muted-foreground">{groups.length ? "No clients or training match these filters." : "No clients yet."}</p> : null}
      <p className="text-xs text-muted-foreground">{visibleClientCount} client{visibleClientCount === 1 ? "" : "s"} · {visibleWorkCount} {visibleWorkCount === 1 ? "training or proposal" : "trainings and proposals"}</p>
    </> : null}
  </div>;
}
