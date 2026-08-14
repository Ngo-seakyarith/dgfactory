"use client";

import { Clipboard, Download, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MarkdownPreview } from "@/features/training-packages/components/markdown-preview";

import { solutionProposalContentToMarkdown } from "../domain/proposal";
import type { DigitalSolutionProposal } from "../domain/types";

type Props = {
  proposal: DigitalSolutionProposal;
  busy: boolean;
  onGenerate: () => void;
  onExport: () => void;
};

export function SolutionProposalPanel({
  proposal,
  busy,
  onGenerate,
  onExport,
}: Props) {
  const markdown = proposal.proposalContent
    ? solutionProposalContentToMarkdown(
        proposal.proposalContent,
        proposal.commercialInputs,
      )
    : "";
  return (
    <section className="space-y-6 border-t border-border pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Proposal</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate the client proposal from the reviewed solution scope.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="gold"
            onClick={onGenerate}
            disabled={busy || !proposal.solutionReview}
          >
            <Sparkles className="h-4 w-4" />
            {proposal.proposalContent ? "Generate Again" : "Generate Proposal"}
          </Button>
          {proposal.proposalContent ? (
            <Button variant="outline" onClick={onExport} disabled={busy}>
              <Download className="h-4 w-4" />Export DOCX
            </Button>
          ) : null}
        </div>
      </div>

      {proposal.proposalContent ? (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border p-4">
            <div>
              <h3 className="font-semibold">Generated Proposal</h3>
              <p className="text-xs text-muted-foreground">Review the complete client-facing content before export.</p>
            </div>
            <Button variant="outline" onClick={() => void navigator.clipboard.writeText(markdown)}>
              <Clipboard className="h-4 w-4" />Copy Proposal
            </Button>
          </div>
          <MarkdownPreview value={markdown} />
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Complete the solution review, then generate the proposal.
        </div>
      )}
    </section>
  );
}
