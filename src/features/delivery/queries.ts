"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { requestJson } from "@/lib/api-client";

import type {
  DeliveryMaterialKey,
  DeliveryProject,
  DeliveryTask,
} from "./domain/delivery";
import type {
  EvaluationForm,
  EvaluationFormType,
  EvaluationResponse,
  EvaluationSummary,
} from "./domain/evaluation-form";

export const deliveryKeys = {
  all: ["delivery"] as const,
  projects: () => [...deliveryKeys.all, "projects"] as const,
  project: (id: string) => [...deliveryKeys.projects(), id] as const,
  tasks: (projectId: string) =>
    [...deliveryKeys.all, "tasks", projectId] as const,
  evaluation: (projectId: string, formType: EvaluationFormType) =>
    [...deliveryKeys.all, "evaluation", projectId, formType] as const,
};

export type DeliveryEvaluationPayload = {
  form: EvaluationForm | null;
  responses: EvaluationResponse[];
  summary: EvaluationSummary | null;
};

export function useDeliveryProjectsQuery() {
  return useQuery({
    queryKey: deliveryKeys.projects(),
    queryFn: async () => {
      const payload = await requestJson<{ projects: DeliveryProject[] }>(
        "/api/delivery-projects",
      );
      return payload.projects ?? [];
    },
  });
}

export function useDeliveryProjectQuery(id: string) {
  return useQuery({
    queryKey: deliveryKeys.project(id),
    queryFn: async () => {
      const payload = await requestJson<{ project: DeliveryProject }>(
        `/api/delivery-projects/${id}`,
      );
      return payload.project;
    },
    enabled: Boolean(id),
  });
}

export function useDeliveryTasksQuery(projectId: string) {
  return useQuery({
    queryKey: deliveryKeys.tasks(projectId),
    queryFn: async () => {
      const payload = await requestJson<{ tasks: DeliveryTask[] }>(
        `/api/delivery-tasks?deliveryProjectId=${encodeURIComponent(projectId)}`,
      );
      return payload.tasks ?? [];
    },
    enabled: Boolean(projectId),
  });
}

export function useSaveDeliveryProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (project: DeliveryProject) =>
      requestJson<{ project: DeliveryProject }>("/api/delivery-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      }),
    onSuccess(payload) {
      queryClient.setQueryData(
        deliveryKeys.project(payload.project.id),
        payload.project,
      );
      void queryClient.invalidateQueries({ queryKey: deliveryKeys.projects() });
    },
  });
}

export function useDeleteDeliveryProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      requestJson<{ deleted: boolean }>(`/api/delivery-projects/${id}`, {
        method: "DELETE",
      }),
    onSuccess(_payload, id) {
      queryClient.removeQueries({ queryKey: deliveryKeys.project(id) });
      queryClient.removeQueries({ queryKey: deliveryKeys.tasks(id) });
      void queryClient.invalidateQueries({ queryKey: deliveryKeys.projects() });
    },
  });
}

export function useDeliveryEvaluationQuery(
  projectId: string,
  formType: EvaluationFormType,
) {
  return useQuery({
    queryKey: deliveryKeys.evaluation(projectId, formType),
    queryFn: () =>
      requestJson<DeliveryEvaluationPayload>(
        `/api/delivery-projects/${projectId}/evaluation?type=${formType}`,
      ),
    enabled: Boolean(projectId),
  });
}

function useEvaluationMutation<TPayload>(
  projectId: string,
  formType: EvaluationFormType,
  path: string,
  body?: (variables: unknown) => unknown,
  invalidate = true,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: unknown) =>
      requestJson<TPayload>(
        `/api/delivery-projects/${projectId}/evaluation${path}?type=${formType}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body ? body(variables) : variables ?? {}),
        },
      ),
    onSuccess() {
      if (invalidate) {
        void queryClient.invalidateQueries({
          queryKey: deliveryKeys.evaluation(projectId, formType),
        });
      }
    },
  });
}

export function useSaveEvaluationFormMutation(
  projectId: string,
  formType: EvaluationFormType,
) {
  // Saves stay silent so background auto-saves never refetch the form
  // and clobber question edits the user is still typing.
  return useEvaluationMutation<{ form: EvaluationForm }>(
    projectId,
    formType,
    "",
    (form) => ({ form }),
    false,
  );
}

export function useGenerateEvaluationQuestionsMutation(
  projectId: string,
  formType: EvaluationFormType,
) {
  return useEvaluationMutation<{ form: EvaluationForm; notice?: string }>(
    projectId,
    formType,
    "/generate",
  );
}

export function useOpenEvaluationFormMutation(
  projectId: string,
  formType: EvaluationFormType,
) {
  return useEvaluationMutation<{ form: EvaluationForm; link: string }>(
    projectId,
    formType,
    "/open",
  );
}

export function useCloseEvaluationFormMutation(
  projectId: string,
  formType: EvaluationFormType,
) {
  return useEvaluationMutation<{ form: EvaluationForm }>(
    projectId,
    formType,
    "/close",
  );
}

export function useGenerateDeliveryMaterialMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (target: DeliveryMaterialKey) =>
      requestJson<{ project: DeliveryProject; notice?: string }>(
        `/api/delivery-projects/${projectId}/materials/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target }),
        },
      ),
    onSuccess(payload) {
      queryClient.setQueryData(
        deliveryKeys.project(payload.project.id),
        payload.project,
      );
      void queryClient.invalidateQueries({ queryKey: deliveryKeys.projects() });
    },
  });
}

export function useSaveDeliveryTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (task: DeliveryTask) =>
      requestJson<{ task: DeliveryTask }>("/api/delivery-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      }),
    onSuccess(payload) {
      void queryClient.invalidateQueries({
        queryKey: deliveryKeys.tasks(payload.task.deliveryProjectId),
      });
    },
  });
}

export function useDeleteDeliveryTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (task: DeliveryTask) =>
      requestJson<{ deleted: boolean }>(`/api/delivery-tasks/${task.id}`, {
        method: "DELETE",
      }),
    onSuccess(_payload, task) {
      void queryClient.invalidateQueries({
        queryKey: deliveryKeys.tasks(task.deliveryProjectId),
      });
    },
  });
}
