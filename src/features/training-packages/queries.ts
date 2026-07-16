"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { clientKeys } from "@/features/clients/queries";
import { requestJson } from "@/lib/api-client";
import type { Client, ClientProfileInput } from "@/lib/crm";

import type { TrainingPackage } from "./domain/training-package";
import type {
  TrainingPackageInput,
  TrainingPackageOutputs,
} from "./domain/training-package";
import type { PricingInputs } from "./domain/pricing";
import type { KnowledgeSourceNote } from "@/lib/knowledge";

export const trainingPackageKeys = {
  all: ["training-packages"] as const,
  list: () => [...trainingPackageKeys.all, "list"] as const,
  detail: (id: string) => [...trainingPackageKeys.all, "detail", id] as const,
};

export function useTrainingPackagesQuery() {
  return useQuery({
    queryKey: trainingPackageKeys.list(),
    queryFn: async () => {
      const payload = await requestJson<{ packages: TrainingPackage[] }>(
        "/api/training-packages",
      );
      return payload.packages ?? [];
    },
  });
}

export function useTrainingPackageQuery(id: string) {
  return useQuery({
    queryKey: trainingPackageKeys.detail(id),
    queryFn: async () => {
      const payload = await requestJson<{ package: TrainingPackage }>(
        `/api/training-packages/${id}`,
      );
      return payload.package;
    },
    enabled: Boolean(id),
  });
}

export function useSaveTrainingPackageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      package: trainingPackage,
      client,
    }: {
      package: TrainingPackage;
      client: ClientProfileInput;
    }) =>
      requestJson<{ package: TrainingPackage; client: Client }>(
        "/api/training-packages",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ package: trainingPackage, client }),
        },
      ),
    onSuccess(payload) {
      queryClient.setQueryData(
        trainingPackageKeys.detail(payload.package.id),
        payload.package,
      );
      queryClient.setQueryData<Client[]>(clientKeys.list(), (current = []) => [
        payload.client,
        ...current.filter((client) => client.id !== payload.client.id),
      ]);
      void queryClient.invalidateQueries({ queryKey: trainingPackageKeys.list() });
      void queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
  });
}

export function useGenerateTrainingPackageMutation() {
  return useMutation({
    mutationFn: (input: TrainingPackageInput & { pricingInputs: PricingInputs }) =>
      requestJson<{
        outputs?: TrainingPackageOutputs;
        syllabus?: string;
        proposal?: string;
        knowledgeUsed?: KnowledgeSourceNote[];
        mode?: "openai";
        notice?: string;
      }>("/api/training-packages/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
  });
}

export function useDeleteTrainingPackageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      requestJson<{ deleted: boolean }>(`/api/training-packages/${id}`, {
        method: "DELETE",
      }),
    onSuccess(_payload, id) {
      queryClient.removeQueries({ queryKey: trainingPackageKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: trainingPackageKeys.list() });
      void queryClient.invalidateQueries({ queryKey: clientKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}
