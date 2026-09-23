"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestJson } from "@/lib/api-client";
import { trainingPackageKeys } from "@/features/training-packages/queries";
import { solutionProposalKeys } from "@/features/digital-solution-proposals/queries";
import { deliveryKeys } from "@/features/delivery/queries";
import type { ProposalStage } from "./domain";

export function useSetProposalStageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { kind: "training_package" | "system_proposal"; id: string; status: ProposalStage }) =>
      requestJson<{ status: ProposalStage }>("/api/pipeline/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    async onSuccess(_result, input) {
      const keys = input.kind === "training_package" ? trainingPackageKeys : solutionProposalKeys;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.all }),
        queryClient.invalidateQueries({ queryKey: deliveryKeys.all }),
      ]);
    },
  });
}
