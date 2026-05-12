"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, ShieldCheck, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  PromptImprovementSuggestion,
  PromptSuggestionStatus,
  QualityDashboardMetrics,
} from "@/lib/evaluations";

type QualityDashboardPayload = {
  metrics?: QualityDashboardMetrics;
  error?: string;
};

export default function QualityDashboard() {
  const [metrics, setMetrics] = useState<QualityDashboardMetrics | null>(null);
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [draftingId, setDraftingId] = useState("");

  async function loadMetrics() {
    setIsLoading(true);
    setNotice("");

    try {
      const response = await fetch("/api/quality-dashboard");
      const payload = (await response.json()) as QualityDashboardPayload;

      if (!response.ok || !payload.metrics) {
        throw new Error(payload.error ?? "Quality dashboard could not load.");
      }

      setMetrics(payload.metrics);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Quality dashboard failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function updateSuggestion(
    suggestion: PromptImprovementSuggestion,
    status: PromptSuggestionStatus,
  ) {
    setUpdatingId(suggestion.id);
    setNotice("");

    try {
      const response = await fetch(
        `/api/prompt-improvement-suggestions/${suggestion.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Suggestion update failed.");
      }

      setNotice(`Suggestion marked ${status}. Prompts were not updated automatically.`);
      await loadMetrics();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Suggestion update failed.");
    } finally {
      setUpdatingId("");
    }
  }

  async function createPromptDraft(suggestion: PromptImprovementSuggestion) {
    setDraftingId(suggestion.id);
    setNotice("");

    try {
      const response = await fetch("/api/prompt-templates/draft-from-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId: suggestion.id }),
      });
      const payload = (await response.json()) as {
        template?: { agentName: string; version: number };
        error?: string;
      };

      if (!response.ok || !payload.template) {
        throw new Error(payload.error ?? "Prompt draft could not be created.");
      }

      setNotice(
        `Draft prompt v${payload.template.version} created for ${payload.template.agentName}. Approve it in Admin Prompts before activation.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Prompt draft could not be created.",
      );
    } finally {
      setDraftingId("");
    }
  }

  useEffect(() => {
    void loadMetrics();
  }, []);

  if (isLoading) {
    return (
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading quality loop...
        </CardContent>
      </Card>
    );
  }

  const pending = metrics?.pendingImprovementSuggestions ?? [];
  const approved = metrics?.approvedImprovements ?? [];

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-teal-300/20 bg-teal-300/10 p-6 shadow-executive">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
            V2.0 Quality Loop
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">
            Quality Dashboard
          </h1>
          <p className="mt-3 text-sm leading-7 text-teal-50/80">
            Track output evaluations, recurring weaknesses, and human-approved
            prompt improvement suggestions. Nothing updates prompts automatically.
          </p>
        </div>
      </section>

      {notice ? (
        <p className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-3 text-sm text-teal-50">
          {notice}
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Average QA score"
          value={String(metrics?.averageQaScore ?? 0)}
          detail={`${metrics?.evaluationCount ?? 0} evaluations`}
        />
        <MetricCard
          label="Pending improvements"
          value={String(pending.length)}
          detail="Need human approval"
        />
        <MetricCard
          label="Approved improvements"
          value={String(approved.length)}
          detail="Ready for future prompt work"
        />
        <MetricCard
          label="Weakness patterns"
          value={String(metrics?.mostCommonWeaknesses.length ?? 0)}
          detail="Observed quality themes"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle>Lowest Scoring Output Types</CardTitle>
            <CardDescription>
              Use this to decide where DG Academy prompts or templates need review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics?.lowestScoringOutputTypes.length ? (
              metrics.lowestScoringOutputTypes.map((item) => (
                <div
                  key={item.outputType}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-[#07111f]/55 p-3"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {item.outputType.replaceAll("_", " ")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.count} evaluation{item.count === 1 ? "" : "s"}
                    </div>
                  </div>
                  <Badge variant={item.averageScore >= 80 ? "teal" : "gold"}>
                    {item.averageScore}/100
                  </Badge>
                </div>
              ))
            ) : (
              <EmptyQualityState label="No evaluations yet." />
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle>Most Common Weaknesses</CardTitle>
            <CardDescription>
              Recurring issues from AI QA, trainer, client, learner, and internal review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics?.mostCommonWeaknesses.length ? (
              metrics.mostCommonWeaknesses.map((item) => (
                <div
                  key={item.weakness}
                  className="rounded-lg border border-white/10 bg-[#07111f]/55 p-3"
                >
                  <div className="text-sm text-slate-100">{item.weakness}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Seen {item.count} time{item.count === 1 ? "" : "s"}
                  </div>
                </div>
              ))
            ) : (
              <EmptyQualityState label="No weakness patterns yet." />
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>Pending Improvement Suggestions</CardTitle>
          <CardDescription>
            Approve or reject suggestions. Approval records intent only; it does not
            change prompts or templates automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length ? (
            pending.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                updatingId={updatingId}
                draftingId={draftingId}
                onUpdate={updateSuggestion}
                onCreateDraft={createPromptDraft}
              />
            ))
          ) : (
            <EmptyQualityState label="No pending suggestions." />
          )}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>Approved Improvements</CardTitle>
          <CardDescription>
            These are approved for a future Codex prompt/template update.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {approved.length ? (
            approved.map((suggestion) => (
              <div
                key={suggestion.id}
                className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-4"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-teal-50">
                  <ShieldCheck className="h-4 w-4" />
                  {suggestion.targetAgent}
                </div>
                <p className="mt-2 text-sm leading-6 text-teal-50/85">
                  {suggestion.suggestedChange}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => createPromptDraft(suggestion)}
                  disabled={draftingId === suggestion.id}
                >
                  {draftingId === suggestion.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  Create Prompt Draft
                </Button>
              </div>
            ))
          ) : (
            <EmptyQualityState label="No approved improvements yet." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardHeader>
    </Card>
  );
}

function SuggestionCard({
  suggestion,
  updatingId,
  draftingId,
  onUpdate,
  onCreateDraft,
}: {
  suggestion: PromptImprovementSuggestion;
  updatingId: string;
  draftingId: string;
  onUpdate: (
    suggestion: PromptImprovementSuggestion,
    status: PromptSuggestionStatus,
  ) => Promise<void>;
  onCreateDraft: (suggestion: PromptImprovementSuggestion) => Promise<void>;
}) {
  const isUpdating = updatingId === suggestion.id;
  const isDrafting = draftingId === suggestion.id;

  return (
    <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-white">
            {suggestion.targetAgent}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {suggestion.currentPromptSummary || "No current prompt summary captured."}
          </p>
        </div>
        <Badge variant="gold">{suggestion.status}</Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-100">
        {suggestion.suggestedChange}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Reason: {suggestion.reason || "No reason captured."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="gold"
          size="sm"
          onClick={() => onUpdate(suggestion, "Approved")}
          disabled={isUpdating}
        >
          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Approve
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onUpdate(suggestion, "Rejected")}
          disabled={isUpdating}
        >
          <X className="h-4 w-4" />
          Reject
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onCreateDraft(suggestion)}
          disabled={isDrafting || suggestion.status !== "Approved"}
          title={
            suggestion.status === "Approved"
              ? "Create a draft prompt template from this approved suggestion."
              : "Approve the suggestion before creating a prompt draft."
          }
        >
          {isDrafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Create Prompt Draft
        </Button>
      </div>
    </div>
  );
}

function EmptyQualityState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/15 bg-[#07111f]/45 p-4 text-sm text-muted-foreground">
      {label}
    </div>
  );
}
