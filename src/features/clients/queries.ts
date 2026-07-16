"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { requestJson } from "@/lib/api-client";
import type { Client, Opportunity } from "@/lib/crm";

export const clientKeys = {
  all: ["clients"] as const,
  list: () => [...clientKeys.all, "list"] as const,
  detail: (id: string) => [...clientKeys.all, "detail", id] as const,
};

export const opportunityKeys = {
  all: ["opportunities"] as const,
  list: () => [...opportunityKeys.all, "list"] as const,
  detail: (id: string) => [...opportunityKeys.all, "detail", id] as const,
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

export function useOpportunitiesQuery() {
  return useQuery({
    queryKey: opportunityKeys.list(),
    queryFn: async () => {
      const payload = await requestJson<{ opportunities: Opportunity[] }>(
        "/api/opportunities",
      );
      return payload.opportunities ?? [];
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
      void queryClient.invalidateQueries({ queryKey: ["system-proposals"] });
      void queryClient.invalidateQueries({ queryKey: opportunityKeys.all });
    },
  });
}

export function useSaveOpportunityMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (opportunity: Opportunity) =>
      requestJson<{ opportunity: Opportunity }>("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opportunity),
      }),
    onSuccess(payload) {
      queryClient.setQueryData(
        opportunityKeys.detail(payload.opportunity.id),
        payload.opportunity,
      );
      void queryClient.invalidateQueries({ queryKey: opportunityKeys.list() });
    },
  });
}

export function useDeleteOpportunityMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      requestJson<{ deleted: boolean }>(`/api/opportunities/${id}`, {
        method: "DELETE",
      }),
    onSuccess(_payload, id) {
      queryClient.removeQueries({ queryKey: opportunityKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: opportunityKeys.list() });
    },
  });
}
