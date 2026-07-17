import { normalizeNumber } from "@/lib/crm";

export const evaluationQuestionTypes = ["rating", "choice", "text"] as const;

export type EvaluationQuestionType = (typeof evaluationQuestionTypes)[number];

export const evaluationFormStatuses = ["Draft", "Open", "Closed"] as const;

export type EvaluationFormStatus = (typeof evaluationFormStatuses)[number];

export const ratingScaleMax = 5;

const maxTextAnswerLength = 2000;
const maxRespondentNameLength = 120;

export type EvaluationQuestion = {
  id: string;
  type: EvaluationQuestionType;
  label: string;
  options: string[];
  required: boolean;
};

export type EvaluationForm = {
  id: string;
  deliveryProjectId: string;
  title: string;
  intro: string;
  status: EvaluationFormStatus;
  questions: EvaluationQuestion[];
  createdAt: string;
  updatedAt: string;
};

export type EvaluationAnswerValue = string | number;

export type EvaluationResponse = {
  id: string;
  formId: string;
  respondentName: string;
  answers: Record<string, EvaluationAnswerValue>;
  createdAt: string;
};

export type EvaluationQuestionSummary =
  | {
      questionId: string;
      label: string;
      type: "rating";
      answered: number;
      average: number;
      distribution: number[];
    }
  | {
      questionId: string;
      label: string;
      type: "choice";
      answered: number;
      options: Array<{ option: string; count: number }>;
    }
  | {
      questionId: string;
      label: string;
      type: "text";
      answered: number;
      answers: string[];
    };

export type EvaluationSummary = {
  responseCount: number;
  ratingQuestionCount: number;
  overallAverage: number;
  questions: EvaluationQuestionSummary[];
};

export function isEvaluationQuestionType(
  value: unknown,
): value is EvaluationQuestionType {
  return (
    typeof value === "string" &&
    evaluationQuestionTypes.includes(value as EvaluationQuestionType)
  );
}

export function isEvaluationFormStatus(
  value: unknown,
): value is EvaluationFormStatus {
  return (
    typeof value === "string" &&
    evaluationFormStatuses.includes(value as EvaluationFormStatus)
  );
}

export function normalizeEvaluationQuestion(
  value: Partial<EvaluationQuestion>,
): EvaluationQuestion {
  const type = isEvaluationQuestionType(value.type) ? value.type : "text";

  return {
    id: value.id || crypto.randomUUID(),
    type,
    label: String(value.label ?? "").trim(),
    options:
      type === "choice"
        ? (value.options ?? [])
            .map((option) => String(option ?? "").trim())
            .filter(Boolean)
        : [],
    required: Boolean(value.required),
  };
}

export type EvaluationFormInput = Omit<Partial<EvaluationForm>, "questions"> & {
  questions?: Array<Partial<EvaluationQuestion>>;
};

export function normalizeEvaluationForm(
  value: EvaluationFormInput,
): EvaluationForm {
  const now = new Date().toISOString();

  return {
    id: value.id || crypto.randomUUID(),
    deliveryProjectId: String(value.deliveryProjectId ?? "").trim(),
    title: String(value.title ?? "").trim(),
    intro: String(value.intro ?? "").trim(),
    status: isEvaluationFormStatus(value.status) ? value.status : "Draft",
    questions: (value.questions ?? [])
      .map(normalizeEvaluationQuestion)
      .filter((question) => question.label),
    createdAt: value.createdAt || now,
    updatedAt: value.updatedAt || now,
  };
}

export function normalizeEvaluationResponse(
  value: Partial<EvaluationResponse>,
): EvaluationResponse {
  const answers: Record<string, EvaluationAnswerValue> = {};

  for (const [questionId, raw] of Object.entries(value.answers ?? {})) {
    if (typeof raw === "number" && Number.isFinite(raw)) {
      answers[questionId] = raw;
    } else if (typeof raw === "string") {
      answers[questionId] = raw.slice(0, maxTextAnswerLength);
    }
  }

  return {
    id: value.id || crypto.randomUUID(),
    formId: String(value.formId ?? "").trim(),
    respondentName: String(value.respondentName ?? "")
      .trim()
      .slice(0, maxRespondentNameLength),
    answers,
    createdAt: value.createdAt || new Date().toISOString(),
  };
}

