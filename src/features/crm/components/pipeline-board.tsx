"use client";

import Link from "next/link";
import { CalendarCheck, CalendarClock } from "lucide-react";

import { QueryErrorState } from "@/components/query-error-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DeliveryProject } from "@/features/delivery";
import { useDeliveryProjectsQuery } from "@/features/delivery/queries";
import {
  calculatePipelineMetrics,
  formatCrmMoney,
  opportunityStatuses,
  type Client,
  type Opportunity,
  type OpportunityStatus,
} from "@/features/crm/domain";
import {
  useClientsQuery,
  useOpportunitiesQuery,
} from "@/features/crm/queries";

import { Metric } from "./shared";

const pipelineStatusAccents: Record<OpportunityStatus, string> = {
  Lead: "bg-[hsl(var(--muted-foreground))]",
  Discovery: "bg-[hsl(var(--chart-3))]",
  "Syllabus Sent": "bg-[hsl(var(--chart-1))]",
  "Proposal Sent": "bg-[hsl(var(--chart-4))]",
  Negotiation: "bg-[hsl(var(--chart-4))]",
  Won: "bg-[hsl(var(--chart-2))]",
  Prepared: "bg-[hsl(var(--chart-1))]",
  Delivered: "bg-[hsl(var(--chart-2))]",
  Lost: "bg-[hsl(var(--destructive))]",
  Dormant: "bg-[hsl(var(--muted-foreground))]",
};

const closedOpportunityStatuses: OpportunityStatus[] = [
  "Won",
  "Prepared",
  "Delivered",
  "Lost",
  "Dormant",
];

function deliveryProgressLabel(delivery?: DeliveryProject) {
  if (
    !delivery ||
    !["Prepared", "Delivered"].includes(delivery.deliveryStatus)
  ) {
    return null;
  }
  return delivery.deliveryStatus;
}

function PipelineDealCard({
  opportunity,
  client,
  delivery,
}: {
  opportunity: Opportunity;
  client?: Client;
  delivery?: DeliveryProject;
}) {
  const deliveryLabel = deliveryProgressLabel(delivery);
  const showFollowUp =
    Boolean(opportunity.nextFollowUpDate) &&
    !closedOpportunityStatuses.includes(opportunity.status);

  return (
    <Link
      href={`/opportunities/${opportunity.id}`}
      className="block rounded-md border border-border bg-card p-3 shadow-sm transition hover:border-[#20867d]/50 hover:shadow-md"
    >
      <div className="line-clamp-2 text-sm font-semibold leading-5 text-card-foreground">
        {opportunity.title}
      </div>
      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
        {client?.name ?? "Unassigned client"}
      </p>
      <div className="mt-3">
        <span className="font-mono text-xs font-semibold text-foreground">
          {formatCrmMoney(opportunity.estimatedValue)}
        </span>
      </div>
      {deliveryLabel || showFollowUp ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border pt-2.5">
          {deliveryLabel ? (
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-accent px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground">
              <CalendarCheck className="h-3 w-3" />
              {deliveryLabel}
            </span>
          ) : null}
          {showFollowUp ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CalendarClock className="h-3 w-3" />
              {opportunity.nextFollowUpDate}
            </span>
          ) : null}
        </div>
      ) : null}
    </Link>
  );
}

