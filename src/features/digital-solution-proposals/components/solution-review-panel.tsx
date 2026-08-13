"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

import type {
  DigitalSolutionProposal,
  SolutionReview,
} from "../domain/types";

const toLines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

type Props = {
  proposal: DigitalSolutionProposal;
  busy: boolean;
  onChange: (proposal: DigitalSolutionProposal) => void;
  onCreateReview: () => void;
};

export function SolutionReviewPanel({
  proposal,
  busy,
  onChange,
  onCreateReview,
}: Props) {
  const review = proposal.solutionReview;
  const evidence = proposal.evidenceAnalysis;
  const setReview = <K extends keyof SolutionReview>(
    key: K,
    value: SolutionReview[K],
  ) => {
    if (!review) return;
    onChange({
      ...proposal,
      solutionReview: { ...review, [key]: value },
    });
  };

  return (
    <section className="space-y-6 border-t border-border pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Solution Review</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Confirm the proposed scope, assumptions, risks, and client questions before generation.
          </p>
        </div>
        <Button variant="gold" onClick={onCreateReview} disabled={busy}>
          <RefreshCw className="h-4 w-4" />
          {review ? "Refresh Review" : "Create Solution Review"}
        </Button>
      </div>

      {evidence ? (
        <div className="grid gap-3 border-y border-border py-4 sm:grid-cols-4">
          {[
            ["Files", evidence.totalFiles],
            ["Sheets", evidence.totalSheets],
            ["Rows", evidence.totalRows],
            ["Analyzed", evidence.analyzedRows],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-xs uppercase text-muted-foreground">{label}</div>
              <div className="mt-1 text-xl font-semibold">{Number(value).toLocaleString()}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-border bg-muted/35 p-4 text-sm text-muted-foreground">
          This review uses the project brief. No spreadsheet evidence was supplied.
        </div>
      )}

      {evidence?.warnings.length ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />Evidence warnings
          </div>
          <ul className="mt-2 list-disc pl-5">
            {evidence.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </div>
      ) : null}

      {review ? (
        <div className="space-y-5">
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Editable findings</h3>
              <Badge variant="outline">{review.evidenceBasis}</Badge>
            </div>
          </div>
          <Field label="Executive assessment">
            <Textarea
              value={review.executiveSummary}
              onChange={(event) => setReview("executiveSummary", event.target.value)}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Confirmed requirements (one per line)">
              <Textarea value={review.confirmedRequirements.join("\n")} onChange={(event) => setReview("confirmedRequirements", toLines(event.target.value))} />
            </Field>
            <Field label="User groups (one per line)">
              <Textarea value={review.userGroups.join("\n")} onChange={(event) => setReview("userGroups", toLines(event.target.value))} />
            </Field>
            <Field label="Key workflows (one per line)">
              <Textarea value={review.keyWorkflows.join("\n")} onChange={(event) => setReview("keyWorkflows", toLines(event.target.value))} />
            </Field>
            <Field label="Technical considerations (one per line)">
              <Textarea value={review.technicalConsiderations.join("\n")} onChange={(event) => setReview("technicalConsiderations", toLines(event.target.value))} />
            </Field>
            <Field label="Assumptions (one per line)">
              <Textarea value={review.assumptions.join("\n")} onChange={(event) => setReview("assumptions", toLines(event.target.value))} />
            </Field>
            <Field label="Risks (one per line)">
              <Textarea value={review.risks.join("\n")} onChange={(event) => setReview("risks", toLines(event.target.value))} />
            </Field>
            <Field label="Questions for the client (one per line)">
              <Textarea value={review.questions.join("\n")} onChange={(event) => setReview("questions", toLines(event.target.value))} />
            </Field>
            <Field label="Additional consultant notes">
              <Textarea value={review.userNotes} onChange={(event) => setReview("userNotes", event.target.value)} />
            </Field>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold">Recommended capabilities</h3>
            <div className="divide-y divide-border rounded-md border border-border">
              {review.recommendedCapabilities.map((item, index) => (
                <div key={`${item.title}-${index}`} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold">{item.title}</div>
                    <Badge variant="outline">{item.basis}</Badge>
                    <Badge variant="teal">{item.confidence}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.capability}</p>
                  <p className="mt-2 text-sm"><span className="font-medium">Why:</span> {item.rationale}</p>
                  <p className="mt-1 text-sm"><span className="font-medium">User value:</span> {item.userValue}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Create the solution review from the completed project brief.
        </div>
      )}
    </section>
  );
}
