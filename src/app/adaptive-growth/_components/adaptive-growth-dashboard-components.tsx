"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BrainCircuit,
  Clipboard,
  Download,
  FlaskConical,
  GitBranch,
  Layers3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sprout,
  Target,
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
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type {
  AdaptiveDashboardRange,
  AdaptiveGrowthExecutiveReport,
} from "@/lib/adaptive-growth-dashboard";
import type { AdaptiveGrowthRecommendationsOutput } from "@/lib/brain/agents";

const rangeLabels: Record<AdaptiveDashboardRange, string> = {
  this_week: "This week",
  last_30_days: "Last 30 days",
  this_quarter: "This quarter",
  custom: "Custom",
};

type DashboardPayload = {
  report: AdaptiveGrowthExecutiveReport;
  markdown: string;
};

export function AdaptiveGrowthExecutiveDashboard() {
  const [range, setRange] = useState<AdaptiveDashboardRange>("last_30_days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [recommendations, setRecommendations] =
    useState<AdaptiveGrowthRecommendationsOutput | null>(null);
  const [notice, setNotice] = useState("Loading Adaptive Growth Dashboard...");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams({ range });
    if (range === "custom") {
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
    }
    return params.toString();
  }, [range, startDate, endDate]);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setNotice("Loading Adaptive Growth Dashboard...");
    try {
      const response = await fetch(`/api/adaptive-growth/dashboard?${query}`, {
        cache: "no-store",
      });
      const nextPayload = (await response.json()) as DashboardPayload & {
        error?: string;
      };
      if (!response.ok) throw new Error(nextPayload.error ?? "Dashboard load failed.");
      setPayload(nextPayload);
      setNotice("Dashboard updated from current growth, loop, approval, and improvement data.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Dashboard load failed.");
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  async function generateRecommendations() {
    setIsGenerating(true);
    setRecommendations(null);
    try {
      const response = await fetch(
        `/api/adaptive-growth/dashboard/recommendations?${query}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ range, startDate, endDate }),
        },
      );
      const result = (await response.json()) as {
        recommendations?: AdaptiveGrowthRecommendationsOutput;
        notice?: string;
        error?: string;
      };
      if (!response.ok || !result.recommendations) {
        throw new Error(result.error ?? "Recommendation generation failed.");
      }
      setRecommendations(result.recommendations);
      setNotice(result.notice ?? "Recommendations generated from available data.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Recommendation generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyReport() {
    if (!payload) return;
    await navigator.clipboard.writeText(payload.markdown);
    setCopyStatus("Report copied.");
    window.setTimeout(() => setCopyStatus(""), 1800);
  }

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (isLoading && !payload) {
    return (
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading executive adaptation view...
        </CardContent>
      </Card>
    );
  }

  const report = payload?.report;

  return (
    <div className="space-y-5">
      <Card className="border-teal-300/20 bg-teal-300/10 shadow-executive">
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <Badge variant="teal">Executive Adaptation View</Badge>
            <Badge variant="outline">Sensing - Mutating - Testing - Selecting - Replicating</Badge>
          </div>
          <CardTitle>Adaptive Growth Dashboard</CardTitle>
          <CardDescription>
            {notice} The score is deterministic; AI recommendations only explain
            the visible evidence and uncertainty.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <label className="space-y-2">
            <span className="text-sm font-medium text-white">Date filter</span>
            <Select
              value={range}
              onChange={(event) => setRange(event.target.value as AdaptiveDashboardRange)}
            >
              {Object.entries(rangeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </label>
          {range === "custom" ? (
            <>
              <label className="space-y-2">
                <span className="text-sm font-medium text-white">Start</span>
                <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-white">End</span>
                <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              </label>
            </>
          ) : null}
          <Button type="button" variant="outline" onClick={loadDashboard}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button type="button" variant="gold" onClick={generateRecommendations} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate Recommendations
          </Button>
          <Button type="button" variant="outline" onClick={copyReport} disabled={!payload}>
            <Clipboard className="h-4 w-4" />
            Copy Report
          </Button>
          <Button asChild variant="outline">
            <a href={`/api/adaptive-growth/dashboard/export?${query}&format=md`}>
              <Download className="h-4 w-4" />
              Export MD
            </a>
          </Button>
          {copyStatus ? <p className="text-sm text-teal-50">{copyStatus}</p> : null}
        </CardContent>
      </Card>

      {report ? (
        <>
          <ScoreHero report={report} />
          <VelocitySection report={report} />
          <OfferFitnessSection report={report} />
          <FunnelSection report={report} />
          <LearningAndExpansionSection report={report} />
          <LoopAndImprovementSection report={report} />
          <RecommendationsPanel recommendations={recommendations} isGenerating={isGenerating} />
        </>
      ) : (
        <EmptyState label="Dashboard data could not be loaded." />
      )}
    </div>
  );
}

function ScoreHero({ report }: { report: AdaptiveGrowthExecutiveReport }) {
  return (
    <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardContent className="p-6">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Adaptive Growth Score
          </div>
          <div className="mt-3 flex items-end gap-2">
            <span className="font-mono text-6xl font-semibold text-white">
              {report.adaptationScore.score}
            </span>
            <span className="pb-2 text-lg text-muted-foreground">/100</span>
          </div>
          <Badge
            className="mt-4"
            variant={report.adaptationScore.score >= 60 ? "teal" : "gold"}
          >
            {report.adaptationScore.interpretation}
          </Badge>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Period: {report.filters.startDate.slice(0, 10)} to{" "}
            {report.filters.endDate.slice(0, 10)}
          </p>
        </CardContent>
      </Card>
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>Score Components</CardTitle>
          <CardDescription>
            Formula: freshness 15%, variation 15%, experiments 20%, selection
            20%, replication 15%, learning 15%.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {report.adaptationScore.components.map((component) => (
            <div key={component.key} className="rounded-lg border border-white/10 bg-[#07111f]/55 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white">{component.label}</span>
                <span className="font-mono text-sm text-teal-50">{component.score}/100</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-teal-300" style={{ width: `${component.score}%` }} />
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{component.evidence}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

function VelocitySection({ report }: { report: AdaptiveGrowthExecutiveReport }) {
  const metrics = [
    ["New signals", report.velocity.newSignals, Sprout],
    ["Offer variants", report.velocity.newOfferVariants, Layers3],
    ["Experiments launched", report.velocity.experimentsLaunched, FlaskConical],
    ["Experiments completed", report.velocity.experimentsCompleted, Target],
    ["Selections made", report.velocity.selectionDecisionsMade, GitBranch],
    ["Genome items", report.velocity.genomeItemsAdded, BrainCircuit],
  ] as const;

  return (
    <Section title="Adaptation Velocity" description="How fast the business senses, mutates, tests, selects, and captures learning.">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {metrics.map(([label, value, Icon]) => (
          <MetricCard key={label} label={label} value={value} icon={Icon} />
        ))}
      </div>
    </Section>
  );
}

function OfferFitnessSection({ report }: { report: AdaptiveGrowthExecutiveReport }) {
  return (
    <Section title="Offer Fitness" description="Strong variants should scale; weak variants should stop consuming attention.">
      <div className="grid gap-5 lg:grid-cols-2">
        <OfferList title="Top 5 Offers" items={report.offerFitness.topOffers} empty="No offers scored yet." />
        <OfferList title="Bottom 5 Offers" items={report.offerFitness.bottomOffers} empty="No bottom offers yet." />
        <OfferList title="Scale Candidates" items={report.offerFitness.scaleCandidates} empty="No scale candidates yet." />
        <OfferList title="Kill Candidates" items={report.offerFitness.killCandidates} empty="No kill candidates yet." />
      </div>
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>Offers With Missing Data</CardTitle>
          <CardDescription>These scores are incomplete. Add experiment metrics before selecting winners.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {report.offerFitness.offersWithMissingData.length ? report.offerFitness.offersWithMissingData.map((item) => (
            <div key={item.offer.id} className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-3">
              <div className="font-semibold text-white">{item.offer.title}</div>
              <p className="mt-1 text-xs text-amber-100">
                {item.fitness.scoreCompletenessPercent}% evidence available.
              </p>
            </div>
          )) : <p className="text-sm text-muted-foreground">No missing-data offers detected.</p>}
        </CardContent>
      </Card>
    </Section>
  );
}

function FunnelSection({ report }: { report: AdaptiveGrowthExecutiveReport }) {
  const funnel = [
    ["Signals", report.experimentFunnel.signals],
    ["Offers", report.experimentFunnel.offers],
    ["Experiments", report.experimentFunnel.experiments],
    ["Proposals", report.experimentFunnel.proposals],
    ["Deals won", report.experimentFunnel.dealsWon],
    ["Replicated templates", report.experimentFunnel.replicatedTemplates],
  ] as const;

  return (
    <Section title="Experiment Funnel" description="The adaptive path from market observation to reusable business DNA.">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {funnel.map(([label, value]) => (
          <Card key={label} className="border-white/10 bg-white/[0.04] shadow-executive">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="mt-2 font-mono text-3xl font-semibold text-white">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function LearningAndExpansionSection({ report }: { report: AdaptiveGrowthExecutiveReport }) {
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>Learning Genome</CardTitle>
          <CardDescription>Patterns being selected for reuse or remembered as warnings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <GenomeList title="New winning patterns" items={report.learningGenome.newWinningPatterns.map((item) => item.title)} />
          <GenomeList title="New failed patterns" items={report.learningGenome.newFailedPatterns.map((item) => item.title)} />
          <GenomeList title="Most reusable genome items" items={report.learningGenome.mostReusedGenomeItems.map((item) => `${item.title} (${item.reuseProxyScore})`)} />
          <GenomeList title="Prompt improvement suggestions" items={report.learningGenome.promptImprovementSuggestions.map((item) => `${item.title} - ${item.status}`)} />
        </CardContent>
      </Card>
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>Expansion Map</CardTitle>
          <CardDescription>Where the next niches may be, based on visible signals and offer fitness.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RankList title="Strongest sectors" items={report.expansionMap.strongestSectors} />
          <RankList title="Strongest audiences" items={report.expansionMap.strongestAudiences} />
          <RankList title="Best formats" items={report.expansionMap.bestFormats} />
          <GenomeList title="Recommended next niches" items={report.expansionMap.recommendedNextNiches} />
        </CardContent>
      </Card>
    </section>
  );
}

function LoopAndImprovementSection({ report }: { report: AdaptiveGrowthExecutiveReport }) {
  const loops = [
    ["Market sensing", report.openClawLoopStatus.latestMarketSensingLoop],
    ["Experiment review", report.openClawLoopStatus.latestExperimentReview],
    ["Selection review", report.openClawLoopStatus.latestSelectionReview],
    ["Genome update", report.openClawLoopStatus.latestGenomeUpdate],
  ] as const;

  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>Business Loop Status</CardTitle>
          <CardDescription>Scheduled loops generate recommendations only; risky actions require approval.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loops.map(([label, run]) => (
            <div key={label} className="rounded-lg border border-white/10 bg-[#07111f]/55 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-white">{label}</span>
                <Badge variant={run?.status === "Completed" ? "teal" : "outline"}>{run?.status ?? "Not run"}</Badge>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{run?.summary || "No loop history yet."}</p>
            </div>
          ))}
          <Button asChild variant="outline" size="sm">
            <Link href="/loops">Open Loops</Link>
          </Button>
          <Badge variant="gold">{report.openClawLoopStatus.pendingApprovals} pending approvals</Badge>
        </CardContent>
      </Card>
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>Improvement Status</CardTitle>
          <CardDescription>Business learning becomes one-story Codex work only after human approval.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <MetricCard label="Approved tasks" value={report.improvementStatus.approvedImprovementTasks.length} icon={ShieldCheck} />
          <MetricCard label="Implemented" value={report.improvementStatus.implementedImprovements.length} icon={Target} />
        </CardContent>
      </Card>
    </section>
  );
}

function RecommendationsPanel({
  recommendations,
  isGenerating,
}: {
  recommendations: AdaptiveGrowthRecommendationsOutput | null;
  isGenerating: boolean;
}) {
  const sections = recommendations
    ? [
        ["What to test next", recommendations.what_to_test_next],
        ["What to kill", recommendations.what_to_kill],
        ["What to scale", recommendations.what_to_scale],
        ["What to replicate", recommendations.what_to_replicate],
        ["What to learn", recommendations.what_to_learn],
        ["What Codex should improve next", recommendations.what_codex_should_improve_next],
        ["Uncertainty notes", recommendations.uncertainty_notes],
      ]
    : [];

  return (
    <Card className="border-teal-300/20 bg-teal-300/10 shadow-executive">
      <CardHeader>
        <CardTitle>Recommendations</CardTitle>
        <CardDescription>
          Generated by the Brain Layer from available dashboard data. Missing evidence is treated as uncertainty.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isGenerating ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating recommendations...
          </div>
        ) : recommendations ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {sections.map(([title, items]) => (
              <GenomeList key={title as string} title={title as string} items={items as string[]} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click Generate Recommendations to ask the Brain Layer what DG Academy should test, kill, scale, replicate, learn, and improve next.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function OfferList({
  title,
  items,
  empty,
}: {
  title: string;
  items: AdaptiveGrowthExecutiveReport["offerFitness"]["topOffers"];
  empty: string;
}) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length ? items.map((item) => (
          <div key={item.offer.id} className="rounded-lg border border-white/10 bg-[#07111f]/55 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold text-white">{item.offer.title}</div>
              <Badge variant={item.fitness.recommendation === "Kill" ? "destructive" : "teal"}>
                {item.fitness.fitnessScore}/100
              </Badge>
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {item.fitness.recommendation}: {item.offer.promise || item.fitness.rationale}
            </p>
          </div>
        )) : <p className="text-sm text-muted-foreground">{empty}</p>}
      </CardContent>
    </Card>
  );
}

function RankList({
  title,
  items,
}: {
  title: string;
  items: Array<{ name: string; score: number; evidence: string }>;
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-2 space-y-2">
        {items.length ? items.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#07111f]/55 p-3">
            <div>
              <div className="text-sm text-white">{item.name}</div>
              <div className="text-xs text-muted-foreground">{item.evidence}</div>
            </div>
            <Badge variant="teal">{item.score}</Badge>
          </div>
        )) : <p className="text-sm text-muted-foreground">No data yet.</p>}
      </div>
    </div>
  );
}

function GenomeList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-sm font-semibold text-white">{title}</div>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        {items.length ? items.slice(0, 5).map((item) => (
          <li key={item} className="rounded-lg border border-white/10 bg-[#07111f]/55 p-3">{item}</li>
        )) : <li className="rounded-lg border border-dashed border-white/10 p-3">No data yet.</li>}
      </ul>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardContent className="p-4">
        <Icon className="h-4 w-4 text-teal-100" />
        <div className="mt-3 text-xs text-muted-foreground">{label}</div>
        <div className="mt-2 font-mono text-2xl font-semibold text-white">{value}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <Card className="border-dashed border-white/15 bg-white/[0.03] shadow-executive">
      <CardContent className="p-6 text-sm text-muted-foreground">{label}</CardContent>
    </Card>
  );
}