export function validateEvaluationAnswers(
  form: EvaluationForm,
  rawAnswers: Record<string, unknown>,
): { answers: Record<string, EvaluationAnswerValue>; errors: string[] } {
  const answers: Record<string, EvaluationAnswerValue> = {};
  const errors: string[] = [];

  for (const question of form.questions) {
    const raw = rawAnswers[question.id];
    const empty =
      raw === undefined || raw === null || String(raw).trim() === "";

    if (empty) {
      if (question.required) {
        errors.push(`"${question.label}" requires an answer.`);
      }
      continue;
    }

    if (question.type === "rating") {
      const score = Math.round(normalizeNumber(raw));
      if (score < 1 || score > ratingScaleMax) {
        errors.push(`"${question.label}" requires a score from 1 to ${ratingScaleMax}.`);
        continue;
      }
      answers[question.id] = score;
    } else if (question.type === "choice") {
      const choice = String(raw).trim();
      if (!question.options.includes(choice)) {
        errors.push(`"${question.label}" requires one of the listed options.`);
        continue;
      }
      answers[question.id] = choice;
    } else {
      answers[question.id] = String(raw).trim().slice(0, maxTextAnswerLength);
    }
  }

  return { answers, errors };
}

export function summarizeEvaluationResponses(
  form: EvaluationForm,
  responses: EvaluationResponse[],
): EvaluationSummary {
  const questions: EvaluationQuestionSummary[] = form.questions.map(
    (question) => {
      if (question.type === "rating") {
        const scores = responses
          .map((response) => response.answers[question.id])
          .filter(
            (value): value is number =>
              typeof value === "number" &&
              value >= 1 &&
              value <= ratingScaleMax,
          )
          .map((value) => Math.round(value));
        const distribution = Array.from({ length: ratingScaleMax }, () => 0);
        for (const score of scores) {
          distribution[score - 1] += 1;
        }
        const average = scores.length
          ? scores.reduce((total, score) => total + score, 0) / scores.length
          : 0;

        return {
          questionId: question.id,
          label: question.label,
          type: "rating" as const,
          answered: scores.length,
          average,
          distribution,
        };
      }

      if (question.type === "choice") {
        const picks = responses
          .map((response) => response.answers[question.id])
          .filter((value): value is string => typeof value === "string");

        return {
          questionId: question.id,
          label: question.label,
          type: "choice" as const,
          answered: picks.length,
          options: question.options.map((option) => ({
            option,
            count: picks.filter((pick) => pick === option).length,
          })),
        };
      }

      const texts = responses
        .map((response) => response.answers[question.id])
        .filter(
          (value): value is string =>
            typeof value === "string" && value.trim() !== "",
        );

      return {
        questionId: question.id,
        label: question.label,
        type: "text" as const,
        answered: texts.length,
        answers: texts,
      };
    },
  );

  const ratingSummaries = questions.filter(
    (question) => question.type === "rating" && question.answered > 0,
  ) as Array<Extract<EvaluationQuestionSummary, { type: "rating" }>>;
  const overallAverage = ratingSummaries.length
    ? ratingSummaries.reduce((total, question) => total + question.average, 0) /
      ratingSummaries.length
    : 0;

  return {
    responseCount: responses.length,
    ratingQuestionCount: ratingSummaries.length,
    overallAverage,
    questions,
  };
}

export function createDefaultEvaluationForm(
  deliveryProjectId: string,
  trainingTitle: string,
): EvaluationForm {
  return normalizeEvaluationForm({
    deliveryProjectId,
    title: trainingTitle
      ? `${trainingTitle} - Training Evaluation`
      : "Training Evaluation",
    intro:
      "Thank you for attending the training. Your feedback takes about three minutes and helps us improve future sessions.",
    status: "Draft",
    questions: [],
  });
}
