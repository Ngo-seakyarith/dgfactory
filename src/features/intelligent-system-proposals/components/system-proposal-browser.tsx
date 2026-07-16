"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FileCog, Loader2, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { IntelligentSystemProposal } from "../domain/types";

export function SystemProposalBrowser() {
  const [proposals, setProposals] = useState<IntelligentSystemProposal[]>([]);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("Loading system proposals...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/system-proposals", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as { proposals?: IntelligentSystemProposal[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "System proposal database read failed.");
        setProposals(payload.proposals ?? []);
        setNotice("Showing Supabase-backed intelligent system proposals.");
      })
      .catch((error: unknown) => setNotice(error instanceof Error ? error.message : "Database read failed."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return value
      ? proposals.filter((proposal) => [proposal.brief.projectTitle, proposal.brief.clientName, proposal.brief.businessGoal].join(" ").toLowerCase().includes(value))
      : proposals;
  }, [proposals, query]);

  return <div className="space-y-5">
    <div className="flex flex-wrap gap-3"><div className="relative min-w-[240px] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by project or client" /></div><Button asChild variant="gold"><Link href="/system-proposals/new"><Plus className="h-4 w-4" />New System Proposal</Link></Button></div>
    <p className="text-sm text-muted-foreground">{notice}</p>
    {loading ? <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div> : filtered.length ? <div className="grid gap-3 md:grid-cols-2">{filtered.map((proposal) => <Link key={proposal.id} href={`/system-proposals/${proposal.id}`} className="group border border-white/10 bg-white/[0.035] p-4 transition hover:border-teal-300/35 hover:bg-teal-300/10"><div className="flex items-start gap-3"><FileCog className="mt-0.5 h-5 w-5 text-teal-200" /><div className="min-w-0 flex-1"><div className="line-clamp-1 font-semibold">{proposal.brief.projectTitle}</div><p className="mt-1 text-sm text-muted-foreground">{proposal.brief.clientName}</p></div><ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-teal-100" /></div><div className="mt-4 flex flex-wrap gap-2"><Badge variant="teal">{proposal.status}</Badge><Badge variant="outline">Updated {new Date(proposal.updatedAt).toLocaleDateString()}</Badge></div></Link>)}</div> : <div className="border border-dashed border-white/15 p-10 text-center"><FileCog className="mx-auto h-6 w-6 text-teal-200" /><h2 className="mt-3 font-semibold">No system proposals yet</h2><Button asChild variant="gold" className="mt-4"><Link href="/system-proposals/new"><Plus className="h-4 w-4" />Create First Proposal</Link></Button></div>}
  </div>;
}
