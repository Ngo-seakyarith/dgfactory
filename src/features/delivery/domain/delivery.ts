import { deliveryChecklistTemplate } from "./checklist-template";

import {
  normalizeNumber,
  opportunityStatuses,
  type OpportunityStatus,
} from "@/features/crm/domain";

export const deliveryStatuses = opportunityStatuses;

export type DeliveryStatus = OpportunityStatus;

export const deliveryTaskCategories = [
  "Trainer",
  "Certificate",
  "Venue",
  "Training Materials",
  "Attendance List",
  "Banner and Backdrop",
  "Reception",
  "Speech",
  "Certificate Distribution",
  "Training Evaluation",
  "Photo and Video",
  "Follow-up and Customer Relations",
  "Report Writing after Training",
] as const;

export type DeliveryTaskCategory = (typeof deliveryTaskCategories)[number];

export const deliveryTaskStatuses = ["Open", "In Progress", "Done", "Not Applicable"] as const;

export type DeliveryTaskStatus = (typeof deliveryTaskStatuses)[number];

export type DeliveryEvaluation = {
  averageSatisfactionScore: number;
  keyComments: string;
  improvementSuggestions: string;
  trainerReflection: string;
  clientFeedback: string;
  learnerFeedback: string;
};

export const deliveryMaterialKeys = [
  "slides",
  "workbook",
  "facilitatorGuide",
  "promptLibrary",
] as const;

export type DeliveryMaterialKey = (typeof deliveryMaterialKeys)[number];

export type DeliveryMaterials = Record<DeliveryMaterialKey, string>;

export function isDeliveryMaterialKey(
  value: unknown,
): value is DeliveryMaterialKey {
  return (
    typeof value === "string" &&
    deliveryMaterialKeys.includes(value as DeliveryMaterialKey)
  );
}

export function normalizeDeliveryMaterials(
  value: Partial<DeliveryMaterials> | null | undefined,
): DeliveryMaterials {
  return {
    slides: String(value?.slides ?? "").trim(),
    workbook: String(value?.workbook ?? "").trim(),
    facilitatorGuide: String(value?.facilitatorGuide ?? "").trim(),
    promptLibrary: String(value?.promptLibrary ?? "").trim(),
  };
}

export type DeliveryProject = {
  id: string;
  opportunityId: string | null;
  packageId: string | null;
  clientId: string | null;
  title: string;
  deliveryStatus: DeliveryStatus;
  trainingDate: string;
  location: string;
  trainerName: string;
  participantCount: number;
  notes: string;
  evaluation: DeliveryEvaluation;
  materials: DeliveryMaterials;
  postTrainingReport: string;
  createdAt: string;
  updatedAt: string;
};

