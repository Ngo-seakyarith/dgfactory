"use client";

import { useSolutionProposalsQuery } from "@/features/digital-solution-proposals/queries";
import {
  useClientsQuery,
  useOpportunitiesQuery,
} from "@/features/crm/queries";
import { useTrainingPackagesQuery } from "@/features/training-packages/queries";

export function useCrmData() {
  const clientsQuery = useClientsQuery();
  const opportunitiesQuery = useOpportunitiesQuery();
  const packagesQuery = useTrainingPackagesQuery();
  const systemProposalsQuery = useSolutionProposalsQuery();
  const queries = [clientsQuery, opportunitiesQuery, packagesQuery, systemProposalsQuery];
  const isLoading = queries.some((query) => query.isPending);
  const isFetching = queries.some((query) => query.isFetching);
  const error = queries.find((query) => query.isError)?.error ?? null;
  const notice = error
    ? error.message
    : isLoading
      ? ""
      : isFetching
        ? "Refreshing CRM records..."
        : "";

  async function refresh() {
    await Promise.all(queries.map((query) => query.refetch()));
  }

  return {
    clients: clientsQuery.data ?? [],
    opportunities: opportunitiesQuery.data ?? [],
    packages: packagesQuery.data ?? [],
    systemProposals: systemProposalsQuery.data ?? [],
    isLoading,
    notice,
    error,
    refresh,
  };
}

