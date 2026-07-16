"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, BarChart3, Clipboard, Database, Download, FileSpreadsheet, Loader2, Plus, RefreshCw, Save, Sparkles, Trash2, Upload } from "lucide-react";

import { MarkdownPreview } from "@/features/training-packages/components/markdown-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Client } from "@/lib/crm";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { requestJson } from "@/lib/api-client";
import { useClientsQuery } from "@/features/clients/queries";
import { QueryErrorState } from "@/components/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";

import { createSystemProposal, systemProposalContentToMarkdown } from "../domain/proposal";
import type { AnalystReview, IntelligentSystemProposal, SystemSourceFile } from "../domain/types";
import {
  setSystemProposalQueryData,
  useDeleteSystemProposalMutation,
  useSaveSystemProposalMutation,
  useSystemProposalQuery,
} from "../queries";

type Stage = "brief" | "review" | "proposal";
const stages: Array<{ id: Stage; label: string; icon: typeof Database }> = [
  { id: "brief", label: "1. Project Brief", icon: Database },
  { id: "review", label: "2. Data Review", icon: BarChart3 },
  { id: "proposal", label: "3. Proposal", icon: Sparkles },
];
const toLines = (value: string) => value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);

export function SystemProposalWorkspace({ id }: { id?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clientsQuery = useClientsQuery();
  const proposalQuery = useSystemProposalQuery(id);
  const saveMutation = useSaveSystemProposalMutation();
  const deleteMutation = useDeleteSystemProposalMutation();
  const commandMutation = useMutation({
    mutationFn: ({ url, init }: { url: string; init?: RequestInit }) =>
      requestJson<{ proposal: IntelligentSystemProposal }>(url, init),
  });
  const loadedProposal = useRef(false);
  const [proposal, setProposal] = useState<IntelligentSystemProposal>(() => createSystemProposal());
  const clients = clientsQuery.data ?? [];
  const [stage, setStage] = useState<Stage>("brief");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ text: string; error: boolean }>({ text: "", error: false });
  const markdown = useMemo(() => proposal.proposalContent ? systemProposalContentToMarkdown(proposal.proposalContent, proposal.commercialInputs) : "", [proposal]);

  function fail(error: unknown) { setNotice({ text: error instanceof Error ? error.message : "Request failed.", error: true }); }
  function success(text: string) { setNotice({ text, error: false }); }

  useEffect(() => {
    if (!proposalQuery.data || loadedProposal.current) return;
    loadedProposal.current = true;
    setProposal(proposalQuery.data);
    if (proposalQuery.data.proposalContent) setStage("proposal");
    else if (proposalQuery.data.combinedAnalysis) setStage("review");
  }, [proposalQuery.data]);

  function updateBrief(key: keyof IntelligentSystemProposal["brief"], value: string | null) {
    setProposal((current) => ({ ...current, brief: { ...current.brief, [key]: value } }));
  }

  async function save(message = "Project saved.") {
    setBusy("Saving project...");
    try {
      const data = await saveMutation.mutateAsync({ id, proposal });
      setProposal(data.proposal);
      if (message) success(message);
      if (!id) router.replace(`/system-proposals/${data.proposal.id}`);
      return data.proposal;
    } catch (error) { fail(error); return null; } finally { setBusy(""); }
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    if (!id) return fail(new Error("Save the project brief before uploading files."));
    if (proposal.files.length + files.length > 5) return fail(new Error("A project can contain up to five source files."));
    setBusy("Uploading and analyzing files...");
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase browser configuration is missing.");
      let latest = proposal;
      for (const file of Array.from(files)) {
        const token = await requestJson<{ file: SystemSourceFile; path: string; token: string }>(`/api/system-proposals/${id}/files/upload-token`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, mimeType: file.type, sizeBytes: file.size }) });
        const { error } = await supabase.storage.from("system-proposal-inputs").uploadToSignedUrl(token.path, token.token, file, { contentType: file.type || undefined });
        if (error) {
          await fetch(`/api/system-proposals/${id}/files/${token.file.id}`, { method: "DELETE" });
          throw error;
        }
        const analyzed = await commandMutation.mutateAsync({ url: `/api/system-proposals/${id}/files/${token.file.id}/analyze`, init: { method: "POST" } });
        latest = analyzed.proposal;
        setProposal(latest);
        setSystemProposalQueryData(queryClient, latest);
      }
      setStage("review"); success("Files uploaded and profiled without executing formulas or macros.");
    } catch (error) { fail(error); } finally { setBusy(""); }
  }

  async function removeFile(file: SystemSourceFile) {
    if (!id || !window.confirm(`Remove "${file.originalName}" and invalidate its analysis?`)) return;
    setBusy("Removing file...");
    try {
      const data = await commandMutation.mutateAsync({ url: `/api/system-proposals/${id}/files/${file.id}`, init: { method: "DELETE" } });
      setProposal(data.proposal); setSystemProposalQueryData(queryClient, data.proposal); success("File removed. Run analyst discovery again.");
    } catch (error) { fail(error); } finally { setBusy(""); }
  }

  async function discover() {
    if (!id) return;
    const saved = await save(""); if (!saved) return;
    setBusy("Preparing analyst findings...");
    try {
      const data = await commandMutation.mutateAsync({ url: `/api/system-proposals/${id}/analysis`, init: { method: "POST" } });
      setProposal(data.proposal); setSystemProposalQueryData(queryClient, data.proposal); success("Analyst findings are ready for human review.");
    } catch (error) { fail(error); } finally { setBusy(""); }
  }

  async function generate() {
    if (!id) return;
    const saved = await save(""); if (!saved) return;
    setBusy("Generating proposal...");
    try {
      const data = await commandMutation.mutateAsync({ url: `/api/system-proposals/${id}/generate`, init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proposal: saved }) } });
      setProposal(data.proposal); setSystemProposalQueryData(queryClient, data.proposal); setStage("proposal"); success("Proposal generated and saved.");
    } catch (error) { fail(error); } finally { setBusy(""); }
  }

  async function exportDocx() {
    if (!id) return;
    setBusy("Building DOCX...");
    try {
      const response = await fetch(`/api/system-proposals/${id}/export`, { method: "POST" });
      if (!response.ok) throw new Error(((await response.json()) as { error?: string }).error ?? "Export failed.");
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "system-proposal.docx"; anchor.click(); URL.revokeObjectURL(url); success("Proposal DOCX exported.");
    } catch (error) { fail(error); } finally { setBusy(""); }
  }

  async function deleteProject() {
    if (!id || !window.confirm(`Delete "${proposal.brief.projectTitle}" and all private source files?`)) return;
    setBusy("Deleting project and private files...");
    try {
      await deleteMutation.mutateAsync(id);
      router.push("/system-proposals");
    } catch (error) {
      fail(error);
      setBusy("");
    }
  }

  if (id && proposalQuery.isPending) return <SystemProposalWorkspaceSkeleton />;
  if (id && proposalQuery.isError) return <QueryErrorState title="System proposal could not be loaded" detail={proposalQuery.error.message} onRetry={() => void proposalQuery.refetch()} />;

  return <div className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><Button asChild variant="ghost" className="mb-2 -ml-3"><Link href="/system-proposals"><ArrowLeft className="h-4 w-4" />System Proposals</Link></Button><h1 className="text-2xl font-semibold text-white">{id ? proposal.brief.projectTitle || "Intelligent System Proposal" : "New Intelligent System Proposal"}</h1><p className="mt-2 text-sm text-muted-foreground">Turn client data and reviewed evidence into a practical system recommendation.</p></div><div className="flex gap-2">{id ? <Badge variant="teal">{proposal.status}</Badge> : null}<Button variant="outline" onClick={() => void save()} disabled={Boolean(busy)}><Save className="h-4 w-4" />Save</Button>{id ? <Button variant="destructive" size="icon" title="Delete project" onClick={() => void deleteProject()} disabled={Boolean(busy)}><Trash2 className="h-4 w-4" /></Button> : null}</div></header>
    <div className="grid gap-2 rounded-md border border-white/10 bg-white/[0.03] p-2 sm:grid-cols-3">{stages.map((item) => { const Icon = item.icon; return <Button key={item.id} variant={stage === item.id ? "secondary" : "ghost"} className="justify-start" onClick={() => setStage(item.id)}><Icon className="h-4 w-4" />{item.label}</Button>; })}</div>
    {busy ? <p className="flex items-center gap-2 rounded-md border border-teal-300/20 bg-teal-300/10 p-3 text-sm text-teal-50"><Loader2 className="h-4 w-4 animate-spin" />{busy}</p> : null}
    {notice.text ? <p className={`rounded-md border p-3 text-sm ${notice.error ? "border-red-300/25 bg-red-400/10 text-red-100" : "border-teal-300/25 bg-teal-300/10 text-teal-50"}`}>{notice.text}</p> : null}
    {stage === "brief" ? <Brief proposal={proposal} clients={clients} update={updateBrief} upload={upload} remove={removeFile} saved={Boolean(id)} busy={Boolean(busy)} /> : null}
    {stage === "review" ? <><RelationshipSummary proposal={proposal} /><Review proposal={proposal} setProposal={setProposal} discover={discover} save={save} busy={Boolean(busy)} /><DataQualityEditor proposal={proposal} setProposal={setProposal} /></> : null}
    {stage === "proposal" ? <Proposal proposal={proposal} setProposal={setProposal} markdown={markdown} generate={generate} exportDocx={exportDocx} busy={Boolean(busy)} /> : null}
  </div>;
}

function SystemProposalWorkspaceSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading system proposal" aria-busy="true">
      <div className="space-y-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid gap-2 rounded-md border border-white/10 p-2 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-10" />)}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-24" />)}
      </div>
    </div>
  );
}

function Brief({ proposal, clients, update, upload, remove, saved, busy }: { proposal: IntelligentSystemProposal; clients: Client[]; update: (key: keyof IntelligentSystemProposal["brief"], value: string | null) => void; upload: (files: FileList | null) => void; remove: (file: SystemSourceFile) => void; saved: boolean; busy: boolean }) {
  return <section className="space-y-5 border-t border-white/10 pt-5"><div><h2 className="text-lg font-semibold">Project Brief</h2><p className="mt-1 text-sm text-muted-foreground">Define the business problem before interpreting the data.</p></div><div className="grid gap-4 md:grid-cols-2"><Field label="Client"><Select value={proposal.brief.clientId ?? ""} onChange={(event) => { const client = clients.find((item) => item.id === event.target.value); update("clientId", client?.id ?? null); update("clientName", client?.name ?? ""); }}><option value="">Select a client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</Select></Field><Field label="Project title"><Input value={proposal.brief.projectTitle} onChange={(event) => update("projectTitle", event.target.value)} placeholder="Sales Performance Intelligence System" /></Field></div><Field label="Business goal"><Textarea value={proposal.brief.businessGoal} onChange={(event) => update("businessGoal", event.target.value)} placeholder="What decision, workflow, or outcome should improve?" /></Field><div className="grid gap-4 md:grid-cols-2">{([['currentProcess','Current process','How the team works today'],['desiredOutcomes','Desired outcomes','Faster decisions, reporting, or automation'],['constraints','Constraints','Budget, timeline, hosting, policy, access'],['integrations','Systems and integrations','ERP, CRM, HRIS, APIs']] as const).map(([key,label,placeholder]) => <Field key={key} label={label}><Textarea value={proposal.brief[key]} onChange={(event) => update(key,event.target.value)} placeholder={placeholder} /></Field>)}</div><div className="space-y-3 border-t border-white/10 pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Source files</h3><p className="mt-1 text-sm text-muted-foreground">Up to five .xlsx or .csv files, 10 MB each. Raw rows remain private.</p></div><Button asChild variant="outline" className={!saved || proposal.files.length >= 5 ? "pointer-events-none opacity-50" : ""}><label><Upload className="h-4 w-4" />Upload files<input className="sr-only" type="file" accept=".xlsx,.csv" multiple disabled={!saved || busy} onChange={(event) => void upload(event.target.files)} /></label></Button></div>{!saved ? <p className="text-sm text-amber-100">Save the brief before uploading files.</p> : null}<div className="divide-y divide-white/10 rounded-md border border-white/10">{proposal.files.map((file) => <div key={file.id} className="flex items-center gap-3 p-3"><FileSpreadsheet className="h-5 w-5 text-teal-200" /><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{file.originalName}</div><p className="text-xs text-muted-foreground">{Math.max(1,Math.round(file.sizeBytes/1024))} KB · {file.status}</p>{file.errorMessage ? <p className="text-xs text-red-200">{file.errorMessage}</p> : null}</div><Button variant="ghost" size="icon" title="Remove file" onClick={() => void remove(file)}><Trash2 className="h-4 w-4" /></Button></div>)}</div></div></section>;
}

