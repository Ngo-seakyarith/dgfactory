"use client";

import { useMemo, useState } from "react";
import { Clipboard, History, Loader2, Play, RefreshCw } from "lucide-react";

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
import { loopTypeLabel, loopTypes, type LoopRun, type LoopType } from "@/lib/loops/types";

type LoopPayload = {
  run?: LoopRun;
  runs?: LoopRun[];
  error?: string;
};

const loopDescriptions: Record<LoopType, string> = {
  weekly_pipeline_review:
    "Review active opportunities, stuck deals, follow-ups, and proposal value.",
  weekly_content_ideas:
    "Generate weekly LinkedIn, training product, Frontier Flash, and campaign ideas.",
  monthly_revenue_summary:
    "Summarize won work, estimated revenue, delivery completion, and pending proposals.",
  quality_improvement_review:
    "Review low-scoring outputs, repeated weaknesses, and prompt improvement suggestions.",
  delivery_readiness_check:
    "Check upcoming delivery projects, missing tasks, material readiness, and risks.",
  stale_opportunity_follow_up:
    "Find stale opportunities and draft follow-up messages for human review.",
  prompt_improvement_review:
    "Review suggested, approved, and implemented prompt improvements.",
  pilot_weekly_review:
    "Summarize pilot usage, blockers, quality issues, and recommended Codex tasks.",
  weekly_market_sensing:
    "Summarize market signals from CRM, knowledge, feedback, and client notes.",
  weekly_offer_mutation:
    "Suggest new offer variants, top tests, and weak or duplicate ideas to avoid.",
  weekly_experiment_review:
    "Review running experiments, missing metrics, follow-up needs, and risks.",
  weekly_selection_review:
    "Review completed experiments and recommend scale, iterate, park, or kill decisions.",
  weekly_replication_review:
    "Identify winning offers ready to become templates, genome items, and expansion paths.",
  monthly_learning_genome_update:
    "Summarize learning patterns, repeated mistakes, prompt updates, and Codex tasks.",
  quarterly_expansion_strategy:
    "Recommend sectors, offers to scale or retire, partners, and next-quarter bets.",
};

const adaptiveLoopTypes: LoopType[] = [
  "weekly_market_sensing",
  "weekly_offer_mutation",
  "weekly_experiment_review",
  "weekly_selection_review",
  "weekly_replication_review",
  "monthly_learning_genome_update",
  "quarterly_expansion_strategy",
];

function isAdaptiveLoop(loopType: LoopType) {
  return adaptiveLoopTypes.includes(loopType);
}

function getOutputList(output: Record<string, unknown>, key: string) {
  const value = output[key];
  return Array.isArray(value) ? value : [];
}

