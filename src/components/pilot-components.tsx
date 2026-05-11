"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bug,
  Clipboard,
  FileText,
  Flag,
  Loader2,
  MessageSquareText,
  Send,
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
import { Textarea } from "@/components/ui/textarea";
import {
  pilotIssueSeverities,
  pilotIssueStatuses,
  pilotUrgencies,
  type PilotFeedback,
  type PilotGoal,
  type PilotIssue,
  type PilotIssueSeverity,
  type PilotIssueStatus,
  type PilotUrgency,
} from "@/lib/pilot";

type PilotPayload = {
  goals?: PilotGoal[];
  issues?: PilotIssue[];
  feedback?: PilotFeedback[];
  metrics?: {
    pilotStartDate: string;
    pilotEndDate: string;
    pilotGoals: PilotGoal[];
    packagesCreated: number;
    proposalsExported: number;
    opportunitiesCreated: number;
    deliveryProjectsCreated: number;
    qaReviewsCompleted: number;
    averageQaScore: number;
    feedbackRecordsSubmitted: number;
    issuesReported: number;
    improvementSuggestions: number;
    completedLoops: number;
    estimatedPipelineValueFormatted: string;
    topIssues: PilotIssue[];
    topFeedback: PilotFeedback[];
  };
  report?: string;
  error?: string;
};

const initialIssue = {
  title: "",
  description: "",
  severity: "Medium" as PilotIssueSeverity,
  status: "Open" as PilotIssueStatus,
  relatedPage: "/pilot",
  createdBy: "",
};

const initialFeedback = {
  rating: 4,
  whatWorked: "",
  whatWasConfusing: "",
  whatShouldImprove: "",
  urgency: "Medium" as PilotUrgency,
  relatedFeature: "Pilot dashboard",
  relatedPage: "/pilot",
  createdBy: "",
};

