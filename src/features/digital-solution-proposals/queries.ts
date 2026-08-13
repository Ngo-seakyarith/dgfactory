"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { clientKeys } from "@/features/clients/queries";
import { requestJson } from "@/lib/api-client";
import type { Client, ClientProfileInput } from "@/lib/crm";

import type { DigitalSolutionProposal } from "./domain/types";

export const solutionProposalKeys = {
  all: ["solution-proposals"] as const,
  list: () => [...solutionProposalKeys.all, "list"] as const,
  detail: (id: string) => [...solutionProposalKeys.all, "detail", id] as const,
};

export function useSolutionProposalsQuery() {
  return useQuery({
    queryKey: solutionProposalKeys.list(),
    queryFn: async () => {
      const payload = await requestJson<{ proposals: DigitalSolutionProposal[] }>(
        "/api/solution-proposals",
      );
      return payload.proposals ?? [];
    },
  });
}

export function useSolutionProposalQuery(id?: string) {
  return useQuery({
    queryKey: solutionProposalKeys.detail(id ?? "new"),
    queryFn: async () => {
      const payload = await requestJson<{ proposal: DigitalSolutionProposal }>(
        `/api/solution-proposals/${id}`,
      );
      return payload.proposal;
    },
    enabled: Boolean(id),
  });
}

export function useSaveSolutionProposalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      proposal,
      client,
    }: {
      id?: string;
      proposal: DigitalSolutionProposal;
      client: ClientProfileInput;
    }) =>
      requestJson<{ proposal: DigitalSolutionProposal; client: Client }>(
        id ? `/api/solution-proposals/${id}` : "/api/solution-proposals",
        {
          method: id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proposal, client }),
        },
      ),
    onSuccess(payload) {
      queryClient.setQueryData(
        solutionProposalKeys.detail(payload.proposal.id),
        payload.proposal,
      );
      void queryClient.invalidateQueries({ queryKey: solutionProposalKeys.list() });
      void queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
  });
}

export function useDeleteSolutionProposalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      requestJson<{ deleted: boolean }>(`/api/solution-proposals/${id}`, {
        method: "DELETE",
      }),
    onSuccess(_payload, id) {
      queryClient.removeQueries({ queryKey: solutionProposalKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: solutionProposalKeys.list() });
      void queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
  });
}

export function setSolutionProposalQueryData(
  queryClient: ReturnType<typeof useQueryClient>,
  proposal: DigitalSolutionProposal,
) {
  queryClient.setQueryData(solutionProposalKeys.detail(proposal.id), proposal);
  void queryClient.invalidateQueries({ queryKey: solutionProposalKeys.list() });
  void queryClient.invalidateQueries({ queryKey: clientKeys.all });
}
