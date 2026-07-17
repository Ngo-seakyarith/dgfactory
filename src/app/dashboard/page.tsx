import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  FileCog,
  FilePlus2,
  FileText,
  Handshake,
  LineChart,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardMetrics } from "@/lib/dashboard";
import { loopTypeLabel } from "@/lib/loops/types";

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();

  return (
    <div className="space-y-7">
      <section className="grid gap-5 border-b border-border pb-7 xl:grid-cols-[1fr_auto] xl:items-end">
        <div className="page-heading">
          <div className="page-eyebrow">Production desk</div>
          <h1 className="page-title">DG Academy Factory</h1>
          <p className="page-description">
            Create client work, track confirmed delivery, and keep the next
            operational decision visible.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="gold">
            <Link href="/packages/new"><FilePlus2 /> New training package</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/system-proposals/new"><FileCog /> New system proposal</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={FileText}
          label="Packages this month"
          value={String(metrics.packagesCreatedThisMonth)}
          detail="Generated or updated"
        />
        <Metric
          icon={Handshake}
          label="Active opportunities"
          value={String(metrics.activeOpportunities)}
          detail={metrics.pipelineValueFormatted}
        />
        <Metric
          icon={LineChart}
          label="Weighted pipeline"
          value={metrics.weightedPipelineValueFormatted}
          detail="Probability adjusted"
        />
        <Metric
          icon={CalendarCheck}
          label="Upcoming delivery"
          value={String(metrics.upcomingDeliveryProjects)}
          detail="Next 30 days"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="data-label">Attention queue</div>
                <CardTitle className="mt-2 text-lg">What needs action</CardTitle>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/pipeline">Open pipeline <ArrowRight /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            <AttentionRow icon={Activity} label="Follow-ups due soon" value={metrics.pendingFollowUps} href="/pipeline" />
            <AttentionRow icon={CalendarCheck} label="Upcoming training deliveries" value={metrics.upcomingDeliveryProjects} href="/delivery" />
            <AttentionRow icon={ClipboardList} label="Pending approvals" value={metrics.pendingApprovals} href="/approvals" />
            <AttentionRow icon={ShieldCheck} label="Average QA score" value={metrics.averageQaScore || 0} href="/quality" suffix="/100" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border">
            <div className="data-label">Latest signals</div>
            <CardTitle className="mt-2 text-lg">Loop recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {metrics.latestLoopRecommendations.length ? (
              metrics.latestLoopRecommendations.slice(0, 4).map((item) => (
                <div key={`${item.createdAt}-${item.recommendation}`} className="border-l-2 border-[#20867d] bg-muted/45 px-3 py-2.5">
                  <Badge variant="teal">{loopTypeLabel(item.loopType)}</Badge>
                  <p className="mt-2 text-sm leading-6 text-foreground">{item.recommendation}</p>
                </div>
              ))
            ) : (
              <div className="border border-dashed border-border p-6 text-sm leading-6 text-muted-foreground">
                No recommendations yet. Run a review when you need an updated operational signal.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof FileText; label: string; value: string; detail: string }) {
  return (
    <div className="bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <span className="data-label">{label}</span>
        <Icon className="h-4 w-4 text-[#20867d]" />
      </div>
      <div className="mt-4 text-3xl font-semibold leading-none text-foreground">{value}</div>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function AttentionRow({ icon: Icon, label, value, href, suffix = "" }: { icon: typeof Activity; label: string; value: number; href: string; suffix?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/55">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:text-[#a94b18]">
        <Icon className="h-4 w-4" />
      </div>
      <span className="min-w-0 flex-1 text-sm font-medium">{label}</span>
      <span className="font-mono text-sm font-semibold">{value}{suffix}</span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