export function PilotDashboard() {
  const [payload, setPayload] = useState<PilotPayload>({});
  const [issueDraft, setIssueDraft] = useState(initialIssue);
  const [report, setReport] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  async function loadPilot() {
    setIsLoading(true);
    setNotice("");

    try {
      const response = await fetch("/api/pilot", { cache: "no-store" });
      const nextPayload = (await response.json()) as PilotPayload;

      if (!response.ok) {
        throw new Error(nextPayload.error ?? "Pilot dashboard could not load.");
      }

      setPayload(nextPayload);
      setReport(nextPayload.report ?? "");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Pilot dashboard failed.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPilot();
  }, []);

  const metrics = payload.metrics;
  const goals = metrics?.pilotGoals ?? payload.goals ?? [];
  const issues = payload.issues ?? [];
  const feedback = payload.feedback ?? [];

  async function submitIssue() {
    if (!issueDraft.title.trim()) {
      setNotice("Add a short issue title before submitting.");
      return;
    }

    setIsSubmittingIssue(true);
    setNotice("");

    try {
      const response = await fetch("/api/pilot/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(issueDraft),
      });
      const saved = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(saved.error ?? "Issue could not be saved.");
      }

      setIssueDraft(initialIssue);
      setNotice("Pilot issue saved.");
      await loadPilot();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Issue save failed.");
    } finally {
      setIsSubmittingIssue(false);
    }
  }

  async function generateReport() {
    setIsGeneratingReport(true);
    setNotice("");

    try {
      const response = await fetch("/api/pilot/report", { cache: "no-store" });
      const nextPayload = (await response.json()) as PilotPayload;

      if (!response.ok || !nextPayload.report) {
        throw new Error(nextPayload.error ?? "Pilot report could not be generated.");
      }

      setReport(nextPayload.report);
      setNotice("Pilot report generated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Pilot report failed.");
    } finally {
      setIsGeneratingReport(false);
    }
  }

  async function copyReport() {
    if (!report) {
      return;
    }

    await navigator.clipboard.writeText(report);
    setNotice("Pilot report copied.");
  }

  async function exportPilotReport(format: "docx" | "pdf") {
    setNotice(`Preparing ${format.toUpperCase()} pilot report...`);

    try {
      const response = await fetch("/api/pilot/report/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Pilot report export failed.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.href = url;
      link.download = match?.[1] ?? `DGAcademy_Internal_Pilot_Report.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setNotice(`${format.toUpperCase()} pilot report downloaded.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Pilot report export failed.");
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-teal-300/20 bg-teal-300/10 p-6 shadow-executive">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
              V3.1 Internal Pilot
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">
              30-Day DG Academy Pilot Launch
            </h1>
            <p className="mt-3 text-sm leading-7 text-teal-50/80">
              Track real usage, quality, issues, and feedback before wider team rollout.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4 text-sm leading-6 text-slate-100">
            <div className="font-semibold text-white">Pilot window</div>
            <div className="mt-1 text-muted-foreground">
              {metrics?.pilotStartDate ?? "2026-05-05"} to{" "}
              {metrics?.pilotEndDate ?? "2026-06-04"}
            </div>
          </div>
        </div>
      </section>

      {notice ? (
        <p className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-3 text-sm text-teal-50">
          {notice}
        </p>
      ) : null}

      {isLoading && !metrics ? (
        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading pilot data...
          </CardContent>
        </Card>
      ) : null}

      {metrics ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PilotMetric label="Packages created" value={metrics.packagesCreated} />
          <PilotMetric label="Proposals exported" value={metrics.proposalsExported} />
          <PilotMetric label="Opportunities" value={metrics.opportunitiesCreated} />
          <PilotMetric label="Delivery projects" value={metrics.deliveryProjectsCreated} />
          <PilotMetric label="QA reviews" value={metrics.qaReviewsCompleted} />
          <PilotMetric label="Average QA score" value={metrics.averageQaScore} />
          <PilotMetric label="Feedback records" value={metrics.feedbackRecordsSubmitted} />
          <PilotMetric label="Issues reported" value={metrics.issuesReported} />
          <PilotMetric label="Improvement ideas" value={metrics.improvementSuggestions} />
          <PilotMetric label="Business loops" value={metrics.completedLoops} />
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-[#f7d889]" />
              Pilot Goals
            </CardTitle>
            <CardDescription>
              Default V3.1 success targets updated from current app activity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-semibold text-white">{goal.title}</div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {goal.notes}
                    </p>
                  </div>
                  <Badge variant={goal.status === "Completed" ? "teal" : "gold"}>
                    {goal.status}
                  </Badge>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#d7a842]"
                    style={{
                      width: `${Math.min(100, (goal.currentNumber / Math.max(1, goal.targetNumber)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {goal.currentNumber} / {goal.targetNumber}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-[#f7d889]" />
              Report Pilot Issue
            </CardTitle>
            <CardDescription>
              Capture blockers, confusing screens, and launch-readiness gaps.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={issueDraft.title}
              onChange={(event) =>
                setIssueDraft((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Issue title"
            />
            <Textarea
              value={issueDraft.description}
              onChange={(event) =>
                setIssueDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="What happened and what should change?"
              rows={4}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                value={issueDraft.severity}
                onChange={(event) =>
                  setIssueDraft((current) => ({
                    ...current,
                    severity: event.target.value as PilotIssueSeverity,
                  }))
                }
              >
                {pilotIssueSeverities.map((severity) => (
                  <option key={severity} value={severity}>
                    {severity}
                  </option>
                ))}
              </Select>
              <Select
                value={issueDraft.status}
                onChange={(event) =>
                  setIssueDraft((current) => ({
                    ...current,
                    status: event.target.value as PilotIssueStatus,
                  }))
                }
              >
                {pilotIssueStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </div>
            <Input
              value={issueDraft.relatedPage}
              onChange={(event) =>
                setIssueDraft((current) => ({
                  ...current,
                  relatedPage: event.target.value,
                }))
              }
              placeholder="Related page"
            />
            <Input
              value={issueDraft.createdBy}
              onChange={(event) =>
                setIssueDraft((current) => ({
                  ...current,
                  createdBy: event.target.value,
                }))
              }
              placeholder="Created by"
            />
            <Button
              type="button"
              variant="gold"
              onClick={submitIssue}
              disabled={isSubmittingIssue}
            >
              {isSubmittingIssue ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Save issue
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <PilotList
          title="Top Issues"
          description="High-priority items reported during the pilot."
          empty="No pilot issues yet."
          items={issues.slice(0, 5).map((issue) => ({
            id: issue.id,
            title: issue.title,
            detail: `${issue.severity} - ${issue.status}`,
          }))}
        />
        <PilotList
          title="Recent Feedback"
          description="Feature feedback from dashboard, package, pipeline, and delivery pages."
          empty="No feedback records yet."
          items={feedback.slice(0, 5).map((item) => ({
            id: item.id,
            title: `${item.relatedFeature || "General"} (${item.rating}/5)`,
            detail: item.whatShouldImprove || item.whatWorked || item.whatWasConfusing,
          }))}
        />
      </section>

      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#f7d889]" />
              Pilot Report
            </CardTitle>
            <CardDescription>
              Generate a copy-ready 30-day pilot report with go/no-go recommendation.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="gold"
              onClick={generateReport}
              disabled={isGeneratingReport}
            >
              {isGeneratingReport ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Flag className="h-4 w-4" />
              )}
              Generate Pilot Report
            </Button>
            <Button type="button" variant="outline" onClick={copyReport} disabled={!report}>
              <Clipboard className="h-4 w-4" />
              Copy Report
            </Button>
            <Button type="button" variant="outline" onClick={() => exportPilotReport("docx")}>
              <FileText className="h-4 w-4" />
              Export DOCX
            </Button>
            <Button type="button" variant="outline" onClick={() => exportPilotReport("pdf")}>
              <FileText className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-[#07111f]/55 p-4 font-sans text-sm leading-7 text-slate-100">
            {report || "Generate a pilot report after collecting usage, issues, and feedback."}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

export function PilotFeedbackButton({
  relatedPage,
  relatedFeature,
  relatedPackageId,
  relatedOpportunityId,
}: {
  relatedPage: string;
  relatedFeature: string;
  relatedPackageId?: string;
  relatedOpportunityId?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draft, setDraft] = useState({
    ...initialFeedback,
    relatedPage,
    relatedFeature,
    relatedPackageId: relatedPackageId ?? null,
    relatedOpportunityId: relatedOpportunityId ?? null,
  });

  const canSubmit = useMemo(
    () =>
      draft.whatWorked.trim() ||
      draft.whatWasConfusing.trim() ||
      draft.whatShouldImprove.trim(),
    [draft],
  );

  async function submitFeedback() {
    if (!canSubmit) {
      setNotice("Add at least one feedback note before submitting.");
      return;
    }

    setIsSubmitting(true);
    setNotice("");

    try {
      const response = await fetch("/api/pilot/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Feedback could not be saved.");
      }

      setNotice("Feedback saved for the pilot.");
      setDraft((current) => ({
        ...current,
        whatWorked: "",
        whatWasConfusing: "",
        whatShouldImprove: "",
      }));
      setIsOpen(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Feedback save failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <MessageSquareText className="h-4 w-4 text-[#f7d889]" />
            Pilot feedback
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Tell us what helped, confused, or should improve in this screen.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)}>
          Give Feedback
        </Button>
      </div>

      {isOpen ? (
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              value={String(draft.rating)}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  rating: Number(event.target.value),
                }))
              }
            >
              {[1, 2, 3, 4, 5].map((rating) => (
                <option key={rating} value={rating}>
                  {rating}/5
                </option>
              ))}
            </Select>
            <Select
              value={draft.urgency}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  urgency: event.target.value as PilotUrgency,
                }))
              }
            >
              {pilotUrgencies.map((urgency) => (
                <option key={urgency} value={urgency}>
                  {urgency}
                </option>
              ))}
            </Select>
            <Input
              value={draft.createdBy}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  createdBy: event.target.value,
                }))
              }
              placeholder="Your name"
            />
          </div>
          <Textarea
            value={draft.whatWorked}
            onChange={(event) =>
              setDraft((current) => ({ ...current, whatWorked: event.target.value }))
            }
            placeholder="What worked?"
            rows={3}
          />
          <Textarea
            value={draft.whatWasConfusing}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                whatWasConfusing: event.target.value,
              }))
            }
            placeholder="What was confusing?"
            rows={3}
          />
          <Textarea
            value={draft.whatShouldImprove}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                whatShouldImprove: event.target.value,
              }))
            }
            placeholder="What should improve?"
            rows={3}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="gold"
              onClick={submitFeedback}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit feedback
            </Button>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {notice ? <p className="mt-3 text-xs font-medium text-teal-50">{notice}</p> : null}
    </div>
  );
}

function PilotMetric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardContent className="p-5">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-2 font-mono text-3xl font-semibold text-white">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function PilotList({
  title,
  description,
  empty,
  items,
}: {
  title: string;
  description: string;
  empty: string;
  items: Array<{ id: string; title: string; detail: string }>;
}) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-white/10 bg-[#07111f]/55 p-3"
            >
              <div className="font-semibold text-white">{item.title}</div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {item.detail || "No detail provided."}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-white/15 bg-[#07111f]/45 p-4 text-sm text-muted-foreground">
            {empty}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
