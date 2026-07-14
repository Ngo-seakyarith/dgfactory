import type { BrainTaskType } from "@/lib/brain/agents";
import { getBrainModel } from "@/lib/brain/core/structuredOutput";
import { getAgentForTask, routeBrainTask } from "@/lib/brain/routing/router";
import { createDeterministicEvaluation, type OutputEvaluationType } from "@/lib/evaluations";
import {
  getEvalDataset,
  listEvalExamples,
  listEvalResults,
  listEvalRuns,
  saveAgentTrace,
  saveEvalResults,
  saveEvalRun,
} from "@/lib/brain/evals/storage";
import {
  normalizeEvalResult,
  normalizeEvalRun,
  type EvalDataset,
  type EvalResult,
  type EvalRun,
} from "@/lib/brain/evals/types";

type RunEvalOptions = {
  datasetId: string;
  workflowId?: string;
};

type RunEvalReturn = {
  dataset: EvalDataset;
  run: EvalRun;
  results: EvalResult[];
  previousRun: EvalRun | null;
  delta: number | null;
};

function outputTypeForTask(taskType: BrainTaskType): OutputEvaluationType {
  const map: Record<BrainTaskType, OutputEvaluationType> = {
    course_package: "full_package",
    proposal: "proposal",
    pricing_narrative: "commercial_proposal",
    slide_outline: "deck",
    workbook: "workbook",
    follow_up: "follow_up_email",
    delivery_report: "delivery_report",
    qa_review: "full_package",
    improvement_suggestion: "full_package",
    offer_mutation: "full_package",
    offer_replication: "full_package",
    improvement_opportunity: "full_package",
    adaptive_growth_recommendations: "full_package",
    master_workflow: "full_package",
    market_sensing: "full_package",
    experiment_design: "full_package",
    fitness_evaluation: "full_package",
    selection_recommendation: "full_package",
    expansion_strategy: "full_package",
    learning_genome: "full_package",
    extinction_recommendation: "full_package",
  };

  return map[taskType];
}

function safeStringify(value: unknown, maxLength = 900) {
  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2) ?? "";
  return text.slice(0, maxLength);
}

function outputToEvaluationText(output: unknown) {
  if (typeof output === "string") {
    return output;
  }

  if (output && typeof output === "object") {
    if ("content" in output) {
      return String((output as { content?: unknown }).content ?? "");
    }

    if ("body" in output) {
      return String((output as { body?: unknown }).body ?? "");
    }

    if ("followUpEmail" in output) {
      const draft = output as {
        followUpEmail?: unknown;
        shortMessage?: unknown;
        suggestedNextStep?: unknown;
      };
      return [draft.followUpEmail, draft.shortMessage, draft.suggestedNextStep]
        .map((item) => String(item ?? ""))
        .join("\n\n");
    }
  }

  return safeStringify(output, 2500);
}

function passScoreFromRubric(rubric: Record<string, unknown>) {
  const passScore = Number(rubric.passScore);
  return Number.isFinite(passScore) ? passScore : 72;
}

function regressionRisk(score: number, previousAverage: number | null) {
  if (previousAverage !== null && score < previousAverage - 8) {
    return "High: example score is materially below the previous run average.";
  }

  if (score < 65) {
    return "Medium: output may be too weak for release confidence.";
  }

  return "Low: no major regression signal detected.";
}

function summarizeRun(results: EvalResult[], previousRun: EvalRun | null) {
  const failed = results.filter((result) => !result.passed);
  const average = results.length
    ? Math.round(results.reduce((total, result) => total + result.score, 0) / results.length)
    : 0;
  const delta =
    previousRun && previousRun.averageScore
      ? average - previousRun.averageScore
      : null;
  const deltaText = delta === null ? "no previous run" : `${delta >= 0 ? "+" : ""}${delta}`;

  return {
    average,
    summary: `${results.length} examples scored. Average ${average}. Failed ${failed.length}. Delta ${deltaText}.`,
    delta,
  };
}

export async function runEvalDataset({
  datasetId,
  workflowId,
}: RunEvalOptions): Promise<RunEvalReturn> {
  const dataset = await getEvalDataset(datasetId);

  if (!dataset) {
    throw new Error("Eval dataset not found.");
  }

  const examples = await listEvalExamples(datasetId);

  if (!examples.length) {
    throw new Error("Eval dataset has no examples.");
  }

  const previousRuns = (await listEvalRuns(datasetId)).filter(
    (run) => run.status === "Completed",
  );
  const previousRun = previousRuns[0] ?? null;
  const running = normalizeEvalRun({
    datasetId,
    targetAgent: dataset.targetAgent,
    modelName: getBrainModel(),
    status: "Running",
    summary: "Eval run started.",
  });
  await saveEvalRun(running);

  const agent = getAgentForTask(dataset.targetAgent);
  const results: EvalResult[] = [];
  let modelName = running.modelName;

  for (const example of examples) {
    const started = Date.now();

    try {
      const routed = await routeBrainTask({
        taskType: dataset.targetAgent,
        input: example.input,
      });
      modelName = routed.model;
      const text = outputToEvaluationText(routed.output);
      const evaluation = createDeterministicEvaluation({
        output: text,
        outputType: outputTypeForTask(dataset.targetAgent),
        targetAudience: String(example.input.audience ?? "DG Academy audience"),
        clientContext: String(example.input.client ?? example.input.context ?? ""),
        rubric: {
          key: dataset.targetAgent,
          title: dataset.name,
          criteria: Array.isArray(example.rubric.criteria)
            ? example.rubric.criteria.map((item) => String(item))
            : [],
          warningSigns: ["Unsupported guarantees", "Internal margin exposure"],
        },
      });
      const score = evaluation.score;
      const passScore = passScoreFromRubric(example.rubric);
      const result = normalizeEvalResult({
        evalRunId: running.id,
        evalExampleId: example.id,
        score,
        passed: score >= passScore,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        regressionRisk: regressionRisk(score, previousRun?.averageScore ?? null),
        output: {
          mode: routed.mode,
          model: routed.model,
          summary: safeStringify(routed.output, 1000),
          notice: routed.notice,
        },
      });

      results.push(result);
      await saveAgentTrace({
        workflowId: workflowId ?? running.id,
        agentName: agent.name,
        taskType: dataset.targetAgent,
        inputSummary: safeStringify(example.input, 600),
        outputSummary: safeStringify(routed.output, 600),
        status: "Completed",
        durationMs: Date.now() - started,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Eval example failed.";
      results.push(
        normalizeEvalResult({
          evalRunId: running.id,
          evalExampleId: example.id,
          score: 0,
          passed: false,
          weaknesses: [message],
          regressionRisk: "High: agent execution failed.",
          output: { error: message },
        }),
      );
      await saveAgentTrace({
        workflowId: workflowId ?? running.id,
        agentName: agent.name,
        taskType: dataset.targetAgent,
        inputSummary: safeStringify(example.input, 600),
        outputSummary: message,
        status: "Failed",
        durationMs: Date.now() - started,
      });
    }
  }

  await saveEvalResults(results);
  const summary = summarizeRun(results, previousRun);
  const completed = normalizeEvalRun({
    ...running,
    modelName,
    status: "Completed",
    averageScore: summary.average,
    completedAt: new Date().toISOString(),
    summary: summary.summary,
  });
  const saved = await saveEvalRun(completed);

  return {
    dataset,
    run: saved.run,
    results: await listEvalResults(running.id),
    previousRun,
    delta: summary.delta,
  };
}
