"use client";

import Link from "next/link";
import { FileText, MonitorCog } from "lucide-react";

import { QueryErrorState } from "@/components/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrainingPackagesQuery } from "@/features/training-packages/queries";
import { useSolutionProposalsQuery } from "@/features/digital-solution-proposals/queries";
import { proposalStages, trainingOverview, type ProposalStage } from "@/features/pipeline/domain";
import { ProposalStageControl } from "@/features/pipeline/proposal-stage-control";
import { formatMoney } from "@/features/training-packages/domain/pricing";
import { formatDateTime } from "@/lib/date-time";

type PipelineItem = {
  id: string;
  title: string;
  client: string;
  kind: "training_package" | "system_proposal";
  status: ProposalStage;
  ready: boolean;
  href: string;
  updatedAt: string;
  scheduleDate?: string;
};

export function PipelineBoard() {
  const packagesQuery = useTrainingPackagesQuery();
  const proposalsQuery = useSolutionProposalsQuery();
  const error = packagesQuery.error ?? proposalsQuery.error;
  const overview = trainingOverview(packagesQuery.data ?? []);
  const items: PipelineItem[] = [
    ...(packagesQuery.data ?? []).map((pkg) => ({
      id: pkg.id,
      title: pkg.title,
      client: pkg.client,
      kind: "training_package" as const,
      status: pkg.salesStatus,
      ready: pkg.status === "Generated",
      href: `/packages/${pkg.id}`,
      updatedAt: pkg.updatedAt,
      scheduleDate: pkg.proposalBrief.scheduleDate,
    })),
    ...(proposalsQuery.data ?? []).map((proposal) => ({
      id: proposal.id,
      title: proposal.title,
      client: proposal.clientName,
      kind: "system_proposal" as const,
      status: proposal.salesStatus,
      ready: proposal.status === "Generated",
      href: `/solution-proposals/${proposal.id}`,
      updatedAt: proposal.updatedAt,
    })),
  ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  if ((packagesQuery.isPending && !packagesQuery.data) || (proposalsQuery.isPending && !proposalsQuery.data)) {
    return (
      <div className="space-y-5" aria-label="Loading pipeline" aria-busy="true">
        <div className="grid grid-cols-2 gap-4 border-y border-border py-4 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="space-y-2 border-l-2 border-border pl-3"><Skeleton className="h-3 w-24" /><Skeleton className="h-7 w-12" /></div>)}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-44 w-full" />)}</div>
      </div>
    );
  }
  if (error) {
    return <QueryErrorState title="Pipeline could not be loaded" detail={error.message} onRetry={() => { void packagesQuery.refetch(); void proposalsQuery.refetch(); }} />;
  }

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-4 border-y border-border py-4 sm:grid-cols-4" aria-label="Proposal overview">
        {[
          { label: "Training proposals", value: overview.trainingProposals },
          { label: "Revenue (Won + Delivered)", value: formatMoney(overview.bookedRevenue), title: "Sum of entered professional fees for Won and Delivered training packages. Payments are not tracked." },
          { label: "Clients in proposals", value: overview.clientsInProposals },
          { label: "Intelligent system proposals", value: proposalsQuery.data?.length ?? 0 },
        ].map((metric) => (
          <div key={metric.label} className="min-w-0 border-l-2 border-border pl-3" title={metric.title}>
            <div className="min-h-8 text-xs font-medium leading-4 text-muted-foreground">{metric.label}</div>
            <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">{metric.value}</div>
          </div>
        ))}
      </section>
      {(packagesQuery.isFetching || proposalsQuery.isFetching) && <p className="text-xs text-muted-foreground">Refreshing...</p>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {proposalStages.map((stage) => {
          const matches = items.filter((item) => item.status === stage);
          return (
            <section key={stage} className="min-w-0 border-t-2 border-border pt-3" aria-label={stage}>
              <h2 className="mb-3 flex items-center justify-between text-sm font-semibold"><span>{stage}</span><span className="text-muted-foreground">{matches.length}</span></h2>
              <div className="space-y-2">
                {matches.length ? matches.map((item) => (
                  <div key={item.id} className="rounded-md border border-border bg-card p-3">
                    <Link href={item.href} className="block font-medium leading-5 hover:text-primary">{item.title}</Link>
                    <p className="mt-1 text-xs text-muted-foreground">{item.client || "No client"}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">{item.kind === "training_package" ? <FileText className="h-3.5 w-3.5" /> : <MonitorCog className="h-3.5 w-3.5" />}{item.kind === "training_package" ? "Training" : "Intelligent system"}</p>
                    {item.kind === "training_package" && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Training date: {item.scheduleDate || "Not scheduled"}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">Updated: {formatDateTime(item.updatedAt)}</p>
                    <div className="mt-3 border-t border-border pt-3"><ProposalStageControl id={item.id} kind={item.kind} status={item.status} disabled={!item.ready} /></div>
                  </div>
                )) : <p className="py-5 text-center text-xs text-muted-foreground">No proposals</p>}
              </div>
            </section>
          );
        })}
      </div>
      {!items.length && <p className="text-sm text-muted-foreground">Create a training package or intelligent system proposal to see it here.</p>}
    </div>
  );
}
