"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requestJson } from "@/lib/api-client";
import { trainingPackageKeys } from "@/features/training-packages/queries";
import type { TrainingPackage } from "@/features/training-packages/domain/training-package";
import { deliveryKeys } from "@/features/delivery/queries";
import type { DeliveryProject } from "@/features/delivery/domain/delivery";
import { syllabusImportKeys } from "@/features/syllabus-imports/queries";
import { projectKeys } from "./project-keys";
import type { ClientProject, ClientProjectDeletion, ClientProjectInput } from "./project-domain";

export function useClientProjectsQuery() {
  return useQuery({ queryKey: projectKeys.list(), queryFn: async () =>
    (await requestJson<{ projects: ClientProject[] }>("/api/client-projects")).projects });
}

export function useSaveClientProjectMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ClientProjectInput | Pick<ClientProjectInput, "stage"> }) =>
      requestJson<{ project: ClientProject }>(id ? `/api/client-projects/${id}` : "/api/client-projects", {
        method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
      }),
    onSuccess({ project }) {
      client.setQueryData(projectKeys.detail(project.id), project);
      client.setQueryData<ClientProject[]>(projectKeys.list(), (projects) => projects
        ? projects.some((item) => item.id === project.id)
          ? projects.map((item) => item.id === project.id ? project : item)
          : [...projects, project]
        : undefined);
      void client.invalidateQueries({ queryKey: projectKeys.list() });
      for (const key of ["training-packages", "solution-proposals", "delivery"]) void client.invalidateQueries({ queryKey: [key] });
    },
  });
}

export function useDeleteClientProjectMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => requestJson<ClientProjectDeletion & { deleted: true }>(`/api/client-projects/${id}`, { method: "DELETE" }),
    async onSuccess(result, id) {
      const keys = [projectKeys.all, trainingPackageKeys.all, deliveryKeys.all, syllabusImportKeys.all];
      await Promise.all(keys.map((queryKey) => client.cancelQueries({ queryKey })));
      client.removeQueries({ queryKey: projectKeys.detail(id) });
      client.setQueryData<ClientProject[]>(projectKeys.list(), (projects) => projects?.filter((project) => project.id !== id));
      if (result.trainingPackageId) {
        client.removeQueries({ queryKey: trainingPackageKeys.detail(result.trainingPackageId) });
        client.setQueryData<TrainingPackage[]>(trainingPackageKeys.list(), (packages) => packages?.filter((pkg) => pkg.id !== result.trainingPackageId));
      }
      for (const deliveryId of result.deliveryProjectIds) {
        client.removeQueries({ queryKey: deliveryKeys.project(deliveryId) });
        client.removeQueries({ queryKey: deliveryKeys.tasks(deliveryId) });
        client.removeQueries({ queryKey: [...deliveryKeys.all, "evaluation", deliveryId] });
      }
      client.setQueryData<DeliveryProject[]>(deliveryKeys.projects(), (projects) => projects?.filter((project) => !result.deliveryProjectIds.includes(project.id)));
      await Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
    },
  });
}