function Review({ proposal, setProposal, discover, save, busy }: { proposal: IntelligentSystemProposal; setProposal: Dispatch<SetStateAction<IntelligentSystemProposal>>; discover: () => void; save: (message?: string) => Promise<IntelligentSystemProposal | null>; busy: boolean }) {
  const analysis = proposal.combinedAnalysis;
  const setReview = <K extends keyof AnalystReview>(key: K, value: AnalystReview[K]) => setProposal((current) => current.analystReview ? ({ ...current, analystReview: { ...current.analystReview, [key]: value } }) : current);
  const setFile = (fileId: string, updater: (file: SystemSourceFile) => SystemSourceFile) => setProposal((current) => ({ ...current, files: current.files.map((file) => file.id === fileId ? updater(file) : file) }));
  return <section className="space-y-5 border-t border-white/10 pt-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-lg font-semibold">Data Review</h2><p className="mt-1 text-sm text-muted-foreground">Confirm sheet relevance, sensitive fields, field meanings, evidence, and assumptions.</p></div><Button variant="gold" onClick={discover} disabled={busy || !analysis}><RefreshCw className="h-4 w-4" />{proposal.analystReview ? "Refresh Findings" : "Create Analyst Findings"}</Button></div>{analysis ? <><div className="grid gap-3 sm:grid-cols-4">{[['Files',analysis.totalFiles],['Sheets',analysis.totalSheets],['Rows',analysis.totalRows],['Analyzed',analysis.analyzedRows]].map(([label,value]) => <div key={label} className="border-l-2 border-teal-300/60 bg-white/[0.03] p-3"><div className="text-xs uppercase text-muted-foreground">{label}</div><div className="mt-1 text-xl font-semibold">{Number(value).toLocaleString()}</div></div>)}</div>{analysis.partial || analysis.warnings.length ? <div className="rounded-md border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-50"><div className="flex gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />Partial analysis or warnings</div><ul className="mt-2 list-disc pl-5">{analysis.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div> : null}{proposal.files.filter((file) => file.analysis).map((file) => <details key={file.id} className="rounded-md border border-white/10"><summary className="cursor-pointer p-3 font-semibold">{file.originalName}</summary><div className="space-y-3 border-t border-white/10 p-3">{file.analysis!.sheets.map((sheet,sheetIndex) => <details key={sheet.name} className="border border-white/10"><summary className="cursor-pointer p-3 text-sm">{sheet.name} · {sheet.rowCount.toLocaleString()} rows · {sheet.columnCount} columns</summary><div className="space-y-3 border-t border-white/10 p-3"><label className="flex gap-2 text-sm"><Checkbox checked={sheet.included} onCheckedChange={(checked) => setFile(file.id,(current) => ({...current,analysis:current.analysis?{...current.analysis,sheets:current.analysis.sheets.map((item,index)=>index===sheetIndex?{...item,included:checked===true}:item)}:null}))} />Include this sheet</label><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs uppercase text-muted-foreground"><tr><th className="p-2">Field</th><th>Type</th><th>Missing</th><th>Distinct</th><th>Sensitive</th><th>Business meaning</th></tr></thead><tbody className="divide-y divide-white/10">{sheet.columns.map((column,columnIndex) => <tr key={`${column.name}-${columnIndex}`}><td className="p-2 font-medium">{column.name}</td><td>{column.inferredType}</td><td>{column.missingCount}</td><td>{column.distinctCount}</td><td><Checkbox checked={column.sensitive} onCheckedChange={(checked) => setFile(file.id,(current)=>({...current,analysis:current.analysis?{...current.analysis,sheets:current.analysis.sheets.map((item,index)=>index===sheetIndex?{...item,columns:item.columns.map((field,fieldIndex)=>fieldIndex===columnIndex?{...field,sensitive:checked===true,sensitiveReason:checked===true?field.sensitiveReason||'Marked by user':''}:field)}:item)}:null}))} /></td><td className="p-2"><Input value={column.userDescription} placeholder="Optional correction" onChange={(event)=>setFile(file.id,(current)=>({...current,analysis:current.analysis?{...current.analysis,sheets:current.analysis.sheets.map((item,index)=>index===sheetIndex?{...item,columns:item.columns.map((field,fieldIndex)=>fieldIndex===columnIndex?{...field,userDescription:event.target.value}:field)}:item)}:null}))} /></td></tr>)}</tbody></table></div></div></details>)}</div></details>)}</> : <div className="border border-dashed border-white/15 p-8 text-center text-sm text-muted-foreground">Upload source files in Project Brief first.</div>}{proposal.analystReview ? <div className="space-y-4 border-t border-white/10 pt-5"><div className="flex justify-between gap-3"><div><h3 className="font-semibold">Editable analyst findings</h3><p className="text-sm text-muted-foreground">Separate evidence, assumptions, and confirmation questions.</p></div><Button variant="outline" onClick={() => void save()}><Save className="h-4 w-4" />Save Review</Button></div><Field label="Executive assessment"><Textarea value={proposal.analystReview.executiveSummary} onChange={(event)=>setReview('executiveSummary',event.target.value)} /></Field><div className="grid gap-4 md:grid-cols-2"><Field label="Detected processes (one per line)"><Textarea value={proposal.analystReview.detectedProcesses.join('\n')} onChange={(event)=>setReview('detectedProcesses',toLines(event.target.value))} /></Field><Field label="Candidate KPIs (one per line)"><Textarea value={proposal.analystReview.candidateKpis.join('\n')} onChange={(event)=>setReview('candidateKpis',toLines(event.target.value))} /></Field><Field label="Risks and assumptions (one per line)"><Textarea value={proposal.analystReview.risks.join('\n')} onChange={(event)=>setReview('risks',toLines(event.target.value))} /></Field><Field label="Client confirmation questions (one per line)"><Textarea value={proposal.analystReview.questions.join('\n')} onChange={(event)=>setReview('questions',toLines(event.target.value))} /></Field></div><Field label="Additional business context"><Textarea value={proposal.analystReview.userNotes} onChange={(event)=>setReview('userNotes',event.target.value)} /></Field><div className="space-y-2"><h4 className="text-sm font-semibold">Recommended opportunities</h4>{proposal.analystReview.opportunities.map((item,index)=><div key={`${item.title}-${index}`} className="border-l-2 border-teal-300/60 bg-white/[0.03] p-3"><div className="font-medium">{item.title}</div><p className="mt-1 text-sm text-muted-foreground">{item.capability}</p><p className="mt-1 text-xs text-teal-100">Evidence: {item.evidence}</p></div>)}</div></div> : null}</section>;
}

