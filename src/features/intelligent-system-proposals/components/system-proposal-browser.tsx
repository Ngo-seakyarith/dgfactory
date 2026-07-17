"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, FileCog, Plus, Search } from "lucide-react";

import { QueryErrorState } from "@/components/query-error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { useSystemProposalsQuery } from "../queries";

export function SystemProposalBrowser() {
  const proposalsQuery = useSystemProposalsQuery();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    const proposals = proposalsQuery.data ?? [];
    return value
      ? proposals.filter((proposal) =>
          [
            proposal.brief.projectTitle,
            proposal.brief.clientName,
            proposal.brief.businessGoal,
          ]
            .join(" ")
            .toLowerCase()
            .includes(value),
        )
      : proposals;
  }, [proposalsQuery.data, query]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search project, client, or business goal"
          />
        </div>
        <Button asChild variant="gold">
          <Link href="/system-proposals/new"><Plus /> New system proposal</Link>
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="data-label">Consulting archive</div>
          <h2 className="mt-1 text-lg font-semibold">System proposals</h2>
        </div>
        <Badge variant="teal">
          {proposalsQuery.isPending ? "Loading" : `${filtered.length} visible`}
        </Badge>
      </div>

      {proposalsQuery.isError ? (
        <QueryErrorState
          title="System proposals could not be loaded"
          detail={proposalsQuery.error.message}
          onRetry={() => void proposalsQuery.refetch()}
        />
      ) : proposalsQuery.isPending ? (
        <SystemProposalSkeleton />
      ) : filtered.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((proposal) => (
            <Link
              key={proposal.id}
              href={`/system-proposals/${proposal.id}`}
              className="group rounded-lg border border-border bg-card p-4 shadow-sm transition hover:border-[#f4772e]/45 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#20867d]/10 text-[#176a63]">
                  <FileCog className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 font-semibold leading-6">
                    {proposal.brief.projectTitle}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {proposal.brief.clientName}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-[#a94b18]" />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge variant="teal">{proposal.status}</Badge>
                <Badge variant="outline">
                  Updated {new Date(proposal.updatedAt).toLocaleDateString()}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <FileCog className="mx-auto h-7 w-7 text-[#20867d]" />
          <h2 className="mt-3 font-semibold">
            {query.trim() ? "No matching system proposals" : "No system proposals yet"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {query.trim()
              ? "Try a different client or project term."
              : "Start with a client brief and source data to build the first recommendation."}
          </p>
          {!query.trim() ? (
            <Button asChild variant="gold" className="mt-4">
              <Link href="/system-proposals/new"><Plus /> Create first proposal</Link>
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function SystemProposalSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2" aria-label="Loading system proposals" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="rounded-lg border border-border bg-card p-4">
          <div className="flex gap-3">
            <Skeleton className="h-9 w-9 shrink-0" />
            <div className="w-full space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}
