"use client";

import { useState } from "react";
import { Loader2, MessageSquareText, Save, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  fullPackageToMarkdown,
  outputToText,
  type TrainingPackage,
} from "@/features/training-packages";
import {
  outputEvaluationTypes,
  reviewerTypes,
  type EvaluateOutputResult,
  type OutputEvaluation,
  type OutputEvaluationType,
  type PromptImprovementSuggestion,
  type ReviewerType,
} from "@/lib/evaluations";
import { QaList } from "./qa-review-panel";

function outputTypeText(pkg: TrainingPackage, outputType: OutputEvaluationType) {
  if (outputType === "deck") {
    return pkg.deckOutline;
  }

  if (outputType === "commercial_proposal") {
    return pkg.commercialProposal;
  }

  if (outputType === "follow_up_email") {
    return pkg.followUpEmail;
  }

  if (outputType === "full_package") {
    return fullPackageToMarkdown(pkg);
  }

  if (outputType === "delivery_report") {
    return "";
  }

  if (outputType === "proposal" || outputType === "syllabus") {
    return outputToText(pkg, outputType);
  }

  if (outputType === "workbook") {
    return pkg.workbook;
  }

  return "";
}
function parseMultilineList(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function FeedbackPanel({ pkg }: { pkg: TrainingPackage }) {
  const [outputType, setOutputType] =
    useState<OutputEvaluationType>("proposal");
  const [reviewerType, setReviewerType] = useState<ReviewerType>("Sopheap");
  const [score, setScore] = useState(85);
  const [feedback, setFeedback] = useState("");
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [improvementSuggestions, setImprovementSuggestions] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiEvaluation, setAiEvaluation] = useState<EvaluateOutputResult | null>(null);
  const [savedSuggestions, setSavedSuggestions] = useState<
    PromptImprovementSuggestion[]
  >([]);
  const selectedOutputText = outputTypeText(pkg, outputType);

  async function saveFeedback() {
    setIsSaving(true);
    setNotice("");

    try {
      const response = await fetch("/api/output-evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: pkg.id,
          outputType,
          score,
          reviewerType,
          feedback,
          strengths: parseMultilineList(strengths),
          weaknesses: parseMultilineList(weaknesses),
          improvementSuggestions: parseMultilineList(improvementSuggestions),
        } satisfies Partial<OutputEvaluation>),
      });
      const payload = (await response.json()) as {
        evaluation?: OutputEvaluation;
        error?: string;
      };

      if (!response.ok || !payload.evaluation) {
        throw new Error(payload.error ?? "Feedback could not be saved.");
      }

      setNotice("Feedback saved to the quality loop.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Feedback could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function suggestImprovements() {
    setIsEvaluating(true);
    setNotice("");

    try {
      if (!selectedOutputText.trim()) {
        throw new Error("This output is empty, so it cannot be evaluated yet.");
      }

      const response = await fetch("/api/evaluate-output", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          output: selectedOutputText,
          outputType,
          targetAudience: pkg.audience,
          clientContext: [pkg.client, pkg.context].filter(Boolean).join("\n\n"),
          packageId: pkg.id,
          persist: true,
        }),
      });
      const payload = (await response.json()) as {
        evaluation?: EvaluateOutputResult;
        savedSuggestions?: PromptImprovementSuggestion[];
        mode?: "openai";
        model?: string;
        notice?: string;
        error?: string;
      };

      if (!response.ok || !payload.evaluation) {
        throw new Error(payload.error ?? "AI evaluation failed.");
      }

      setAiEvaluation(payload.evaluation);
      setSavedSuggestions(payload.savedSuggestions ?? []);
      setScore(payload.evaluation.score);
      setStrengths(payload.evaluation.strengths.join("\n"));
      setWeaknesses(payload.evaluation.weaknesses.join("\n"));
      setImprovementSuggestions(payload.evaluation.improvementSuggestions.join("\n"));
      setNotice(
        payload.notice ??
          `AI evaluation completed with ${payload.model ?? "OpenAI"}. Suggestions require human approval.`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "AI evaluation failed.");
    } finally {
      setIsEvaluating(false);
    }
  }

  return (
    <div className="max-h-[42rem] overflow-auto p-4">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <MessageSquareText className="h-4 w-4 text-teal-100" />
              Score and feedback
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Capture human review or run AI evaluation. Prompt suggestions are stored
              for approval, not applied automatically.
            </p>
          </div>
          <Field label="Output type">
            <Select
              value={outputType}
              onChange={(event) =>
                setOutputType(event.target.value as OutputEvaluationType)
              }
            >
              {outputEvaluationTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reviewer">
            <Select
              value={reviewerType}
              onChange={(event) => setReviewerType(event.target.value as ReviewerType)}
            >
              {reviewerTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Score 1-100">
            <Input
              type="number"
              min="1"
              max="100"
              value={score}
              onChange={(event) => setScore(Number(event.target.value))}
            />
          </Field>
          <Field label="Comments">
            <Textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="What did the reviewer notice?"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={saveFeedback}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Feedback
            </Button>
            <Button
              type="button"
              variant="gold"
              onClick={suggestImprovements}
              disabled={isEvaluating || !selectedOutputText.trim()}
            >
              {isEvaluating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Suggest Improvements
            </Button>
          </div>
          {notice ? (
            <p className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-3 text-sm text-teal-50">
              {notice}
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <Field label="Strengths">
            <Textarea
              value={strengths}
              onChange={(event) => setStrengths(event.target.value)}
              placeholder="One per line"
            />
          </Field>
          <Field label="Weaknesses">
            <Textarea
              value={weaknesses}
              onChange={(event) => setWeaknesses(event.target.value)}
              placeholder="One per line"
            />
          </Field>
          <Field label="Improvement suggestions">
            <Textarea
              value={improvementSuggestions}
              onChange={(event) => setImprovementSuggestions(event.target.value)}
              placeholder="One per line"
            />
          </Field>
          {aiEvaluation ? (
            <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-white">
                  AI evaluation result
                </div>
                <Badge variant={aiEvaluation.score >= 80 ? "teal" : "gold"}>
                  {aiEvaluation.score}/100
                </Badge>
              </div>
              <QaList title="Risks" items={aiEvaluation.risks} />
              {savedSuggestions.length ? (
                <div className="mt-3 space-y-2">
                  <div className="text-sm font-semibold text-white">
                    Stored prompt suggestions
                  </div>
                  {savedSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="rounded-lg border border-[#d7a842]/25 bg-[#d7a842]/10 p-3 text-sm leading-6 text-[#f7d889]"
                    >
                      {suggestion.targetAgent}: {suggestion.suggestedChange}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
