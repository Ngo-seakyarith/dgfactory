"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { requestJson } from "@/lib/api-client";

import type { DeliveryProject, DeliveryTask } from "./domain/delivery";
import type {
  EvaluationForm,
  EvaluationResponse,
  EvaluationSummary,
} from "./domain/evaluation-form";

export const deliveryKeys = {
  all: ["delivery"] as const,
  projects: () => [...deliveryKeys.all, "projects"] as const,
  project: (id: string) => [...deliveryKeys.projects(), id] as const,
  tasks: (projectId: string) =>
    [...deliveryKeys.all, "tasks", projectId] as const,
  evaluation: (projectId: string) =>
    [...deliveryKeys.all, "evaluation", projectId] as const,
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

export function useDeliveryEvaluationQuery(projectId: string) {
  return useQuery({
    queryKey: deliveryKeys.evaluation(projectId),
    queryFn: () =>
      requestJson<DeliveryEvaluationPayload>(
        `/api/delivery-projects/${projectId}/evaluation`,
      ),
    enabled: Boolean(projectId),
  });
}

function useEvaluationMutation<TPayload>(
  projectId: string,
  path: string,
  body?: (variables: unknown) => unknown,
  invalidate = true,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: unknown) =>
      requestJson<TPayload>(
        `/api/delivery-projects/${projectId}/evaluation${path}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body ? body(variables) : variables ?? {}),
        },
      ),
    onSuccess() {
      if (invalidate) {
        void queryClient.invalidateQueries({
          queryKey: deliveryKeys.evaluation(projectId),
        });
      }
    },
  });
}

export function useSaveEvaluationFormMutation(projectId: string) {
  // Saves stay silent so background auto-saves never refetch the form
  // and clobber question edits the user is still typing.
  return useEvaluationMutation<{ form: EvaluationForm }>(
    projectId,
    "",
    (form) => ({ form }),
    false,
  );
}

export function useGenerateEvaluationQuestionsMutation(projectId: string) {
  return useEvaluationMutation<{ form: EvaluationForm; notice?: string }>(
    projectId,
    "/generate",
  );
}

export function useOpenEvaluationFormMutation(projectId: string) {
  return useEvaluationMutation<{ form: EvaluationForm; link: string }>(
    projectId,
    "/open",
  );
}

export function useCloseEvaluationFormMutation(projectId: string) {
  return useEvaluationMutation<{ form: EvaluationForm }>(projectId, "/close");
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
