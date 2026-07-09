"use client";

import { Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MiniMetric } from "./commercial-setup";

export type QaReviewOutput = {
  score: number;
  strengths: string[];
  weaknesses: string[];
  missingSections: string[];
  risks: string[];
  recommendedImprovements: string[];
  clientReadiness: "low" | "medium" | "high";
};
export function qaReviewToMarkdown(review: QaReviewOutput) {
  return [
    `# QA Review`,
    "",
    `Score: ${review.score}/100`,
    `Client readiness: ${review.clientReadiness}`,
    "",
    "## Strengths",
    ...review.strengths.map((item) => `- ${item}`),
    "",
    "## Weaknesses",
    ...review.weaknesses.map((item) => `- ${item}`),
    "",
    "## Missing Sections",
    ...(review.missingSections.length
      ? review.missingSections.map((item) => `- ${item}`)
      : ["- None flagged"]),
    "",
    "## Risks",
    ...review.risks.map((item) => `- ${item}`),
    "",
    "## Recommended Improvements",
    ...review.recommendedImprovements.map((item) => `- ${item}`),
  ].join("\n");
}

export function QaReviewPanel({
  review,
  notice,
  isRunning,
  onRun,
}: {
  review: QaReviewOutput | null;
  notice: string;
  isRunning: boolean;
  onRun: () => void;
}) {
  if (!review) {
    return (
      <div className="p-4">
        <div className="rounded-lg border border-dashed border-white/15 bg-[#07111f]/45 p-8 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-teal-100" />
          <div className="mt-4 text-base font-semibold text-white">
            Run a Brain Layer QA review.
          </div>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            The QA agent checks client readiness, missing sections, risks, and
            recommended improvements before export or customer handoff.
          </p>
          <Button
            type="button"
            variant="gold"
            className="mt-5"
            onClick={onRun}
            disabled={isRunning}
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Run QA Review
          </Button>
          {notice ? (
            <p className="mt-3 text-sm font-medium text-teal-50">{notice}</p>
          ) : null}
        </div>
      </div>
    );
  }

  const readinessVariant =
    review.clientReadiness === "high"
      ? "teal"
      : review.clientReadiness === "medium"
        ? "gold"
        : "outline";

  return (
    <div className="max-h-[34rem] overflow-auto p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <MiniMetric label="QA score" value={`${review.score}/100`} />
        <div className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-3">
          <div className="text-xs text-teal-50/75">Client readiness</div>
          <Badge variant={readinessVariant} className="mt-2 capitalize">
            {review.clientReadiness}
          </Badge>
        </div>
        <MiniMetric
          label="Missing sections"
          value={review.missingSections.length.toString()}
        />
      </div>
      {notice ? (
        <p className="mt-4 rounded-lg border border-teal-300/20 bg-teal-300/10 p-3 text-sm text-teal-50">
          {notice}
        </p>
      ) : null}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <QaList title="Strengths" items={review.strengths} />
        <QaList title="Weaknesses" items={review.weaknesses} />
        <QaList title="Missing sections" items={review.missingSections} empty="None flagged" />
        <QaList title="Risks" items={review.risks} />
        <div className="lg:col-span-2">
          <QaList title="Recommended improvements" items={review.recommendedImprovements} />
        </div>
      </div>
    </div>
  );
}

export function QaList({
  title,
  items,
  empty = "None listed",
}: {
  title: string;
  items: string[];
  empty?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
      <div className="text-sm font-semibold text-white">{title}</div>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
        {(items.length ? items : [empty]).map((item, index) => (
          <li key={`${title}-${index}`}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}
