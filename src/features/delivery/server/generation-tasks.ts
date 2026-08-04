import { saveAuditLog } from "@/lib/audit";
import type {
  EvaluationQuestionsBrainInput,
  EvaluationQuestionsBrainOutput,
} from "@/lib/brain/agents";
import { routeBrainTask } from "@/lib/brain/routing/router";
import {
  serializeFacilitatorGuidePlan,
  serializePromptLibraryPlan,
  serializeWorkbookPlan,
  type FacilitatorGuideBrainOutput,
  type PromptLibraryBrainOutput,
  type WorkbookBrainOutput,
} from "@/features/training-packages/export/material-document-plans";
import {
  serializeSlideDeckPlan,
  type SlideDeckBrainOutput,
} from "@/features/training-packages/export/slide-deck-plan";
import { getTrainingPackage } from "@/features/training-packages/storage/training-storage";
import { GenerationInputError } from "@/features/generation-jobs/domain/errors";

import {
  createDefaultEvaluationForm,
  summarizeEvaluationResponses,
  type DeliveryDraft,
  type DeliveryMaterialKey,
  type EvaluationFormType,
} from "@/features/delivery";
import {
  getDeliveryProject,
  saveDeliveryMaterial,
  saveDeliveryProject,
} from "../storage/delivery-storage";
import {
  getEvaluationFormByDelivery,
  listEvaluationResponses,
  saveEvaluationForm,
} from "../storage/evaluation-storage";
import { packageGenerationContext } from "./package-generation-context";

const materialTasks: Record<
  DeliveryMaterialKey,
  {
    taskType: "slide_outline" | "workbook" | "facilitator_guide" | "prompt_library";
    task: string;
  }
> = {
  slides: {
    taskType: "slide_outline" as const,
    task: "Create a complete, trainer-ready and practice-led slide deck for this confirmed training delivery. Organize every major module around concise teaching, a runnable live demonstration, related participant practice, a concrete deliverable, and debrief.",
  },
  workbook: {
    taskType: "workbook" as const,
    task: "Create a complete participant workbook for this confirmed training delivery, with practical activities, reusable workplace templates, response space, reflection, and an action plan.",
  },
  facilitatorGuide: {
    taskType: "facilitator_guide" as const,
    task: "Create a complete facilitator guide for this confirmed training delivery, with a coherent agenda and trainer-ready run instructions.",
  },
  promptLibrary: {
    taskType: "prompt_library" as const,
    task: "Create a copy-ready AI prompt library aligned with this confirmed training delivery and the participants' actual workflows.",
  },
};

export async function generateDeliveryMaterialJob(
  id: string,
  target: DeliveryMaterialKey,
  actor: string,
  generationJobId: string,
) {
  const project = await getDeliveryProject(id);
  if (!project.packageId) {
    throw new GenerationInputError(
      "A linked saved package is required before generating delivery materials.",
    );
  }
  const trainingPackage = await getTrainingPackage(project.packageId);
  const definition = materialTasks[target];
  const commonInput = {
    task: definition.task,
    input: packageGenerationContext(trainingPackage),
    rules: [
      "Treat the original saved package inputs and proposal brief as authoritative.",
      "Ground all content in the supplied course context; do not invent client-specific facts or missing course details.",
      "Do not assume access to a generated syllabus or proposal.",
      "Write in clear professional English suitable for Cambodia corporate training.",
    ],
  };
  let generatedContent = "";
  let model = "";

  if (target === "slides") {
    const result = await routeBrainTask<Record<string, unknown>, SlideDeckBrainOutput>({
      taskType: "slide_outline",
      input: commonInput,
      retries: 1,
    });
    generatedContent = serializeSlideDeckPlan(result.output.deck);
    model = result.model;
  } else if (target === "workbook") {
    const result = await routeBrainTask<Record<string, unknown>, WorkbookBrainOutput>({
      taskType: "workbook",
      input: commonInput,
      retries: 1,
    });
    generatedContent = serializeWorkbookPlan(result.output.workbook);
    model = result.model;
  } else if (target === "facilitatorGuide") {
    const result = await routeBrainTask<Record<string, unknown>, FacilitatorGuideBrainOutput>({
      taskType: "facilitator_guide",
      input: commonInput,
      retries: 1,
    });
    generatedContent = serializeFacilitatorGuidePlan(result.output.guide);
    model = result.model;
  } else {
    const result = await routeBrainTask<Record<string, unknown>, PromptLibraryBrainOutput>({
      taskType: "prompt_library",
      input: commonInput,
      retries: 1,
    });
    generatedContent = serializePromptLibraryPlan(result.output.library);
    model = result.model;
  }

  await saveDeliveryMaterial(
    id,
    target,
    generatedContent,
    generationJobId,
    model,
  );
  await saveAuditLog({
    actor,
    action: "delivery_material_generated",
    entityType: "delivery_project",
    entityId: id,
    metadata: { target, model },
  });
}

