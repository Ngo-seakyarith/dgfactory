import Link from "next/link";
import {
  Activity,
  CalendarCheck,
  ClipboardList,
  FileText,
  FolderOpen,
  Handshake,
  LineChart,
  Settings,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardMetrics } from "@/lib/dashboard";
import { loopTypeLabel } from "@/lib/loops/types";
import { PilotFeedbackButton } from "@/components/pilot-components";

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-teal-300/20 bg-teal-300/10 p-6 shadow-executive">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
            Standalone App
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">
            DG Academy AI Training Production Factory
          </h1>
          <p className="mt-3 text-sm leading-7 text-teal-50/80">
            Turn one training idea into a complete sellable package: syllabus,
            proposal, slide outline, workbook, follow-up email, quality checklist,
            pricing, and commercial proposal.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild variant="gold">
              <Link href="/packages/new">
                <Sparkles className="h-4 w-4" />
                Generate Training Package
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/packages">
                <FolderOpen className="h-4 w-4" />
                View Saved Packages
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/quality">
                <ShieldCheck className="h-4 w-4" />
                Quality Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Handshake}
          label="Active opportunities"
          value={String(metrics.activeOpportunities)}
          detail={`${metrics.pipelineValueFormatted} total pipeline`}
        />
        <MetricCard
          icon={LineChart}
          label="Weighted pipeline"
          value={metrics.weightedPipelineValueFormatted}
          detail="Probability-adjusted value"
        />
        <MetricCard
          icon={FileText}
          label="Packages this month"
          value={String(metrics.packagesCreatedThisMonth)}
          detail="Generated or saved packages"
        />
        <MetricCard
          icon={CalendarCheck}
          label="Upcoming delivery"
          value={String(metrics.upcomingDeliveryProjects)}
          detail="Next 30 days"
        />
        <MetricCard
          icon={ShieldCheck}
          label="Average QA score"
          value={String(metrics.averageQaScore || 0)}
          detail="Evaluation loop signal"
        />
        <MetricCard
          icon={ClipboardList}
          label="Pending approvals"
          value={String(metrics.pendingApprovals)}
          detail="Human approval queue"
        />
        <MetricCard
          icon={Activity}
          label="Pending follow-ups"
          value={String(metrics.pendingFollowUps)}
          detail="Due within 30 days"
        />
        <MetricCard
          icon={Settings}
          label="Latest loop recs"
          value={String(metrics.latestLoopRecommendations.length)}
          detail="From scheduled business loops"
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle>Latest Loop Recommendations</CardTitle>
            <CardDescription>
              Draft-only internal recommendations from V2.4 business loops.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.latestLoopRecommendations.length ? (
              metrics.latestLoopRecommendations.map((item) => (
                <div
                  key={`${item.createdAt}-${item.recommendation}`}
                  className="rounded-lg border border-white/10 bg-[#07111f]/55 p-3"
                >
                  <Badge variant="teal">{loopTypeLabel(item.loopType)}</Badge>
                  <p className="mt-2 text-sm leading-6 text-slate-100">
                    {item.recommendation}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-white/15 bg-[#07111f]/45 p-4 text-sm text-muted-foreground">
                No loop recommendations yet. Run a loop from `/loops`.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle>Operating Snapshot</CardTitle>
            <CardDescription>
              Items that need DG Academy attention.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SnapshotRow label="Active opportunities" value={metrics.activeOpportunityList.length} />
            <SnapshotRow label="Upcoming delivery projects" value={metrics.upcomingDeliveryList.length} />
            <SnapshotRow label="Follow-ups due soon" value={metrics.pendingFollowUpList.length} />
            <div className="pt-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/pipeline">Open Pipeline</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <FactoryCard
          icon={FileText}
          title="Content Package"
          detail="Generate client-ready training content with OpenAI or deterministic mock fallback."
        />
        <FactoryCard
          icon={Sparkles}
          title="Commercial Offer"
          detail="Calculate pricing from code and create clean client-facing investment language."
        />
        <FactoryCard
          icon={Settings}
          title="Export + Feedback"
          detail="Copy, export, score outputs, and turn feedback into approved improvement suggestions."
        />
      </section>

      <PilotFeedbackButton
        relatedPage="/dashboard"
        relatedFeature="Dashboard"
      />
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-teal-300/20 bg-teal-300/10 text-teal-100">
          <Icon className="h-5 w-5" />
        </div>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
        <p className="text-xs leading-5 text-muted-foreground">{detail}</p>
      </CardHeader>
    </Card>
  );
}

function SnapshotRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#07111f]/55 p-3">
      <span className="text-sm text-slate-100">{label}</span>
      <Badge variant={value ? "gold" : "outline"}>{value}</Badge>
    </div>
  );
}

function FactoryCard({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof FileText;
  title: string;
  detail: string;
}) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-teal-300/20 bg-teal-300/10 text-teal-100">
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{detail}</CardDescription>
      </CardHeader>
    </Card>
  );
}
