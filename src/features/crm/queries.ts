"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { requestJson } from "@/lib/api-client";
import type { Client } from "@/features/crm/domain";
import { projectKeys } from "@/features/pipeline/project-keys";

export const clientKeys = {
  all: ["clients"] as const,
  list: () => [...clientKeys.all, "list"] as const,
  detail: (id: string) => [...clientKeys.all, "detail", id] as const,
};

export function useClientsQuery() {
  return useQuery({
    queryKey: clientKeys.list(),
    queryFn: async () => {
      const payload = await requestJson<{ clients: Client[] }>("/api/clients");
      return payload.clients ?? [];
    },
  });
}

export function useSaveClientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (client: Client) =>
      requestJson<{ client: Client }>("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(client),
      }),
    onSuccess(payload) {
      queryClient.setQueryData(clientKeys.detail(payload.client.id), payload.client);
      queryClient.setQueryData<Client[]>(clientKeys.list(), (clients) => clients
        ? clients.some((client) => client.id === payload.client.id)
          ? clients.map((client) => client.id === payload.client.id ? payload.client : client)
          : [...clients, payload.client]
        : undefined);
      void queryClient.invalidateQueries({ queryKey: clientKeys.list() });
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useDeleteClientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      requestJson<{ deleted: boolean }>(`/api/clients/${id}`, { method: "DELETE" }),
    onSuccess(_payload, id) {
      queryClient.removeQueries({ queryKey: clientKeys.detail(id) });
      queryClient.setQueryData<Client[]>(clientKeys.list(), (clients) => clients?.filter((client) => client.id !== id));
      void queryClient.invalidateQueries({ queryKey: clientKeys.list() });
      void queryClient.invalidateQueries({ queryKey: ["training-packages"] });
      void queryClient.invalidateQueries({ queryKey: ["solution-proposals"] });
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}