export function PipelineBoard() {
  const clientsQuery = useClientsQuery();
  const opportunitiesQuery = useOpportunitiesQuery();
  const deliveriesQuery = useDeliveryProjectsQuery();
  const clients = clientsQuery.data ?? [];
  const opportunities = opportunitiesQuery.data ?? [];
  const deliveries = deliveriesQuery.data ?? [];
  const metrics = calculatePipelineMetrics(opportunities);
  const isPending = clientsQuery.isPending || opportunitiesQuery.isPending;
  const error = clientsQuery.error ?? opportunitiesQuery.error;
  const isRefreshing =
    clientsQuery.isFetching ||
    opportunitiesQuery.isFetching ||
    deliveriesQuery.isFetching;
  const notice = deliveriesQuery.isError
    ? "Delivery progress is temporarily unavailable."
    : isRefreshing
      ? "Refreshing pipeline..."
      : "";

  if (isPending) {
    return <PipelineBoardSkeleton />;
  }

  if (error) {
    return (
      <QueryErrorState
        title="Pipeline could not be loaded"
        detail={error.message}
        onRetry={() => {
          void Promise.all([
            clientsQuery.refetch(),
            opportunitiesQuery.refetch(),
          ]);
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <Metric label="Total opps" value={metrics.totalOpportunities.toString()} />
        <Metric label="Total value" value={formatCrmMoney(metrics.totalEstimatedValue)} />
        <Metric label="Proposals sent" value={metrics.proposalsSent.toString()} />
        <Metric label="Won" value={metrics.wonOpportunities.toString()} />
        <Metric label="Lost" value={metrics.lostOpportunities.toString()} />
      </section>

      <FollowUpReminder opportunities={metrics.upcomingFollowUps} clients={clients} />

      <Card>
        <CardHeader>
          <CardTitle>Pipeline Board</CardTitle>
          <CardDescription>{notice}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="-mx-1 overflow-x-auto pb-1">
            <div className="flex min-w-max gap-3 px-1">
              {opportunityStatuses.map((status) => {
                const items = opportunities.filter((item) => item.status === status);
                return (
                  <div
                    key={status}
                    className="flex w-[260px] shrink-0 flex-col rounded-lg border border-border bg-muted/60"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${pipelineStatusAccents[status]}`}
                        />
                        <span className="data-label truncate">{status}</span>
                      </div>
                      <span className="rounded-sm bg-background px-1.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
                        {items.length}
                      </span>
                    </div>
                    <div className="flex min-h-[140px] flex-col gap-2 p-2">
                      {items.length ? (
                        items.map((opportunity) => (
                          <PipelineDealCard
                            key={opportunity.id}
                            opportunity={opportunity}
                            client={clients.find(
                              (client) => client.id === opportunity.clientId,
                            )}
                            delivery={deliveries.find(
                              (project) =>
                                project.opportunityId === opportunity.id ||
                                (opportunity.linkedPackageId !== null &&
                                  project.packageId === opportunity.linkedPackageId),
                            )}
                          />
                        ))
                      ) : (
                        <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                          No deals
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PipelineBoardSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading pipeline" aria-busy="true">
      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="-mx-1 overflow-hidden pb-1">
            <div className="flex min-w-max gap-3 px-1">
              {opportunityStatuses.map((status) => (
                <div
                  key={status}
                  className="w-[260px] shrink-0 rounded-lg border border-border bg-muted/60"
                >
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <span className="data-label">{status}</span>
                  </div>
                  <div className="space-y-2 p-2">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function FollowUpReminder({
  opportunities,
  clients,
}: {
  opportunities: Opportunity[];
  clients: Client[];
}) {
  return (
    <Card className="border-[#20867d]/25 bg-[#20867d]/[0.06]">
      <CardHeader>
        <CardTitle>Upcoming Follow-Ups</CardTitle>
        <CardDescription>
          Opportunities with follow-up dates in the next 14 days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {opportunities.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {opportunities.map((opportunity) => (
              <Link
                key={opportunity.id}
                href={`/opportunities/${opportunity.id}`}
                className="rounded-md border border-border bg-card p-3 shadow-sm transition hover:border-[#20867d]/50 hover:shadow-md"
              >
                <div className="line-clamp-1 font-medium text-card-foreground">
                  {opportunity.title}
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5 shrink-0 text-[#176a63]" />
                  {clients.find((client) => client.id === opportunity.clientId)?.name ?? "Client"} - {opportunity.nextFollowUpDate}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No upcoming follow-ups in the next 14 days.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

