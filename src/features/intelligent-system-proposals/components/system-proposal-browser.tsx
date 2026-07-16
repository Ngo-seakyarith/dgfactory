"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, FileCog, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryErrorState } from "@/components/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { IntelligentSystemProposal } from "../domain/types";
import { useSystemProposalsQuery } from "../queries";

export function SystemProposalBrowser() {
  const proposalsQuery = useSystemProposalsQuery();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const proposals = proposalsQuery.data ?? [];
    const value = query.trim().toLowerCase();
    return value
      ? proposals.filter((proposal) => [proposal.brief.projectTitle, proposal.brief.clientName, proposal.brief.businessGoal].join(" ").toLowerCase().includes(value))
      : proposals;
  }, [proposalsQuery.data, query]);

  return <div className="space-y-5">
    <div className="flex flex-wrap gap-3"><div className="relative min-w-[240px] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by project or client" /></div><Button asChild variant="gold"><Link href="/system-proposals/new"><Plus className="h-4 w-4" />New System Proposal</Link></Button></div>
    <p className="text-sm text-muted-foreground">{proposalsQuery.isPending ? "Loading system proposals..." : proposalsQuery.isFetching ? "Refreshing system proposals..." : "Showing Supabase-backed intelligent system proposals."}</p>
    {proposalsQuery.isError ? <QueryErrorState title="System proposals could not be loaded" detail={proposalsQuery.error.message} onRetry={() => void proposalsQuery.refetch()} /> : proposalsQuery.isPending ? <SystemProposalSkeleton /> : filtered.length ? <div className="grid gap-3 md:grid-cols-2">{filtered.map((proposal) => <Link key={proposal.id} href={`/system-proposals/${proposal.id}`} className="group border border-white/10 bg-white/[0.035] p-4 transition hover:border-teal-300/35 hover:bg-teal-300/10"><div className="flex items-start gap-3"><FileCog className="mt-0.5 h-5 w-5 text-teal-200" /><div className="min-w-0 flex-1"><div className="line-clamp-1 font-semibold">{proposal.brief.projectTitle}</div><p className="mt-1 text-sm text-muted-foreground">{proposal.brief.clientName}</p></div><ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-teal-100" /></div><div className="mt-4 flex flex-wrap gap-2"><Badge variant="teal">{proposal.status}</Badge><Badge variant="outline">Updated {new Date(proposal.updatedAt).toLocaleDateString()}</Badge></div></Link>)}</div> : <div className="border border-dashed border-white/15 p-10 text-center"><FileCog className="mx-auto h-6 w-6 text-teal-200" /><h2 className="mt-3 font-semibold">{query.trim() ? "No matching system proposals" : "No system proposals yet"}</h2><Button asChild variant="gold" className="mt-4"><Link href="/system-proposals/new"><Plus className="h-4 w-4" />Create First Proposal</Link></Button></div>}
  </div>;
}

function SystemProposalSkeleton() {
  return <div className="grid gap-3 md:grid-cols-2" aria-label="Loading system proposals" aria-busy="true">{Array.from({ length: 4 }, (_, index) => <div key={index} className="border border-white/10 bg-white/[0.035] p-4"><div className="flex gap-3"><Skeleton className="h-5 w-5 shrink-0" /><div className="w-full space-y-3"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-1/2" /></div></div><div className="mt-4 flex gap-2"><Skeleton className="h-6 w-20" /><Skeleton className="h-6 w-28" /></div></div>)}</div>;
}
