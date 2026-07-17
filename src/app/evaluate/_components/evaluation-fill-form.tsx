"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ratingScaleMax,
  type EvaluationQuestion,
} from "@/features/delivery/domain/evaluation-form";

type PublicEvaluationForm = {
  title: string;
  intro: string;
  questions: EvaluationQuestion[];
};

function RatingInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (score: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {Array.from({ length: ratingScaleMax }, (_item, index) => index + 1).map(
        (score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            aria-pressed={value === score}
            className={`h-11 w-11 rounded-md border text-sm font-semibold transition-colors ${
              value === score
                ? "border-teal-300/60 bg-teal-400/20 text-white"
                : "border-white/15 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.08]"
            }`}
          >
            {score}
          </button>
        ),
      )}
      <span className="ml-2 text-xs text-muted-foreground">
        1 = poor · {ratingScaleMax} = excellent
      </span>
    </div>
  );
}

export function EvaluationFillForm({
  token,
  form,
}: {
  token: string;
  form: PublicEvaluationForm;
}) {
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [respondentName, setRespondentName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState("");

  function setAnswer(questionId: string, value: string | number) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setNotice("");

    try {
      const response = await fetch(`/api/evaluate/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respondentName, answers }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "The response could not be saved.");
      }

      setSubmitted(true);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The response could not be saved.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card className="mx-auto mt-12 max-w-xl">
        <CardHeader>
          <CheckCircle2 className="h-8 w-8 text-teal-300" />
          <CardTitle className="mt-3">Thank you for your feedback</CardTitle>
          <CardDescription className="mt-2">
            Your evaluation was submitted. You can close this page now.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-5 py-6">
      <Card>
        <CardHeader>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            DG Academy Training Evaluation
          </div>
          <CardTitle className="mt-2">{form.title}</CardTitle>
          {form.intro ? (
            <CardDescription className="mt-2">{form.intro}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-sm font-medium">Your name (optional)</div>
            <Input
              value={respondentName}
              onChange={(event) => setRespondentName(event.target.value)}
              placeholder="You can submit anonymously"
            />
          </div>
        </CardContent>
      </Card>

      {form.questions.map((question, index) => (
        <Card key={question.id}>
          <CardContent className="space-y-3 pt-6">
            <div className="text-sm font-medium">
              {index + 1}. {question.label}
              {question.required ? (
                <span className="ml-1 text-red-300">*</span>
              ) : null}
            </div>
            {question.type === "rating" ? (
              <RatingInput
                value={
                  typeof answers[question.id] === "number"
                    ? (answers[question.id] as number)
                    : null
                }
                onChange={(score) => setAnswer(question.id, score)}
              />
            ) : null}
            {question.type === "choice" ? (
              <div className="space-y-2">
                {question.options.map((option) => (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm hover:bg-white/[0.07]"
                  >
                    <input
                      type="radio"
                      name={question.id}
                      checked={answers[question.id] === option}
                      onChange={() => setAnswer(question.id, option)}
                    />
                    {option}
                  </label>
                ))}
              </div>
            ) : null}
            {question.type === "text" ? (
              <Textarea
                value={String(answers[question.id] ?? "")}
                onChange={(event) => setAnswer(question.id, event.target.value)}
                placeholder="Your answer"
                className="min-h-24"
              />
            ) : null}
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="gold" disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
          Submit Evaluation
        </Button>
        {notice ? <p className="text-sm text-red-200">{notice}</p> : null}
      </div>
    </form>
  );
}
