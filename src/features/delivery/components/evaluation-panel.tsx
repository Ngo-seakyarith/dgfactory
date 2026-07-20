"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Copy,
  Link2,
  Loader2,
  Lock,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";
import { QueryErrorState } from "@/components/query-error-state";
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
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createDefaultEvaluationForm,
  evaluationQuestionTypes,
  normalizeEvaluationQuestion,
  ratingScaleMax,
  type DeliveryProject,
  type EvaluationForm,
  type EvaluationFormType,
  type EvaluationQuestion,
  type EvaluationSummary,
} from "@/features/delivery";
import {
  useCloseEvaluationFormMutation,
  useDeliveryEvaluationQuery,
  useGenerateEvaluationQuestionsMutation,
  useOpenEvaluationFormMutation,
  useSaveDeliveryProjectMutation,
  useSaveEvaluationFormMutation,
} from "@/features/delivery/queries";
import { errorMessage } from "@/lib/api-client";

const questionTypeLabels: Record<EvaluationQuestion["type"], string> = {
  rating: "Rating (1-5)",
  choice: "Single choice",
  text: "Open text",
};

function QuestionEditor({
  question,
  onChange,
  onRemove,
}: {
  question: EvaluationQuestion;
  onChange: (question: EvaluationQuestion) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3 rounded-md border border-white/10 p-3">
      <div className="grid gap-3 lg:grid-cols-[1fr_170px_110px_40px]">
        <Input
          value={question.label}
          onChange={(event) => onChange({ ...question, label: event.target.value })}
          placeholder="Question text"
        />
        <Select
          value={question.type}
          onChange={(event) =>
            onChange({
              ...question,
              type: event.target.value as EvaluationQuestion["type"],
            })
          }
        >
          {evaluationQuestionTypes.map((type) => (
            <option key={type} value={type}>
              {questionTypeLabels[type]}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(event) =>
              onChange({ ...question, required: event.target.checked })
            }
          />
          Required
        </label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Remove question"
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>
      {question.type === "choice" ? (
        <Textarea
          value={question.options.join("\n")}
          onChange={(event) =>
            onChange({ ...question, options: event.target.value.split("\n") })
          }
          placeholder={"One option per line\nOption A\nOption B"}
          className="min-h-20"
        />
      ) : null}
    </div>
  );
}

function DistributionBar({
  label,
  count,
  max,
}: {
  label: string;
  count: number;
  max: number;
}) {
  const width = max > 0 ? Math.round((count / max) * 100) : 0;

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-24 shrink-0 truncate text-muted-foreground" title={label}>
        {label}
      </div>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-teal-400/70"
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="w-8 shrink-0 text-right font-medium">{count}</div>
    </div>
  );
}

function ResultsSection({ summary }: { summary: EvaluationSummary }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs uppercase text-muted-foreground">Responses</div>
          <div className="mt-1 text-2xl font-semibold">{summary.responseCount}</div>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Average satisfaction
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {summary.ratingQuestionCount
              ? `${summary.overallAverage.toFixed(1)} / ${ratingScaleMax}`
              : "-"}
          </div>
        </div>
      </div>

      {summary.questions.map((question) => (
        <div
          key={question.questionId}
          className="space-y-3 rounded-md border border-white/10 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">{question.label}</div>
            <div className="text-xs text-muted-foreground">
              {question.answered} answered
              {question.type === "rating" && question.answered
                ? ` · avg ${question.average.toFixed(1)}`
                : ""}
            </div>
          </div>
          {question.type === "rating" ? (
            <div className="space-y-2">
              {question.distribution.map((count, index) => (
                <DistributionBar
                  key={index}
                  label={`${index + 1} star${index === 0 ? "" : "s"}`}
                  count={count}
                  max={Math.max(...question.distribution, 1)}
                />
              ))}
            </div>
          ) : null}
          {question.type === "choice" ? (
            <div className="space-y-2">
              {question.options.map((option) => (
                <DistributionBar
                  key={option.option}
                  label={option.option}
                  count={option.count}
                  max={Math.max(
                    ...question.options.map((item) => item.count),
                    1,
                  )}
                />
              ))}
            </div>
          ) : null}
          {question.type === "text" ? (
            question.answers.length ? (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {question.answers.map((answer, index) => (
                  <li
                    key={index}
                    className="rounded-md border border-white/10 bg-white/[0.03] p-3"
                  >
                    {answer}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No written answers yet.</p>
            )
          ) : null}
        </div>
      ))}
    </div>
  );
}

const panelCopy = {
  pre_training: {
    title: "Pre-Training Assessment",
    description:
      "AI drafts baseline questions from the proposal. Share the private link with participants before the training so the trainer can tailor the session.",
    emptyState:
      "No assessment yet. Generate baseline questions from the training proposal, then share the private link before the session.",
    loading: "Loading pre-training assessment",
    loadError: "Could not load the pre-training assessment",
  },
  post_training: {
    title: "Participant Evaluation",
    description:
      "AI drafts the questions from the proposal. Share the private link with participants after the training and review the results here.",
    emptyState:
      "No evaluation form yet. Generate participant questions from the training proposal, then share the private link.",
    loading: "Loading participant evaluation",
    loadError: "Could not load the participant evaluation",
  },
} as const;

export function EvaluationFormPanel({
  project,
  formType = "post_training",
}: {
  project: DeliveryProject;
  formType?: EvaluationFormType;
}) {
  const copy = panelCopy[formType];
  const evaluationQuery = useDeliveryEvaluationQuery(project.id, formType);
  const saveForm = useSaveEvaluationFormMutation(project.id, formType);
  const generateQuestions = useGenerateEvaluationQuestionsMutation(
    project.id,
    formType,
  );
  const openForm = useOpenEvaluationFormMutation(project.id, formType);
  const closeForm = useCloseEvaluationFormMutation(project.id, formType);
  const saveProject = useSaveDeliveryProjectMutation();

  const form = evaluationQuery.data?.form ?? null;
  const summary = evaluationQuery.data?.summary ?? null;
  const [draft, setDraft] = useState<EvaluationForm | null>(form);
  const [link, setLink] = useState("");
  const [notice, setNotice] = useState("");
  const lastSavedRef = useRef("");
  const isOpen = form?.status === "Open";

  useEffect(() => {
    setDraft(form);
    lastSavedRef.current = form ? JSON.stringify(form) : "";
  }, [form]);

  useEffect(() => {
    if (!draft || isOpen) return;
    const serialized = JSON.stringify(draft);
    if (serialized === lastSavedRef.current) return;

    const timer = setTimeout(() => {
      lastSavedRef.current = serialized;
      saveForm.mutate(draft);
    }, 1000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, isOpen]);

  const busy =
    saveForm.isPending ||
    generateQuestions.isPending ||
    openForm.isPending ||
    closeForm.isPending;

  const summaryHasResponses = useMemo(
    () => Boolean(summary && summary.responseCount > 0),
    [summary],
  );

  async function run<T>(action: Promise<T>, done?: (payload: T) => void) {
    setNotice("");
    try {
      const payload = await action;
      done?.(payload);
    } catch (error) {
      setNotice(errorMessage(error));
    }
  }

  if (evaluationQuery.isPending) {
    return <PageLoadingSkeleton label={copy.loading} />;
  }

  if (evaluationQuery.isError) {
    return (
      <QueryErrorState
        title={copy.loadError}
        detail={errorMessage(evaluationQuery.error)}
        onRetry={() => void evaluationQuery.refetch()}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription className="mt-2">
              {copy.description}
            </CardDescription>
          </div>
          {form ? (
            <Badge
              variant={
                form.status === "Open"
                  ? "teal"
                  : form.status === "Closed"
                    ? "outline"
                    : "gold"
              }
            >
              {form.status === "Draft" ? "Draft - not shared" : form.status}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {!form ? (
          <div className="rounded-md border border-dashed border-white/15 p-8 text-center">
            <BarChart3 className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {copy.emptyState}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="gold"
                disabled={busy}
                onClick={() =>
                  void run(generateQuestions.mutateAsync({}), (payload) => {
                    if (payload.notice) setNotice(payload.notice);
                  })
                }
              >
                {generateQuestions.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Sparkles />
                )}
                Generate Questions with AI
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run(
                    saveForm
                      .mutateAsync(
                        createDefaultEvaluationForm(
                          project.id,
                          project.title,
                          formType,
                        ),
                      )
                      .then(() => evaluationQuery.refetch()),
                  )
                }
              >
                <Plus /> Start Blank Form
              </Button>
            </div>
          </div>
        ) : null}

        {form && draft && !isOpen ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Form title</Label>
                <Input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft({ ...draft, title: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Introduction shown to participants</Label>
                <Textarea
                  value={draft.intro}
                  onChange={(event) =>
                    setDraft({ ...draft, intro: event.target.value })
                  }
                  className="min-h-20"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Questions</Label>
              {draft.questions.map((question, index) => (
                <QuestionEditor
                  key={question.id}
                  question={question}
                  onChange={(updated) =>
                    setDraft({
                      ...draft,
                      questions: draft.questions.map((item, itemIndex) =>
                        itemIndex === index ? updated : item,
                      ),
                    })
                  }
                  onRemove={() =>
                    setDraft({
                      ...draft,
                      questions: draft.questions.filter(
                        (_item, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                />
              ))}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      questions: [
                        ...draft.questions,
                        normalizeEvaluationQuestion({
                          label: "New question",
                          type: "rating",
                          required: false,
                        }),
                      ],
                    })
                  }
                >
                  <Plus /> Add Question
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void run(generateQuestions.mutateAsync({}), (payload) => {
                      if (payload.notice) setNotice(payload.notice);
                    })
                  }
                >
                  {generateQuestions.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Sparkles />
                  )}
                  {draft.questions.length ? "Regenerate with AI" : "Generate with AI"}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="gold"
                disabled={busy || draft.questions.length === 0}
                onClick={() =>
                  void run(
                    saveForm
                      .mutateAsync(draft)
                      .then(() => openForm.mutateAsync({})),
                    (payload) => setLink(payload.link),
                  )
                }
              >
                <Link2 /> Open Form & Get Link
              </Button>
              <span className="text-xs text-muted-foreground">
                {saveForm.isPending ? "Saving changes..." : "Changes save automatically."}
              </span>
            </div>
          </div>
        ) : null}

        {form && isOpen ? (
          <div className="space-y-4">
            <div className="rounded-md border border-teal-300/25 bg-teal-400/10 p-4">
              <div className="text-sm font-medium">
                The form is open for responses.
              </div>
              {link ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Input readOnly value={link} className="max-w-xl flex-1" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(link);
                      setNotice("Participant link copied.");
                    }}
                  >
                    <Copy /> Copy Link
                  </Button>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  The private link is shown only when it is generated. Generate a
                  new link if you no longer have it; the old link stops working.
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void run(openForm.mutateAsync({}), (payload) =>
                      setLink(payload.link),
                    )
                  }
                >
                  <Link2 /> Generate New Link
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void run(closeForm.mutateAsync({}), () => setLink(""))
                  }
                >
                  <Lock /> Close Form
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Close the form to edit the questions. Responses stay saved.
            </p>
          </div>
        ) : null}

        {form && summary && summaryHasResponses ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Results</h3>
              {formType === "post_training" && summary.ratingQuestionCount > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={saveProject.isPending}
                  onClick={() =>
                    void run(
                      saveProject.mutateAsync({
                        ...project,
                        evaluation: {
                          ...project.evaluation,
                          averageSatisfactionScore:
                            Math.round(summary.overallAverage * 10) / 10,
                        },
                      }),
                      () =>
                        setNotice(
                          "Average score applied to the delivery evaluation.",
                        ),
                    )
                  }
                >
                  <CheckCircle2 /> Use Average Score in Evaluation
                </Button>
              ) : null}
            </div>
            <ResultsSection summary={summary} />
          </div>
        ) : null}

        {form && !summaryHasResponses ? (
          <p className="text-sm text-muted-foreground">
            No responses yet. Results and charts appear here as participants
            submit the form.
          </p>
        ) : null}

        {notice ? (
          <p className="text-sm text-muted-foreground">{notice}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
