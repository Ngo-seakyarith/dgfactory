"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { requestJson } from "@/lib/api-client";
import type { Client } from "@/features/crm/domain";

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

export function useClientQuery(id: string) {
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: async () => {
      const payload = await requestJson<{ client: Client }>(`/api/clients/${id}`);
      return payload.client;
    },
    enabled: Boolean(id),
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
      void queryClient.invalidateQueries({ queryKey: clientKeys.list() });
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
      void queryClient.invalidateQueries({ queryKey: clientKeys.list() });
      void queryClient.invalidateQueries({ queryKey: ["training-packages"] });
      void queryClient.invalidateQueries({ queryKey: ["solution-proposals"] });
    },
  });
}