function RelationshipSummary({ proposal }: { proposal: IntelligentSystemProposal }) {
  const relationships = proposal.combinedAnalysis?.relationships ?? [];
  if (!relationships.length) return null;
  return <section className="space-y-2 border-t border-white/10 pt-5"><h2 className="text-sm font-semibold">Candidate cross-file relationships</h2>{relationships.map((relationship) => <div key={`${relationship.field}-${relationship.sources.join("-")}`} className="border-l-2 border-blue-300/60 bg-white/[0.03] p-3 text-sm"><span className="font-semibold">{relationship.field}</span> - {relationship.sources.join(" and ")} - {relationship.confidence} confidence<p className="mt-1 text-muted-foreground">{relationship.evidence}</p></div>)}</section>;
}

function DataQualityEditor({ proposal, setProposal }: { proposal: IntelligentSystemProposal; setProposal: Dispatch<SetStateAction<IntelligentSystemProposal>> }) {
  const review = proposal.analystReview;
  if (!review?.dataQualityFindings.length) return null;
  function update(index: number, patch: Partial<AnalystReview["dataQualityFindings"][number]>) {
    setProposal((current) => current.analystReview ? ({ ...current, analystReview: { ...current.analystReview, dataQualityFindings: current.analystReview.dataQualityFindings.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) } }) : current);
  }
  return <section className="space-y-3 border-t border-white/10 pt-5"><div><h2 className="text-sm font-semibold">Editable data-quality findings</h2><p className="mt-1 text-sm text-muted-foreground">Correct the analyst interpretation while retaining the observed evidence.</p></div>{review.dataQualityFindings.map((item, index) => <div key={`${item.title}-${index}`} className="grid gap-2 border-l-2 border-amber-300/60 bg-white/[0.03] p-3 md:grid-cols-2"><Input value={item.title} onChange={(event) => update(index, { title: event.target.value })} /><Select value={item.severity} onChange={(event) => update(index, { severity: event.target.value as typeof item.severity })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select><Textarea value={item.detail} onChange={(event) => update(index, { detail: event.target.value })} /><Textarea value={item.evidence} onChange={(event) => update(index, { evidence: event.target.value })} /></div>)}</section>;
}