export async function generateEvaluationQuestionsJob(
  id: string,
  formType: EvaluationFormType,
  actor: string,
) {
  const project = await getDeliveryProject(id);
  if (!project.packageId) {
    throw new GenerationInputError(
      "A linked saved package is required before generating assessment or evaluation questions.",
    );
  }
  const trainingPackage = await getTrainingPackage(project.packageId);
  const input: EvaluationQuestionsBrainInput = {
    purpose:
      formType === "pre_training"
        ? "pre_training_assessment"
        : "post_training_evaluation",
    ...packageGenerationContext(trainingPackage),
  };
  const result = await routeBrainTask<
    EvaluationQuestionsBrainInput,
    EvaluationQuestionsBrainOutput
  >({
    taskType: "evaluation_questions",
    input,
    retries: 2,
  });
  const existing = await getEvaluationFormByDelivery(id, formType);
  const base =
    existing ?? createDefaultEvaluationForm(id, input.courseTitle, formType);
  const form = await saveEvaluationForm({
    ...base,
    questions: result.output.questions.map((question) => ({
      ...question,
      required: question.required ?? question.type !== "text",
    })),
  });
  await saveAuditLog({
    actor,
    action: "evaluation_questions_generated",
    entityType: "evaluation_form",
    entityId: form.id,
    metadata: {
      deliveryProjectId: id,
      formType,
      questionCount: form.questions.length,
      model: result.model,
    },
  });
}

export async function generateDeliveryReportJob(id: string, actor: string) {
  const project = await getDeliveryProject(id);
  if (!project.packageId) {
    throw new GenerationInputError(
      "A linked saved package is required before generating a post-training report.",
    );
  }
  const trainingPackage = await getTrainingPackage(project.packageId);
  const form = await getEvaluationFormByDelivery(project.id);
  const responses = form ? await listEvaluationResponses(form.id) : [];
  const summary = form ? summarizeEvaluationResponses(form, responses) : null;
  let participantEvaluation: Record<string, unknown> | null = null;
  if (summary && summary.responseCount > 0) {
    participantEvaluation = {
      responseCount: summary.responseCount,
      averageSatisfactionScore: summary.ratingQuestionCount
        ? Math.round(summary.overallAverage * 10) / 10
        : null,
      ratingResults: summary.questions
        .filter((question) => question.type === "rating")
        .map((question) => ({
          question: question.label,
          answered: question.answered,
          average:
            question.type === "rating"
              ? Math.round(question.average * 10) / 10
              : 0,
        })),
      choiceResults: summary.questions
        .filter((question) => question.type === "choice")
        .map((question) => ({
          question: question.label,
          counts: question.type === "choice" ? question.options : [],
        })),
      participantComments: summary.questions
        .filter((question) => question.type === "text")
        .flatMap((question) =>
          question.type === "text"
            ? question.answers.map((answer) => ({
                question: question.label,
                answer,
              }))
            : [],
        ),
    };
  }
  const result = await routeBrainTask<Record<string, unknown>, DeliveryDraft>({
    taskType: "delivery_report",
    input: {
      task: "Generate a client-ready post-training report for a completed DG Academy training delivery.",
      input: {
        packageContext: packageGenerationContext(trainingPackage),
        scheduledDelivery: {
          date: trainingPackage.proposalBrief.scheduleDate,
          time: trainingPackage.proposalBrief.scheduleTime,
          venue: trainingPackage.proposalBrief.scheduleVenue,
          trainer: trainingPackage.proposalBrief.trainerName,
        },
        deliveryEvidence: {
          status: project.deliveryStatus,
          actualParticipantCount: project.participantCount,
          trainingDayNotes: project.notes,
          recordedSatisfactionScore: project.evaluation.averageSatisfactionScore,
          recordedKeyComments: project.evaluation.keyComments,
          clientFeedback: project.evaluation.clientFeedback,
          trainerReflection: project.evaluation.trainerReflection,
          learnerFeedback: project.evaluation.learnerFeedback,
          improvementSuggestions: project.evaluation.improvementSuggestions,
        },
        participantEvaluation,
      },
      rules: [
        "Suitable for corporate training delivery in Cambodia.",
        "Use a professional, concise, client-ready tone where relevant.",
        "Treat packageContext as the original planned course context and deliveryEvidence plus participantEvaluation as evidence of what happened.",
        "Do not claim that planned content was delivered unless the recorded evidence supports it.",
        "Do not invent attendance or evaluation facts beyond provided inputs.",
        "When participantEvaluation is null, state that participant evaluation results are not recorded yet.",
        "Include overview, participant count, objectives, delivery summary, evaluation result, feedback, recommendations, and next opportunities.",
      ],
    },
  });
  await saveDeliveryProject({ ...project, postTrainingReport: result.output.body });
  await saveAuditLog({
    actor,
    action: "delivery_report_generated",
    entityType: "delivery_project",
    entityId: id,
    metadata: { model: result.model },
  });
}
