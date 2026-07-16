"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { clientKeys } from "@/features/clients/queries";
import { requestJson } from "@/lib/api-client";

import type { IntelligentSystemProposal } from "./domain/types";

export const systemProposalKeys = {
  all: ["system-proposals"] as const,
  list: () => [...systemProposalKeys.all, "list"] as const,
  detail: (id: string) => [...systemProposalKeys.all, "detail", id] as const,
};

export function useSystemProposalsQuery() {
  return useQuery({
    queryKey: systemProposalKeys.list(),
    queryFn: async () => {
      const payload = await requestJson<{ proposals: IntelligentSystemProposal[] }>(
        "/api/system-proposals",
      );
      return payload.proposals ?? [];
    },
  });
}

export function useSystemProposalQuery(id?: string) {
  return useQuery({
    queryKey: systemProposalKeys.detail(id ?? "new"),
    queryFn: async () => {
      const payload = await requestJson<{ proposal: IntelligentSystemProposal }>(
        `/api/system-proposals/${id}`,
      );
      return payload.proposal;
    },
    enabled: Boolean(id),
  });
}

export function useSaveSystemProposalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, proposal }: { id?: string; proposal: IntelligentSystemProposal }) =>
      requestJson<{ proposal: IntelligentSystemProposal }>(
        id ? `/api/system-proposals/${id}` : "/api/system-proposals",
        {
          method: id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proposal }),
        },
      ),
    onSuccess(payload) {
      queryClient.setQueryData(
        systemProposalKeys.detail(payload.proposal.id),
        payload.proposal,
      );
      void queryClient.invalidateQueries({ queryKey: systemProposalKeys.list() });
      void queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
  });
}

export function useDeleteSystemProposalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      requestJson<{ deleted: boolean }>(`/api/system-proposals/${id}`, {
        method: "DELETE",
      }),
    onSuccess(_payload, id) {
      queryClient.removeQueries({ queryKey: systemProposalKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: systemProposalKeys.list() });
      void queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
  });
}

export function setSystemProposalQueryData(
  queryClient: ReturnType<typeof useQueryClient>,
  proposal: IntelligentSystemProposal,
) {
  queryClient.setQueryData(systemProposalKeys.detail(proposal.id), proposal);
  void queryClient.invalidateQueries({ queryKey: systemProposalKeys.list() });
  void queryClient.invalidateQueries({ queryKey: clientKeys.all });
}
