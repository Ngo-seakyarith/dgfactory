"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight, ChevronLeft, ChevronRight, Columns3, FileText, MonitorCog, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useTable, type ColumnVisibilityState, type ExpandedState, type PaginationState, type ReactTable } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ListLoadingSkeleton } from "@/components/page-loading-skeleton";
import { QueryErrorState } from "@/components/query-error-state";
import { ClientForm } from "@/features/crm/components/clients";
import { useClientsQuery, useDeleteClientMutation } from "@/features/crm/queries";
import { formatDate, formatDateTime } from "@/lib/date-time";
import { groupClientPipeline, filterClientPipeline, type ClientPipelineGroup, type ClientPipelineFilters } from "../client-pipeline";
import { initialPipelineFilters, pipelineTableFeatures, pipelineTableOptions, type PipelineTableRow } from "../client-pipeline-table";
import { projectStages, type ClientProject, type ClientProjectInput, type ProjectStage } from "../project-domain";
import { useClientProjectsQuery } from "../project-queries";
import { ProjectEditor } from "./project-workspace";
import { ProjectStageSelect } from "./project-stage-select";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

function subscribeToNarrowLayout(callback: () => void) {
  const query = window.matchMedia("(max-width: 767px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const isNarrowLayout = () => window.matchMedia("(max-width: 767px)").matches;
const desktopServerLayout = () => false;

function WorkRow({ project, clientId, visible, selected, onSelect }: { project: ClientProject; clientId?: string; visible: boolean; selected: boolean; onSelect: (id: string) => void }) {
  const [editing, setEditing] = useState(selected);
  const [visited, setVisited] = useState(selected);
  useEffect(() => { if (selected) { setEditing(true); setVisited(true); } }, [selected]);
  const href = project.trainingPackageId ? `/packages/${project.trainingPackageId}` : project.systemProposalId ? `/solution-proposals/${project.systemProposalId}` : null;
  function edit() { setEditing(true); setVisited(true); onSelect(project.id); }
  return <div id={`project-${project.id}`} hidden={!visible} className="border-t border-border py-4">
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

function ClientGroup({ row, table, visible, visibleProjects, open, selectedProject, newProject, onSelect }: {
  row: PipelineTableRow;
  table: ReactTable<typeof pipelineTableFeatures, ClientPipelineGroup>;
  visible: boolean;
  visibleProjects: readonly ClientProject[];
  open: boolean;
  selectedProject: string | null;
  newProject: boolean;
  onSelect: (clientId?: string, projectId?: string, reveal?: boolean) => void;
}) {
  const group = row.original;
  const [visited, setVisited] = useState(open);
  const [editingClient, setEditingClient] = useState(false);
  const [newType, setNewType] = useState<ClientProjectInput["projectType"] | null>(newProject ? "Training" : null);
  const [error, setError] = useState("");
  const deleteMutation = useDeleteClientMutation();
  useEffect(() => {
    if (open) setVisited(true);
  }, [open]);
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
    row.toggleExpanded(); setVisited(true);
    if (!open) onSelect(group.id);
  }
  return <>
    <tr id={`client-group-${group.id}`} hidden={!visible} className="border-b border-border align-top hover:bg-muted/30">
      {row.getVisibleCells().map((cell) => <td key={cell.id} className={cell.column.id === "client" ? "min-w-0 px-1 py-4" : cell.column.id === "expand" ? "w-10 py-3 text-right" : "hidden break-words px-3 py-4 text-sm text-muted-foreground md:table-cell"}>
        {cell.column.id === "client" ? <>
          <button type="button" aria-expanded={open} aria-controls={`client-${group.id}`} onClick={toggle} className="max-w-full break-words text-left font-semibold hover:text-primary">{name}</button>
          <p className="mt-1 text-sm text-muted-foreground">{workSummary}</p>
          <p className="mt-1 text-xs text-muted-foreground md:hidden">{client?.accountOwner || "Unassigned"}{client?.contactPerson ? ` · ${client.contactPerson}` : ""}</p>
        </> : cell.column.id === "expand" ? <Button type="button" variant="ghost" size="icon" title={`${open ? "Collapse" : "Expand"} ${name}`} aria-label={`${open ? "Collapse" : "Expand"} ${name}`} aria-expanded={open} aria-controls={`client-${group.id}`} onClick={toggle}><ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} /></Button> : <table.FlexRender cell={cell} />}
      </td>)}
    </tr>
    {visited ? <tr hidden={!visible || !open} className="border-b border-border"><td colSpan={row.getVisibleCells().length}><div id={`client-${group.id}`} hidden={!open} className="pb-5 pl-1 pt-4 sm:pl-5">
      {error ? <p role="alert" className="mb-4 text-sm text-destructive">{error}</p> : null}
      {client ? <>
        {editingClient ? <div className="mb-5 border-t border-border pt-4"><ClientForm key={client.id} existingClient={client} onSaved={() => setEditingClient(false)} onCancel={() => setEditingClient(false)} /></div> : <>
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
    </div></td></tr> : null}
  </>;
}

export function ClientPipelineWorkspace() {
  const clientsQuery = useClientsQuery();
  const projectsQuery = useClientProjectsQuery();
  const searchParams = useSearchParams();
  const initialTarget = useRef(searchParams.get("projectId") ? `project-${searchParams.get("projectId")}` : searchParams.get("clientId") ? `client-group-${searchParams.get("clientId")}` : null);
  const revealGroup = useRef<string | null>(null);
  const [filters, setFilters] = useState<ClientPipelineFilters>(initialPipelineFilters);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [visibleColumns, setVisibleColumns] = useState<ColumnVisibilityState>(pipelineTableOptions.initialState.columnVisibility);
  const narrowLayout = useSyncExternalStore(subscribeToNarrowLayout, isNarrowLayout, desktopServerLayout);
  const columnVisibility = useMemo(() => narrowLayout ? { ...visibleColumns, owner: false, contact: false, target: false, actual: false, updated: false } : visibleColumns, [narrowLayout, visibleColumns]);
  const [newClient, setNewClient] = useState(searchParams.get("newClient") === "1");
  const groups = useMemo(() => groupClientPipeline(clientsQuery.data ?? [], projectsQuery.data ?? []), [clientsQuery.data, projectsQuery.data]);
  const owners = useMemo(() => [...new Set((clientsQuery.data ?? []).map((client) => client.accountOwner.trim() || "Unassigned"))].sort(), [clientsQuery.data]);
  const selectedProject = searchParams.get("projectId");
  const requestedClient = searchParams.get("clientId");
  const selectedGroup = groups.find((group) => group.id === requestedClient || group.projects.some((project) => project.id === selectedProject));
  const selectedGroupId = selectedGroup?.id;
  const table = useTable({
    ...pipelineTableOptions, data: groups,
    state: { globalFilter: filters, pagination, expanded, columnVisibility },
    onGlobalFilterChange: setFilters, onPaginationChange: setPagination, onExpandedChange: setExpanded,
    onColumnVisibilityChange: setVisibleColumns,
  });
  const matchingRows = table.getPrePaginatedRowModel().rows;
  const matchingIds = new Set(matchingRows.map((row) => row.id));
  const pageIds = new Set(table.getRowModel().rows.map((row) => row.id));
  // Keep visited editors mounted even when their row is filtered or paginated out.
  const mountedRows = [...matchingRows, ...table.getCoreRowModel().rows.filter((row) => !matchingIds.has(row.id))];
  const lastPage = Math.max(0, table.getPageCount() - 1);
  const loading = clientsQuery.isPending || projectsQuery.isPending;
  const failed = clientsQuery.isError || projectsQuery.isError;
  const ready = clientsQuery.data !== undefined && projectsQuery.data !== undefined;
  useEffect(() => {
    if (!selectedGroupId) return;
    setExpanded((previous) => previous === true || previous[selectedGroupId] ? previous : { ...previous, [selectedGroupId]: true });
  }, [selectedGroupId, selectedProject]);
  useEffect(() => {
    if (pagination.pageIndex > lastPage) setPagination((previous) => ({ ...previous, pageIndex: lastPage }));
  }, [pagination.pageIndex, lastPage]);
  useEffect(() => {
    if (!ready || (!initialTarget.current && !revealGroup.current)) return;
    const groupId = revealGroup.current ?? selectedGroupId;
    const index = matchingRows.findIndex((row) => row.id === groupId);
    if (index < 0) return;
    const pageIndex = Math.floor(index / pagination.pageSize);
    if (pageIndex !== pagination.pageIndex) {
      setPagination((previous) => ({ ...previous, pageIndex }));
      return;
    }
    revealGroup.current = null;
    if (!initialTarget.current) return;
    // Reveal an incoming bookmark once, never as a side effect of local editing.
    const frame = requestAnimationFrame(() => {
      if (initialTarget.current) document.getElementById(initialTarget.current)?.scrollIntoView({ block: "start" });
      initialTarget.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, selectedGroupId, matchingRows, pagination.pageIndex, pagination.pageSize]);
  const visibleClientCount = matchingRows.filter((row) => row.original.client).length;
  const visibleWorkCount = matchingRows.reduce((total, row) => total + filterClientPipeline(row.original, filters).projects.length, 0);
  function updateFilters(patch: Partial<ClientPipelineFilters>) {
    initialTarget.current = null;
    revealGroup.current = null;
    setFilters((previous) => ({ ...previous, ...patch }));
    setPagination((previous) => ({ ...previous, pageIndex: 0 }));
  }
  function select(clientId?: string, projectId?: string, reveal = false) {
    initialTarget.current = null;
    revealGroup.current = reveal ? clientId ?? "unassigned" : null;
    if (reveal) setFilters(initialPipelineFilters);
    const params = new URLSearchParams();
    if (clientId) params.set("clientId", clientId);
    if (projectId) params.set("projectId", projectId);
    // Selection belongs to this client workspace, not a server-route transition.
    window.history.replaceState(null, "", `/pipeline${params.size ? `?${params}` : ""}`);
  }
  return <div className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-4"><div className="page-heading"><div className="page-eyebrow">Business development</div><h1 className="page-title">Clients &amp; Pipeline</h1></div><Button type="button" variant="gold" disabled={newClient} onClick={() => setNewClient(true)}><Plus className="h-4 w-4" />New client</Button></header>
    {newClient ? <section className="border-y border-border py-5"><ClientForm onSaved={(client) => { setNewClient(false); select(client.id, undefined, true); }} onCancel={() => { setNewClient(false); select(requestedClient ?? undefined, selectedProject ?? undefined); }} /></section> : null}
    {searchParams.get("newProject") === "1" && !selectedGroup && !loading && !failed ? <ProjectEditor onCreated={(project) => select(project.clientId ?? undefined, project.id, true)} onClose={() => select()} /> : null}
    <div className="flex flex-wrap gap-3">
      <div className="relative min-w-0 flex-1 basis-64"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search clients and work" placeholder="Search clients, contacts, or training" value={filters.search} onChange={(event) => updateFilters({ search: event.target.value })} className="pl-9" /></div>
      <Select aria-label="Filter by owner" value={filters.owner} onChange={(event) => updateFilters({ owner: event.target.value })} className="w-full sm:w-44"><option value="All">All owners</option>{owners.map((owner) => <option key={owner}>{owner}</option>)}</Select>
      <Select aria-label="Filter by stage" value={filters.stage} onChange={(event) => updateFilters({ stage: event.target.value as ProjectStage | "All" })} className="w-full sm:w-44"><option value="All">All stages</option>{projectStages.map((stage) => <option key={stage}>{stage}</option>)}</Select>
      <Select aria-label="Sort clients" value={`${table.state.sorting[0]?.id ?? "client"}:${table.state.sorting[0]?.desc ? "desc" : "asc"}`} onChange={(event) => { const [id, direction] = event.target.value.split(":"); table.setSorting([{ id, desc: direction === "desc" }]); }} className="w-full sm:w-52 md:hidden"><option value="client:asc">Client: A to Z</option><option value="client:desc">Client: Z to A</option><option value="owner:asc">Owner: A to Z</option><option value="owner:desc">Owner: Z to A</option><option value="updated:desc">Recently updated</option><option value="updated:asc">Oldest update</option><option value="actual:desc">Actual total: highest</option><option value="actual:asc">Actual total: lowest</option><option value="target:desc">Target total: highest</option><option value="target:asc">Target total: lowest</option><option value="contact:asc">Contact: A to Z</option><option value="contact:desc">Contact: Z to A</option></Select>
      <details className="relative hidden md:block" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }} onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}><summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-md border border-input px-3 text-sm hover:bg-muted"><Columns3 className="h-4 w-4" />Columns</summary><fieldset className="absolute right-0 z-20 mt-2 w-52 rounded-md border border-border bg-popover p-3 shadow-md"><legend className="sr-only">Visible columns</legend>{table.getAllLeafColumns().filter((column) => column.getCanHide()).map((column) => <label key={column.id} className="flex cursor-pointer items-center gap-2 py-2 text-sm"><input type="checkbox" checked={column.getIsVisible()} onChange={(event) => column.toggleVisibility(event.target.checked)} />{String(column.columnDef.header)}</label>)}</fieldset></details>
    </div>
    {failed ? <QueryErrorState title="Clients and pipeline could not be loaded" detail={clientsQuery.error?.message ?? projectsQuery.error?.message ?? "Try again."} onRetry={() => { void clientsQuery.refetch(); void projectsQuery.refetch(); }} /> : null}
    {!ready && loading && !failed ? <ListLoadingSkeleton /> : null}
    {ready ? <>
      {(requestedClient || selectedProject) && !selectedGroup ? <p role="status" className="text-sm text-muted-foreground">This client or training is no longer available.</p> : null}
      <table aria-label="Clients and pipeline" className="w-full table-fixed border-t border-border text-left">
        <thead>{table.getHeaderGroups().map((headerGroup) => <tr key={headerGroup.id} className="border-b border-border">{headerGroup.headers.map((header) => {
          const sorted = header.column.getIsSorted();
          const SortIcon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
          return <th key={header.id} scope="col" aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined} className={header.column.id === "client" ? "px-1 py-2 text-xs font-medium text-muted-foreground md:w-[40%]" : header.column.id === "expand" ? "w-10 py-2" : "hidden px-3 py-2 text-xs font-medium text-muted-foreground md:table-cell"}>
            {header.column.getCanSort() ? <button type="button" title={`Sort by ${String(header.column.columnDef.header)}`} onClick={header.column.getToggleSortingHandler()} className="flex max-w-full items-center gap-2 text-left hover:text-foreground"><table.FlexRender header={header} /><SortIcon className="h-3.5 w-3.5 shrink-0" /></button> : <span className="sr-only"><table.FlexRender header={header} /></span>}
          </th>;
        })}</tr>)}</thead>
        <tbody>{mountedRows.map((row) => <ClientGroup key={row.id} row={row} table={table} visible={pageIds.has(row.id)} visibleProjects={filterClientPipeline(row.original, filters).projects} open={row.getIsExpanded()} selectedProject={selectedProject} newProject={searchParams.get("newProject") === "1" && selectedGroupId === row.id} onSelect={select} />)}</tbody>
      </table>
      {!matchingRows.length ? <p className="py-8 text-center text-sm text-muted-foreground">{groups.length ? "No clients or training match these filters." : "No clients yet."}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-xs text-muted-foreground">{visibleClientCount} client{visibleClientCount === 1 ? "" : "s"} · {visibleWorkCount} {visibleWorkCount === 1 ? "training or proposal" : "trainings and proposals"}</p>
        <nav aria-label="Client pages" className="flex flex-wrap items-center gap-2 text-sm"><label htmlFor="client-page-size" className="text-xs text-muted-foreground">Rows per page</label><Select id="client-page-size" value={pagination.pageSize} onChange={(event) => table.setPageSize(Number(event.target.value))} className="w-20">{[25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}</Select><span className="min-w-20 text-center text-xs text-muted-foreground">{Math.min(pagination.pageIndex, lastPage) + 1} / {lastPage + 1}</span><Button type="button" variant="ghost" size="icon" title="Previous page" aria-label="Previous page" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}><ChevronLeft className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" title="Next page" aria-label="Next page" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}><ChevronRight className="h-4 w-4" /></Button></nav>
      </div>
    </> : null}
  </div>;
}
