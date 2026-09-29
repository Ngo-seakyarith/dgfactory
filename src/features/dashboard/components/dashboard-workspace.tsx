"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarClock, CheckCheck, GraduationCap, MonitorCog, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/query-error-state";
import { useClientsQuery } from "@/features/crm/queries";
import { useClientProjectsQuery } from "@/features/pipeline/project-queries";
import { useTrainingPackagesQuery } from "@/features/training-packages/queries";
import { clientPerformance, collectTrainingFees, collectTrainingPaymentReminders, dashboardOwnerOptions, feeTotal, filterDashboardByOwner, formatFees, monthlyTrainingFees, projectStageCounts, type DashboardOwnerFilter, type MonthlyTrainingFees } from "../domain";
import { ChartSkeleton } from "./dashboard-skeleton";
import { FeeLegend, MonthlyFeesChart, ProjectLegend, ProjectStagesChart } from "./dashboard-charts";
import { TopClients } from "./top-clients";

const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

export function DashboardWorkspace() {
  const packagesQuery = useTrainingPackagesQuery();
  const projectsQuery = useClientProjectsQuery();
  const clientsQuery = useClientsQuery();
  const currentYear = new Date().getFullYear();
  const [owner, setOwner] = useState<DashboardOwnerFilter>("all");
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<number | null>(null);
  const [focused, setFocused] = useState<MonthlyTrainingFees | null>(null);
  const allFees = useMemo(() => collectTrainingFees(packagesQuery.data ?? [], projectsQuery.data ?? []), [packagesQuery.data, projectsQuery.data]);
  const owners = useMemo(() => dashboardOwnerOptions(clientsQuery.data ?? []), [clientsQuery.data]);
  const { trainings: fees, projects } = useMemo(() => filterDashboardByOwner(allFees, projectsQuery.data ?? [], clientsQuery.data ?? [], owner), [allFees, projectsQuery.data, clientsQuery.data, owner]);
  const monthlyRows = useMemo(() => monthlyTrainingFees(fees, year), [fees, year]);
  const stageRows = useMemo(() => projectStageCounts(projects), [projects]);
  const clientRows = useMemo(() => clientPerformance(fees, projects, clientsQuery.data ?? []), [fees, projects, clientsQuery.data]);
  const years = [...new Set([currentYear, ...allFees.flatMap((fee) => fee.paymentReceivedDate ? [Number(fee.paymentReceivedDate.slice(0, 4))] : [])])].sort((a, b) => b - a);
  const yearFees = fees.filter((fee) => fee.paymentReceivedDate?.startsWith(`${year}-`));
  const visibleFees = yearFees.filter((fee) => month === null || Number(fee.paymentReceivedDate!.slice(5, 7)) - 1 === month).sort((a, b) => a.paymentReceivedDate!.localeCompare(b.paymentReceivedDate!));
  const paymentReminders = useMemo(() => collectTrainingPaymentReminders(fees, projects), [fees, projects]);
  const ownerReady = owner === "all" || Boolean(clientsQuery.data);
  const feesReady = Boolean(packagesQuery.data && projectsQuery.data && ownerReady);
  const projectsReady = Boolean(projectsQuery.data && ownerReady);
  const feeError = packagesQuery.error?.message ?? projectsQuery.error?.message;
  const feesFailed = Boolean(feeError || (!ownerReady && clientsQuery.isError));
  const refreshing = [packagesQuery, projectsQuery, clientsQuery].some((query) => query.isFetching && !query.isPending);
  const monthLabel = month === null ? String(year) : `${monthlyRows[month * 2].month} ${year}`;
  const deliveredCount = fees.filter((fee) => fee.status === "Delivered").length;
  const contractedCount = fees.filter((fee) => fee.status === "Contracted").length;
  const metrics = [
    { label: "Delivered training fees", value: formatFees(feeTotal(fees, "Delivered")), icon: CheckCheck, ready: feesReady, failed: feesFailed, detail: `${deliveredCount} completed training${deliveredCount === 1 ? "" : "s"} - all time` },
    { label: "Contracted training fees", value: formatFees(feeTotal(fees, "Contracted")), icon: CalendarClock, ready: feesReady, failed: feesFailed, detail: `${contractedCount} contracted training${contractedCount === 1 ? "" : "s"} - all time` },
    { label: "Trainings", value: String(projects.filter((project) => project.projectType === "Training").length), icon: GraduationCap, ready: projectsReady, failed: projectsQuery.isError || clientsQuery.isError, detail: "All stages" },
    { label: "Intelligent system proposals", value: String(projects.filter((project) => project.projectType === "Intelligent System").length), icon: MonitorCog, ready: projectsReady, failed: projectsQuery.isError || clientsQuery.isError, detail: "All stages" },
  ];

  return <div className="space-y-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="page-heading"><div className="page-eyebrow">Business overview</div><h1 className="page-title">Dashboard</h1></div>
      <div className="flex max-w-full flex-wrap items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <label htmlFor="dashboard-owner" className="text-sm text-muted-foreground">Owner</label>
          <Select id="dashboard-owner" value={owner} className="w-48 max-w-full" disabled={!clientsQuery.data} onChange={(event) => { setOwner(event.target.value as DashboardOwnerFilter); setMonth(null); setFocused(null); }}>
            <option value="all">All owners</option>
            {owners.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            {owner.startsWith("owner:") && !owners.some((option) => option.value === owner) ? <option value={owner}>{owner.slice(6)}</option> : null}
            <option value="unassigned">Unassigned</option>
          </Select>
        </div>
        {refreshing ? <span className="text-xs text-muted-foreground">Refreshing...</span> : null}
        <Button type="button" variant="outline" size="icon" title="Refresh dashboard" aria-label="Refresh dashboard" disabled={refreshing} onClick={() => { void packagesQuery.refetch(); void projectsQuery.refetch(); void clientsQuery.refetch(); }}><RefreshCw className="h-4 w-4" /></Button>
      </div>
    </header>

    {clientsQuery.isError ? <QueryErrorState title="Account owners could not be loaded" detail={clientsQuery.error.message} onRetry={() => void clientsQuery.refetch()} /> : null}
    {feeError ? <QueryErrorState title={feesReady ? "Training fees could not be refreshed" : "Training fees could not be loaded"} detail={feeError} onRetry={() => { void packagesQuery.refetch(); void projectsQuery.refetch(); }} /> : null}
    <section aria-label="All-time overview" className="grid gap-6 border-y border-border py-6 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ label, value, icon: Icon, ready, failed, detail }) => <div key={label} className="min-w-0"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4 shrink-0" />{label}</div>{ready ? <><p className="mt-2 break-words text-2xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></> : failed ? <p className="mt-3 text-sm text-muted-foreground">Unavailable</p> : <><Skeleton className="mt-3 h-8 w-32" /><Skeleton className="mt-2 h-3 w-24" /></>}</div>)}
    </section>

    <section aria-labelledby="monthly-payment-fees" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 id="monthly-payment-fees" className="text-lg font-semibold">Training fees by payment month</h2><p className="mt-1 text-sm text-muted-foreground">By payment received date. Amounts are proposal fees.</p></div><div className="flex items-center gap-2"><label htmlFor="dashboard-year" className="text-sm text-muted-foreground">Year</label><Select id="dashboard-year" value={year} className="w-28" onChange={(event) => { setYear(Number(event.target.value)); setMonth(null); setFocused(null); }}>{years.map((value) => <option key={value} value={value}>{value}</option>)}</Select></div></div>
      {feesReady ? yearFees.length ? <><FeeLegend /><div className="min-w-0 border-y border-border bg-white py-3"><MonthlyFeesChart rows={monthlyRows} onFocus={setFocused} onMonthSelect={setMonth} /></div><p className="min-h-5 text-sm text-muted-foreground" aria-live="polite">{focused ? `${focused.month} ${focused.year}: ${focused.status} ${formatFees(focused.fee)} across ${focused.trainings.length} training${focused.trainings.length === 1 ? "" : "s"}.` : `${year}: ${formatFees(feeTotal(yearFees, "Delivered"))} delivered and ${formatFees(feeTotal(yearFees, "Contracted"))} contracted.`}</p></> : <div className="flex min-h-48 flex-col items-center justify-center gap-2 border-y border-border text-center"><CalendarClock className="h-6 w-6 text-muted-foreground" /><p className="font-medium">No payment dates recorded in {year}</p>{paymentReminders.length ? <a href="#payment-dates-needed" className="text-sm text-primary hover:underline">{paymentReminders.length} training{paymentReminders.length === 1 ? " has" : "s have"} no payment date</a> : null}</div> : !feesFailed ? <ChartSkeleton /> : null}
    </section>

    <section aria-labelledby="top-clients" className="min-w-0 border-t border-border pt-6">
      {feesReady && clientsQuery.data ? <TopClients rows={clientRows} /> : !feesFailed && !clientsQuery.isError ? <><h2 id="top-clients" className="mb-4 text-lg font-semibold">Top clients</h2><ChartSkeleton /></> : <h2 id="top-clients" className="text-lg font-semibold">Top clients unavailable</h2>}
    </section>

    <section aria-labelledby="project-stages" className="space-y-4 border-t border-border pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="project-stages" className="text-lg font-semibold">Pipeline stages</h2><Link href="/pipeline" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">Pipeline<ArrowRight className="h-4 w-4" /></Link></div>
      {projectsQuery.isError ? <QueryErrorState title="Pipeline counts could not be loaded" detail={projectsQuery.error.message} onRetry={() => void projectsQuery.refetch()} /> : null}
      {projectsReady ? projects.length ? <><ProjectLegend /><div className="min-w-0 border-y border-border bg-white py-3"><ProjectStagesChart rows={stageRows} /></div></> : <p className="py-10 text-center text-sm text-muted-foreground">{owner === "all" ? "No pipeline items yet." : "No pipeline items for this owner."}</p> : !projectsQuery.isError && !clientsQuery.isError ? <ChartSkeleton /> : null}
    </section>

    {feesReady && yearFees.length > 0 ? <section aria-labelledby="payment-month-details" className="space-y-4 border-t border-border pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="payment-month-details" className="text-lg font-semibold">Fees in {monthLabel}</h2>{month !== null ? <Button variant="outline" size="icon" title="Show all months" aria-label="Show all months" onClick={() => setMonth(null)}><X className="h-4 w-4" /></Button> : null}</div>
      {visibleFees.length ? <div className="overflow-x-auto border-y border-border"><table className="w-full text-left text-sm"><thead className="border-b border-border text-xs text-muted-foreground"><tr>{["Training / Client", "Payment received date", "Status", "Participants", "Fee (USD)"].map((label) => <th key={label} className="whitespace-nowrap px-3 py-3 font-medium">{label}</th>)}</tr></thead><tbody>{visibleFees.map((fee) => <tr key={fee.package.id} className="border-b border-border last:border-0"><td className="min-w-48 max-w-sm px-3 py-3"><Link href={`/packages/${fee.package.id}`} className="font-medium hover:text-primary">{fee.package.title}</Link><p className="mt-1 text-xs text-muted-foreground">{fee.package.client}</p></td><td className="whitespace-nowrap px-3 py-3">{dateFormatter.format(new Date(`${fee.paymentReceivedDate}T00:00:00Z`))}</td><td className="px-3 py-3">{fee.status}</td><td className="px-3 py-3 tabular-nums">{fee.package.pricingInputs.numberOfParticipants}</td><td className="whitespace-nowrap px-3 py-3 tabular-nums">{formatFees(fee.fee)}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">No payment dates recorded in {monthLabel}.</p>}
    </section> : null}

    {feesReady && paymentReminders.length ? <section aria-labelledby="payment-dates-needed" className="border-t border-border pt-6"><div className="flex flex-wrap items-baseline gap-2"><h2 id="payment-dates-needed" className="text-lg font-semibold">Payment dates not recorded</h2><span className="text-sm text-muted-foreground">{paymentReminders.length} training{paymentReminders.length === 1 ? "" : "s"}</span></div><p className="mt-1 text-sm text-muted-foreground">Contracted and Delivered training without a payment received date.</p><div className="mt-4 divide-y divide-border border-y border-border">{paymentReminders.map((reminder) => <Link key={reminder.id} href={reminder.href} className="group flex items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="break-words font-medium group-hover:text-primary">{reminder.title}</p><p className="mt-1 text-xs text-muted-foreground">{reminder.client} - {reminder.status}</p></div><div className="flex shrink-0 items-center gap-3 text-sm"><div className="text-right"><span className="tabular-nums">{reminder.amount === null ? "Amount not recorded" : formatFees(reminder.amount)}</span>{reminder.amountLabel ? <p className="mt-1 text-xs text-muted-foreground">{reminder.amountLabel}</p> : null}</div><ArrowRight className="h-4 w-4 text-muted-foreground" /></div></Link>)}</div></section> : null}
  </div>;
}