export type DeliveryTask = {
  id: string;
  deliveryProjectId: string;
  title: string;
  category: DeliveryTaskCategory;
  status: DeliveryTaskStatus;
  dueDate: string;
  startDate: string;
  sortOrder: number;
  owner: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type DeliveryDraft = {
  title: string;
  body: string;
  suggestedNextStep: string;
};

export function isDeliveryStatus(value: unknown): value is DeliveryStatus {
  return (
    typeof value === "string" &&
    deliveryStatuses.includes(value as DeliveryStatus)
  );
}

export function isDeliveryTaskCategory(
  value: unknown,
): value is DeliveryTaskCategory {
  return (
    typeof value === "string" &&
    deliveryTaskCategories.includes(value as DeliveryTaskCategory)
  );
}

export function isDeliveryTaskStatus(
  value: unknown,
): value is DeliveryTaskStatus {
  return (
    typeof value === "string" &&
    deliveryTaskStatuses.includes(value as DeliveryTaskStatus)
  );
}

export function normalizeEvaluation(
  value: Partial<DeliveryEvaluation> | null | undefined,
): DeliveryEvaluation {
  return {
    averageSatisfactionScore: Math.max(
      0,
      Math.min(5, normalizeNumber(value?.averageSatisfactionScore)),
    ),
    keyComments: String(value?.keyComments ?? "").trim(),
    improvementSuggestions: String(value?.improvementSuggestions ?? "").trim(),
    trainerReflection: String(value?.trainerReflection ?? "").trim(),
    clientFeedback: String(value?.clientFeedback ?? "").trim(),
    learnerFeedback: String(value?.learnerFeedback ?? "").trim(),
  };
}

export function createEmptyDeliveryProject(
  overrides: Partial<DeliveryProject> = {},
): DeliveryProject {
  const now = new Date().toISOString();

  return normalizeDeliveryProject({
    id: crypto.randomUUID(),
    opportunityId: null,
    packageId: null,
    clientId: null,
    title: "",
    deliveryStatus: "Syllabus Sent",
    trainingDate: "",
    location: "",
    trainerName: "",
    participantCount: 0,
    notes: "",
    evaluation: normalizeEvaluation(null),
    materials: normalizeDeliveryMaterials(null),
    postTrainingReport: "",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

export function normalizeDeliveryProject(
  value: Partial<DeliveryProject>,
): DeliveryProject {
  const now = new Date().toISOString();
  return {
    id: value.id || crypto.randomUUID(),
    opportunityId: value.opportunityId || null,
    packageId: value.packageId || null,
    clientId: value.clientId || null,
    title: String(value.title ?? "").trim(),
    deliveryStatus: isDeliveryStatus(value.deliveryStatus)
      ? value.deliveryStatus
      : "Syllabus Sent",
    trainingDate: String(value.trainingDate ?? "").trim(),
    location: String(value.location ?? "").trim(),
    trainerName: String(value.trainerName ?? "").trim(),
    participantCount: Math.max(0, normalizeNumber(value.participantCount)),
    notes: String(value.notes ?? "").trim(),
    evaluation: normalizeEvaluation(value.evaluation),
    materials: normalizeDeliveryMaterials(value.materials),
    postTrainingReport: String(value.postTrainingReport ?? "").trim(),
    createdAt: value.createdAt || now,
    updatedAt: value.updatedAt || now,
  };
}

export function normalizeDeliveryTask(value: Partial<DeliveryTask>): DeliveryTask {
  const now = new Date().toISOString();

  return {
    id: value.id || crypto.randomUUID(),
    deliveryProjectId: String(value.deliveryProjectId ?? "").trim(),
    title: String(value.title ?? "").trim(),
    category: isDeliveryTaskCategory(value.category)
      ? value.category
      : "Training Materials",
    status: isDeliveryTaskStatus(value.status) ? value.status : "Open",
    dueDate: String(value.dueDate ?? "").trim(),
    startDate: String(value.startDate ?? "").trim(),
    sortOrder: Math.max(0, normalizeNumber(value.sortOrder)),
    owner: String(value.owner ?? "").trim(),
    notes: String(value.notes ?? "").trim(),
    createdAt: value.createdAt || now,
    updatedAt: value.updatedAt || now,
  };
}

export function createDefaultDeliveryTasks(projectId: string): DeliveryTask[] {
  const now = new Date().toISOString();
  const tasks = deliveryChecklistTemplate.flatMap(({ category, titles }) =>
    titles.map((title) => ({ category, title, notes: "" })),
  );
  return tasks.map((task, sortOrder) =>
    normalizeDeliveryTask({
      id: crypto.randomUUID(),
      deliveryProjectId: projectId,
      status: "Open",
      dueDate: "",
      startDate: "",
      sortOrder,
      owner: "",
      createdAt: now,
      updatedAt: now,
      ...task,
    }),
  );
}

export function buildPostTrainingReport({
  project,
  clientName,
  packageTitle,
  learningObjectives,
}: {
  project: DeliveryProject;
  clientName?: string;
  packageTitle?: string;
  learningObjectives?: string;
}) {
  const evaluation = project.evaluation;
  const score = evaluation.averageSatisfactionScore
    ? `${evaluation.averageSatisfactionScore.toFixed(1)} / 5`
    : "Not recorded yet";

  return `# DG Academy Post-Training Report

## Program Overview
Program: ${packageTitle || project.title}
Client: ${clientName || "Client"}
Training date: ${project.trainingDate || "To be confirmed"}
Location: ${project.location || "To be confirmed"}
Trainer: ${project.trainerName || "DG Academy trainer"}

## Participant Count
${project.participantCount || 0} participants attended.

## Learning Objectives
${learningObjectives || "The program focused on practical capability building, business application, and clear next-step planning for the client team."}

## Delivery Summary
DG Academy delivered the session with an emphasis on practical examples, facilitated discussion, and action-oriented exercises. The delivery status is currently ${project.deliveryStatus}.

## Evaluation Result
Average satisfaction score: ${score}

Key comments:
${evaluation.keyComments || "No participant comments recorded yet."}

Improvement suggestions:
${evaluation.improvementSuggestions || "No improvement suggestions recorded yet."}

Trainer reflection:
${evaluation.trainerReflection || "No trainer reflection recorded yet."}

Client feedback:
${evaluation.clientFeedback || "No client feedback recorded yet."}

Learner feedback:
${evaluation.learnerFeedback || "No learner feedback recorded yet."}

## Recommendations
1. Confirm one or two priority actions from the training and assign owners.
2. Schedule a short implementation follow-up with the client sponsor.
3. Use participant feedback to refine the next session or advanced module.

## Next Training Opportunities
DG Academy can support the client with deeper practice, executive coaching, workflow implementation, or a follow-up masterclass based on the feedback and business priorities captured during delivery.`;
}