export default function LoopConsole() {
  const [apiKey, setApiKey] = useState("");
  const [loopType, setLoopType] = useState<LoopType>("weekly_pipeline_review");
  const [runs, setRuns] = useState<LoopRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<LoopRun | null>(null);
  const [notice, setNotice] = useState("");
  const [inputJson, setInputJson] = useState("{\n  \"requestedBy\": \"DG Academy\"\n}");
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const recommendationsText = useMemo(
    () => selectedRun?.recommendations.join("\n") ?? "",
    [selectedRun],
  );
  const approvalRequiredActions = selectedRun
    ? getOutputList(selectedRun.output, "approvalRequiredActions")
    : [];
  const createdApprovalRequests = selectedRun
    ? getOutputList(selectedRun.output, "createdApprovalRequests")
    : [];

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      "x-loop-api-key": apiKey.trim(),
    };
  }

  async function loadHistory() {
    if (!apiKey.trim()) {
      setNotice("Enter LOOP_API_KEY to load loop history.");
      return;
    }

    setIsLoading(true);
    setNotice("");

    try {
      const response = await fetch("/api/loops/history", {
        headers: authHeaders(),
      });
      const payload = (await response.json()) as LoopPayload;

      if (!response.ok || !payload.runs) {
        throw new Error(payload.error ?? "Loop history could not load.");
      }

      const loadedRuns = payload.runs;
      setRuns(loadedRuns);
      setSelectedRun((current) => current ?? loadedRuns[0] ?? null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Loop history failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function runLoop() {
    if (!apiKey.trim()) {
      setNotice("Enter LOOP_API_KEY before running a loop.");
      return;
    }

    setIsRunning(true);
    setNotice("");

    try {
      const input = inputJson.trim() ? JSON.parse(inputJson) : {};
      const response = await fetch("/api/loops/run", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ loopType, input }),
      });
      const payload = (await response.json()) as LoopPayload;

      if (!response.ok || !payload.run) {
        throw new Error(payload.error ?? "Loop run failed.");
      }

      setSelectedRun(payload.run);
      setRuns((current) => [
        payload.run as LoopRun,
        ...current.filter((run) => run.id !== payload.run?.id),
      ]);
      setNotice(`${loopTypeLabel(loopType)} completed. No external action was executed.`);
    } catch (error) {
      setNotice(
        error instanceof SyntaxError
          ? "Loop input must be valid JSON."
          : error instanceof Error
            ? error.message
            : "Loop run failed.",
      );
    } finally {
      setIsRunning(false);
    }
  }

  async function copyRecommendations() {
    if (!recommendationsText) {
      return;
    }

    await navigator.clipboard.writeText(recommendationsText);
    setNotice("Recommendations copied.");
  }

  async function copyTaskDrafts() {
    if (!selectedRun) {
      return;
    }

    const text = [
      `# Codex Task Drafts from ${loopTypeLabel(selectedRun.loopType)}`,
      "",
      `Loop run: ${selectedRun.id}`,
      `Summary: ${selectedRun.summary}`,
      "",
      ...selectedRun.recommendations.map((recommendation, index) =>
        [
          `## Task ${index + 1}`,
          recommendation,
          "",
          "Acceptance criteria:",
          "- Human reviews the recommendation before implementation.",
          "- No external sending, deletion, deployment, or client visibility change happens automatically.",
          "- Update README/docs if behavior changes.",
        ].join("\n"),
      ),
    ].join("\n\n");

    await navigator.clipboard.writeText(text);
    setNotice("Codex task drafts copied from loop recommendations.");
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-teal-300/20 bg-teal-300/10 p-6 shadow-executive">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
            V2.4 Scheduled Business Loops
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">
            DG Academy Business Loop Console
          </h1>
          <p className="mt-3 text-sm leading-7 text-teal-50/80">
            Run internal review loops for pipeline, delivery, quality, content,
            and prompt improvement. Loops generate drafts and recommendations only.
          </p>
        </div>
      </section>

      <Card className="border-teal-300/20 bg-teal-300/10 shadow-executive">
        <CardHeader>
          <CardTitle>Adaptive Growth Loops</CardTitle>
          <CardDescription>
            Internal loops for market sensing, mutation, experiment review,
            selection, replication, genome updates, and expansion strategy.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {adaptiveLoopTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setLoopType(type)}
              className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4 text-left transition hover:border-teal-300/40"
            >
              <Badge variant="teal">Adaptive Growth</Badge>
              <div className="mt-3 text-sm font-semibold text-white">
                {loopTypeLabel(type)}
              </div>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                {loopDescriptions[type]}
              </p>
            </button>
          ))}
        </CardContent>
      </Card>

      {notice ? (
        <p className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-3 text-sm text-teal-50">
          {notice}
        </p>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle>Run Loop</CardTitle>
            <CardDescription>
              Use the loop key configured on the server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">
                Loop API key
              </label>
              <Input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="LOOP_API_KEY"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">
                Loop type
              </label>
              <Select
                value={loopType}
                onChange={(event) => setLoopType(event.target.value as LoopType)}
              >
                <optgroup label="Business loops">
                  {loopTypes.filter((type) => !isAdaptiveLoop(type)).map((type) => (
                    <option key={type} value={type}>
                      {loopTypeLabel(type)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Adaptive Growth loops">
                  {adaptiveLoopTypes.map((type) => (
                    <option key={type} value={type}>
                      {loopTypeLabel(type)}
                    </option>
                  ))}
                </optgroup>
              </Select>
              <p className="text-xs leading-5 text-muted-foreground">
                {loopDescriptions[loopType]}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">
                Loop input
              </label>
              <Textarea
                value={inputJson}
                onChange={(event) => setInputJson(event.target.value)}
                rows={5}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="gold" onClick={runLoop} disabled={isRunning}>
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Run loop
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={loadHistory}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Load history
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>
              Latest selected loop run and recommended next actions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedRun ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-[#07111f]/55 p-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="font-semibold text-white">
                      {loopTypeLabel(selectedRun.loopType)}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {selectedRun.summary}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(selectedRun.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={selectedRun.status === "Completed" ? "teal" : "gold"}>
                    {selectedRun.status}
                  </Badge>
                </div>

                {approvalRequiredActions.length || createdApprovalRequests.length ? (
                  <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-4">
                    <div className="font-semibold text-amber-50">
                      Approval needed
                    </div>
                    <p className="mt-1 text-sm leading-6 text-amber-50/80">
                      This loop recommended a risky status or visibility change.
                      No change was executed automatically.
                    </p>
                    <div className="mt-3 grid gap-2 text-sm text-amber-50">
                      {createdApprovalRequests.length ? (
                        <div>{createdApprovalRequests.length} approval request(s) created.</div>
                      ) : null}
                      {approvalRequiredActions.length ? (
                        <div>{approvalRequiredActions.length} approval action(s) require review.</div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  {selectedRun.recommendations.map((recommendation) => (
                    <div
                      key={recommendation}
                      className="rounded-lg border border-white/10 bg-[#07111f]/45 p-3 text-sm leading-6 text-slate-100"
                    >
                      {recommendation}
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={copyRecommendations}
                  disabled={!selectedRun.recommendations.length}
                >
                  <Clipboard className="h-4 w-4" />
                  Copy recommendations
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={copyTaskDrafts}
                  disabled={!selectedRun.recommendations.length}
                  className="ml-2"
                >
                  <Clipboard className="h-4 w-4" />
                  Create tasks from recommendations
                </Button>

                <pre className="max-h-96 overflow-auto rounded-lg border border-white/10 bg-black/20 p-4 text-xs leading-5 text-muted-foreground">
                  {JSON.stringify(selectedRun.output, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-white/15 bg-[#07111f]/45 p-4 text-sm text-muted-foreground">
                Run a loop or load history to view recommendations.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-[#f7d889]" />
            Loop History
          </CardTitle>
          <CardDescription>
            Stored loop runs from configured storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {runs.length ? (
            runs.map((run) => (
              <button
                key={run.id}
                type="button"
                onClick={() => setSelectedRun(run)}
                className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4 text-left transition hover:border-teal-300/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {loopTypeLabel(run.loopType)}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {run.summary}
                    </p>
                  </div>
                  <Badge variant={run.status === "Completed" ? "teal" : "gold"}>
                    {run.status}
                  </Badge>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {new Date(run.createdAt).toLocaleString()}
                </p>
              </button>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-white/15 bg-[#07111f]/45 p-4 text-sm text-muted-foreground">
              No loop history loaded yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
