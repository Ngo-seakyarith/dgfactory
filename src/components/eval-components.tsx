"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Loader2, Play, Plus, ShieldAlert } from "lucide-react";

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
import { brainTaskTypes, type BrainTaskType } from "@/lib/brain/agents";
import type { EvalDataset, EvalResult, EvalRun } from "@/lib/brain/evals";

type DatasetWithStats = EvalDataset & {
  exampleCount: number;
  latestRun: EvalRun | null;
  previousRun: EvalRun | null;
  delta: number | null;
};

type EvalPayload = {
  datasets?: DatasetWithStats[];
  runs?: EvalRun[];
  results?: EvalResult[];
  error?: string;
};

const exampleInput = {
  courseTitle: "Custom DG Academy Benchmark",
  audience: "Managers",
  duration: "1 day",
  client: "Cambodia corporate market",
  promise: "Create practical business capability from AI adoption.",
  context: "Workflow productivity and governance examples.",
  tone: "Executive and practical",
};

export function EvalConsole() {
  const [datasets, setDatasets] = useState<DatasetWithStats[]>([]);
  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [results, setResults] = useState<EvalResult[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [selectedRunId, setSelectedRunId] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    targetAgent: "proposal" as BrainTaskType,
  });

  async function loadEvals() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/evals", { cache: "no-store" });
      const payload = (await response.json()) as EvalPayload;

      if (!response.ok || !payload.datasets) {
        throw new Error(payload.error ?? "Eval datasets could not load.");
      }

      setDatasets(payload.datasets);
      setRuns(payload.runs ?? []);
      setResults(payload.results ?? []);
      setSelectedDatasetId((current) => current || payload.datasets?.[0]?.id || "");
      setSelectedRunId((current) => current || payload.runs?.[0]?.id || "");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Eval console failed.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadEvals();
  }, []);

  const selectedDataset = useMemo(
    () => datasets.find((dataset) => dataset.id === selectedDatasetId) ?? null,
    [datasets, selectedDatasetId],
  );
  const selectedRun = useMemo(
    () =>
      runs.find((run) => run.id === selectedRunId) ??
      runs.find((run) => run.datasetId === selectedDatasetId) ??
      null,
    [runs, selectedDatasetId, selectedRunId],
  );
  const selectedResults = useMemo(
    () => results.filter((result) => result.evalRunId === selectedRun?.id),
    [results, selectedRun],
  );
  const failedResults = selectedResults.filter((result) => !result.passed);

  async function runEval(datasetId = selectedDatasetId) {
    if (!datasetId) {
      setNotice("Select an eval dataset first.");
      return;
    }

    setIsRunning(true);
    setNotice("");

    try {
      const response = await fetch("/api/evals/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId }),
      });
      const payload = (await response.json()) as {
        run?: EvalRun;
        results?: EvalResult[];
        error?: string;
      };

      if (!response.ok || !payload.run) {
        throw new Error(payload.error ?? "Eval run failed.");
      }

      setSelectedRunId(payload.run.id);
      setNotice(`Eval completed: average score ${payload.run.averageScore}.`);
      await loadEvals();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Eval run failed.");
    } finally {
      setIsRunning(false);
    }
  }

  async function createDataset() {
    if (!draft.name.trim()) {
      setNotice("Dataset name is required.");
      return;
    }

    try {
      const response = await fetch("/api/evals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          status: "Draft",
          exampleInput,
          expectedOutputSummary: "Custom benchmark should produce practical DG Academy output.",
        }),
      });
      const payload = (await response.json()) as { dataset?: EvalDataset; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Dataset creation failed.");
      }

      setDraft({ name: "", description: "", targetAgent: "proposal" });
      setNotice("Eval dataset created with one starter example.");
      await loadEvals();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Dataset creation failed.");
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-teal-300/20 bg-teal-300/10 p-6 shadow-executive">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
            V3.2 Agent Reliability
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">
            Eval Benchmarks
          </h1>
          <p className="mt-3 text-sm leading-7 text-teal-50/80">
            Run structured benchmark datasets against Brain Layer agents, compare scores,
            inspect failed examples, and catch regressions before prompt or release changes.
          </p>
        </div>
      </section>

      {notice ? (
        <p className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-3 text-sm text-teal-50">
          {notice}
        </p>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#f7d889]" />
                Benchmark Datasets
              </CardTitle>
              <CardDescription>
                Seeded with SME workshop, corporate in-house, and executive masterclass examples.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="gold"
              onClick={() => runEval()}
              disabled={isRunning || !selectedDatasetId}
            >
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run selected eval
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#07111f]/55 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading evals...
              </div>
            ) : null}
            {datasets.map((dataset) => (
              <button
                key={dataset.id}
                type="button"
                onClick={() => {
                  setSelectedDatasetId(dataset.id);
                  setSelectedRunId(dataset.latestRun?.id ?? "");
                }}
                className={`w-full rounded-lg border p-4 text-left transition ${
                  selectedDatasetId === dataset.id
                    ? "border-teal-300/45 bg-teal-300/12"
                    : "border-white/10 bg-[#07111f]/55 hover:border-teal-300/30"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-semibold text-white">{dataset.name}</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {dataset.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline">{dataset.targetAgent}</Badge>
                      <Badge variant="outline">{dataset.exampleCount} examples</Badge>
                      <Badge variant={dataset.status === "Active" ? "teal" : "gold"}>
                        {dataset.status}
                      </Badge>
                    </div>
                  </div>
                  <ScoreBlock
                    latest={dataset.latestRun?.averageScore ?? 0}
                    delta={dataset.delta}
                  />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-[#f7d889]" />
              Create Dataset
            </CardTitle>
            <CardDescription>
              Add a starter benchmark dataset with one example; expand it in Supabase later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Dataset name"
            />
            <Textarea
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="What this dataset checks"
              rows={4}
            />
            <Select
              value={draft.targetAgent}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  targetAgent: event.target.value as BrainTaskType,
                }))
              }
            >
              {brainTaskTypes.map((task) => (
                <option key={task} value={task}>
                  {task}
                </option>
              ))}
            </Select>
            <Button type="button" variant="gold" onClick={createDataset}>
              <Plus className="h-4 w-4" />
              Create dataset
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#f7d889]" />
              Eval History
            </CardTitle>
            <CardDescription>
              Latest run is compared with the previous completed run.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {runs
              .filter((run) => (selectedDataset ? run.datasetId === selectedDataset.id : true))
              .slice(0, 8)
              .map((run) => (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => setSelectedRunId(run.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    selectedRun?.id === run.id
                      ? "border-teal-300/45 bg-teal-300/12"
                      : "border-white/10 bg-[#07111f]/55 hover:border-teal-300/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-white">
                      {run.averageScore}/100
                    </div>
                    <Badge variant={run.status === "Completed" ? "teal" : "gold"}>
                      {run.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {run.summary || run.modelName}
                  </p>
                </button>
              ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#f7d889]" />
              Failed Examples and Regression Risks
            </CardTitle>
            <CardDescription>
              Review low-scoring examples before approving prompt/template changes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedRun ? (
              <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="teal">{selectedRun.modelName}</Badge>
                  <Badge variant="outline">Average {selectedRun.averageScore}</Badge>
                  <Badge variant={failedResults.length ? "gold" : "teal"}>
                    {failedResults.length} failed
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {selectedRun.summary}
                </p>
              </div>
            ) : null}

            {(failedResults.length ? failedResults : selectedResults.slice(0, 5)).map((result) => (
              <div
                key={result.id}
                className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={result.passed ? "teal" : "gold"}>
                    {result.passed ? "Passed" : "Failed"}
                  </Badge>
                  <Badge variant="outline">Score {result.score}</Badge>
                </div>
                <p className="mt-3 text-sm font-medium text-white">
                  {result.regressionRisk}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Weaknesses: {result.weaknesses.join("; ") || "None listed"}
                </p>
              </div>
            ))}

            {!selectedResults.length ? (
              <div className="rounded-lg border border-dashed border-white/15 bg-[#07111f]/45 p-4 text-sm text-muted-foreground">
                Run a dataset to view example-level results.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ScoreBlock({ latest, delta }: { latest: number; delta: number | null }) {
  return (
    <div className="min-w-28 rounded-lg border border-white/10 bg-black/15 p-3 text-right">
      <div className="font-mono text-2xl font-semibold text-white">{latest || "-"}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        {delta === null ? "No baseline" : `${delta >= 0 ? "+" : ""}${delta} vs previous`}
      </div>
    </div>
  );
}
