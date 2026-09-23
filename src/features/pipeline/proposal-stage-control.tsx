"use client";

import { useState } from "react";
import { proposalStages, type ProposalStage } from "./domain";
import { useSetProposalStageMutation } from "./queries";

export function ProposalStageControl({
  id,
  kind,
  status,
  disabled = false,
}: {
  id: string;
  kind: "training_package" | "system_proposal";
  status: ProposalStage;
  disabled?: boolean;
}) {
  const mutation = useSetProposalStageMutation();
  const [error, setError] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={`proposal-status-${id}`} className="text-sm font-medium">Proposal status</label>
      <select
        id={`proposal-status-${id}`}
        aria-label="Proposal status"
        className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
        value={status}
        disabled={disabled || mutation.isPending}
        onChange={async (event) => {
          setError("");
          try {
            await mutation.mutateAsync({ id, kind, status: event.target.value as ProposalStage });
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Status could not be saved.");
          }
        }}
      >
        {proposalStages.map((stage) => (
          <option
            key={stage}
            value={stage}
            disabled={kind === "training_package" && stage === "Delivered" && status !== "Won" && status !== "Delivered"}
          >
            {stage}
          </option>
        ))}
      </select>
      {mutation.isPending ? <span className="text-xs text-muted-foreground">Saving...</span> : null}
      {error ? <span className="text-sm text-destructive" role="alert">{error}</span> : null}
    </div>
  );
}
