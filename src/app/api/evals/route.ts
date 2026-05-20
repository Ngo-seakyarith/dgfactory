import { NextResponse } from "next/server";

import { brainTaskTypes, type BrainTaskType } from "@/lib/brain/agents";
import {
  listEvalDatasets,
  listEvalExamples,
  listEvalResults,
  listEvalRuns,
  saveEvalDataset,
  saveEvalExample,
} from "@/lib/brain/evals/storage";
import { requirePermission } from "@/lib/route-guards";

function isBrainTaskType(value: unknown): value is BrainTaskType {
  return typeof value === "string" && brainTaskTypes.includes(value as BrainTaskType);
}

export async function GET(request: Request) {
  const auth = await requirePermission(request, "manage_prompts");
  if (!auth.ok) return auth.response;

  const [datasets, runs, results, examples] = await Promise.all([
    listEvalDatasets(),
    listEvalRuns(),
    listEvalResults(),
    listEvalExamples(),
  ]);
  const latestByDataset = new Map(
    datasets.map((dataset) => [
      dataset.id,
      runs.find((run) => run.datasetId === dataset.id) ?? null,
    ]),
  );
  const previousByDataset = new Map(
    datasets.map((dataset) => [
      dataset.id,
      runs.filter((run) => run.datasetId === dataset.id)[1] ?? null,
    ]),
  );

  return NextResponse.json({
    datasets: datasets.map((dataset) => {
      const latestRun = latestByDataset.get(dataset.id);
      const previousRun = previousByDataset.get(dataset.id);
      return {
        ...dataset,
        exampleCount: examples.filter((example) => example.datasetId === dataset.id).length,
        latestRun,
        previousRun,
        delta:
          latestRun && previousRun
            ? latestRun.averageScore - previousRun.averageScore
            : null,
      };
    }),
    runs,
    results,
  });
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "manage_prompts");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));

  if (!String(body.name ?? "").trim()) {
    return NextResponse.json({ error: "Dataset name is required." }, { status: 400 });
  }

  if (!isBrainTaskType(body.targetAgent)) {
    return NextResponse.json({ error: "Target agent is invalid." }, { status: 400 });
  }

  const saved = await saveEvalDataset({
    name: body.name,
    description: body.description,
    targetAgent: body.targetAgent,
    status: body.status ?? "Draft",
  });

  if (body.exampleInput && typeof body.exampleInput === "object") {
    await saveEvalExample({
      datasetId: saved.dataset.id,
      input: body.exampleInput,
      expectedOutputSummary: body.expectedOutputSummary,
      rubric: body.rubric ?? {
        passScore: 72,
        criteria: ["Practical", "Client-specific", "Safe"],
      },
      tags: body.tags ?? ["custom"],
    });
  }

  return NextResponse.json(saved);
}
