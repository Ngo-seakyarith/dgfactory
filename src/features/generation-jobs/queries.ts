"use client";

import { useQuery, type QueryClient } from "@tanstack/react-query";

import { requestJson } from "@/lib/api-client";

import {
  isActiveGenerationJob,
  type GenerationJob,
  type GenerationJobType,
} from "./domain/types";

export const generationJobKeys = {
  all: ["generation-jobs"] as const,
  latest: (jobType: GenerationJobType, resourceId: string, target?: string) =>
    [...generationJobKeys.all, jobType, resourceId, target ?? "*"] as const,
};

export function setGenerationJobQueryData(
  queryClient: QueryClient,
  job: GenerationJob,
) {
  queryClient.setQueryData(
    generationJobKeys.latest(job.jobType, job.resourceId, job.target || undefined),
    job,
  );
}

function pollingInterval(job: GenerationJob | null | undefined) {
  if (!isActiveGenerationJob(job)) return false;
  const age = Date.now() - new Date(job.createdAt).getTime();
  if (age < 15_000) return 2_000;
  if (age < 60_000) return 3_000;
  return 5_000;
}

export function useLatestGenerationJobQuery({
  jobType,
  resourceId,
  target,
  enabled = true,
}: {
  jobType: GenerationJobType;
  resourceId: string;
  target?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: generationJobKeys.latest(jobType, resourceId, target),
    queryFn: async () => {
      const params = new URLSearchParams({ jobType, resourceId });
      if (target !== undefined) params.set("target", target);
      const payload = await requestJson<{ job: GenerationJob | null }>(
        `/api/generation-jobs?${params}`,
      );
      return payload.job;
    },
    enabled: enabled && Boolean(resourceId),
    refetchInterval(query) {
      return pollingInterval(query.state.data);
    },
    staleTime: 1_000,
  });
}