function Proposal({ proposal, setProposal, markdown, generate, exportDocx, busy }: { proposal: IntelligentSystemProposal; setProposal: Dispatch<SetStateAction<IntelligentSystemProposal>>; markdown: string; generate: () => void; exportDocx: () => void; busy: boolean }) {
  const updateCommercial = (patch: Partial<IntelligentSystemProposal["commercialInputs"]>) => setProposal((current)=>({...current,commercialInputs:{...current.commercialInputs,...patch}})); const total=proposal.commercialInputs.lineItems.reduce((sum,item)=>sum+(Number(item.amount)||0),0);
  return <section className="space-y-5 border-t border-white/10 pt-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-lg font-semibold">Proposal</h2><p className="mt-1 text-sm text-muted-foreground">The commercial section appears only when pricing is entered.</p></div><div className="flex gap-2"><Button variant="gold" onClick={generate} disabled={busy || !proposal.analystReview}><Sparkles className="h-4 w-4" />{proposal.proposalContent?'Regenerate':'Generate Proposal'}</Button>{proposal.proposalContent?<Button variant="outline" onClick={exportDocx}><Download className="h-4 w-4" />Export DOCX</Button>:null}</div></div><details className="rounded-md border border-white/10"><summary className="cursor-pointer p-3 font-semibold">Optional commercial inputs</summary><div className="space-y-4 border-t border-white/10 p-4"><div className="grid gap-4 sm:grid-cols-3"><Field label="Currency"><Input value={proposal.commercialInputs.currency} onChange={(event)=>updateCommercial({currency:event.target.value.toUpperCase()})} /></Field><Field label="VAT wording"><Select value={proposal.commercialInputs.vatStatus} onChange={(event)=>updateCommercial({vatStatus:event.target.value as IntelligentSystemProposal['commercialInputs']['vatStatus']})}><option>Excluding VAT</option><option>Including VAT</option></Select></Field><Field label="Proposal validity"><Input value={proposal.commercialInputs.proposalValidity} onChange={(event)=>updateCommercial({proposalValidity:event.target.value})} /></Field></div>{proposal.commercialInputs.lineItems.map((item,index)=><div key={item.id} className="grid gap-2 sm:grid-cols-[1fr_180px_40px]"><Input value={item.description} placeholder="Solution design" onChange={(event)=>updateCommercial({lineItems:proposal.commercialInputs.lineItems.map((current,currentIndex)=>currentIndex===index?{...current,description:event.target.value}:current)})}/><Input type="number" min="0" value={item.amount||''} placeholder="Amount" onChange={(event)=>updateCommercial({lineItems:proposal.commercialInputs.lineItems.map((current,currentIndex)=>currentIndex===index?{...current,amount:Number(event.target.value)}:current)})}/><Button variant="ghost" size="icon" title="Remove line item" onClick={()=>updateCommercial({lineItems:proposal.commercialInputs.lineItems.filter((_,currentIndex)=>currentIndex!==index)})}><Trash2 className="h-4 w-4" /></Button></div>)}<Button variant="outline" onClick={()=>updateCommercial({lineItems:[...proposal.commercialInputs.lineItems,{id:crypto.randomUUID(),description:'',amount:0}]})}><Plus className="h-4 w-4" />Add line item</Button>{proposal.commercialInputs.lineItems.length?<p className="font-semibold">Calculated total: {proposal.commercialInputs.currency} {total.toFixed(2)}</p>:null}<Field label="Payment terms"><Textarea value={proposal.commercialInputs.paymentTerms} onChange={(event)=>updateCommercial({paymentTerms:event.target.value})}/></Field></div></details>{proposal.proposalContent?<div className="overflow-hidden rounded-md border border-white/10 bg-[#07111f]/55"><div className="flex items-center justify-between border-b border-white/10 p-3"><div><h3 className="font-semibold">Generated Proposal</h3><p className="text-xs text-muted-foreground">Structured content rendered as Markdown.</p></div><Button variant="outline" onClick={()=>void navigator.clipboard.writeText(markdown)}><Clipboard className="h-4 w-4" />Copy Proposal</Button></div><MarkdownPreview value={markdown}/></div>:<div className="border border-dashed border-white/15 p-10 text-center text-sm text-muted-foreground">Complete Data Review, then generate the proposal.</div>}</section>;
}
