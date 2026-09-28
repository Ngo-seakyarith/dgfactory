"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requestJson } from "@/lib/api-client";
import { projectKeys } from "./project-keys";
import type { ClientProject, ClientProjectInput } from "./project-domain";

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
      client.setQueryData<ClientProject[]>(projectKeys.list(), (projects) => projects ? [...projects.filter((item) => item.id !== project.id), project] : undefined);
      void client.invalidateQueries({ queryKey: projectKeys.list() });
      for (const key of ["training-packages", "solution-proposals", "delivery"]) void client.invalidateQueries({ queryKey: [key] });
    },
  });
}

export function useDeleteClientProjectMutation() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: string) => requestJson(`/api/client-projects/${id}`, { method: "DELETE" }),
    onSuccess(_result, id) { client.removeQueries({ queryKey: projectKeys.detail(id) }); client.setQueryData<ClientProject[]>(projectKeys.list(), (projects) => projects?.filter((project) => project.id !== id)); void client.invalidateQueries({ queryKey: projectKeys.list() }); },
  });
}
