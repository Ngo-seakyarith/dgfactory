"use client";

import { Clipboard, Download, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownPreview } from "@/features/training-packages/components/markdown-preview";

import {
  calculateSolutionCommercialTotal,
  solutionProposalContentToMarkdown,
} from "../domain/proposal";
import type { DigitalSolutionProposal } from "../domain/types";

type Props = {
  proposal: DigitalSolutionProposal;
  busy: boolean;
  onChange: (proposal: DigitalSolutionProposal) => void;
  onGenerate: () => void;
  onExport: () => void;
};

export function SolutionProposalPanel({
  proposal,
  busy,
  onChange,
  onGenerate,
  onExport,
}: Props) {
  const markdown = proposal.proposalContent
    ? solutionProposalContentToMarkdown(
        proposal.proposalContent,
        proposal.commercialInputs,
      )
    : "";
  const total = calculateSolutionCommercialTotal(proposal.commercialInputs);
  const professionalFee = proposal.commercialInputs.lineItems[0]?.amount ?? 0;
  const updateCommercial = (
    patch: Partial<DigitalSolutionProposal["commercialInputs"]>,
  ) => {
    onChange({
      ...proposal,
      commercialInputs: { ...proposal.commercialInputs, ...patch },
    });
  };
  const updateProfessionalFee = (amount: number) => {
    updateCommercial({
      lineItems:
        amount > 0
          ? [
              {
                id: proposal.commercialInputs.lineItems[0]?.id ?? "professional-fee",
                description: "Professional fee",
                amount,
              },
            ]
          : [],
    });
  };

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

      <details className="rounded-md border border-border">
        <summary className="cursor-pointer p-4 font-semibold">Commercial Pricing (Optional)</summary>
        <div className="space-y-4 border-t border-border p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Professional fee">
              <Input
                type="number"
                min="0"
                value={professionalFee || ""}
                placeholder="Enter client price"
                onChange={(event) => updateProfessionalFee(Number(event.target.value))}
              />
            </Field>
            <Field label="Currency">
              <Input
                value={proposal.commercialInputs.currency}
                onChange={(event) => updateCommercial({ currency: event.target.value.toUpperCase() })}
                placeholder="USD"
              />
            </Field>
            <Field label="Tax wording">
              <Select value={proposal.commercialInputs.vatStatus} onChange={(event) => updateCommercial({ vatStatus: event.target.value as DigitalSolutionProposal["commercialInputs"]["vatStatus"] })}>
                <option>Excluding VAT</option>
                <option>Including VAT</option>
              </Select>
            </Field>
            <Field label="Proposal validity">
              <Input value={proposal.commercialInputs.proposalValidity} onChange={(event) => updateCommercial({ proposalValidity: event.target.value })} />
            </Field>
          </div>
          {total > 0 ? (
            <p className="font-semibold">Proposal price: {proposal.commercialInputs.currency} {total.toFixed(2)} ({proposal.commercialInputs.vatStatus.toLowerCase()})</p>
          ) : null}
          <Field label="Payment terms">
            <Textarea value={proposal.commercialInputs.paymentTerms} onChange={(event) => updateCommercial({ paymentTerms: event.target.value })} />
          </Field>
          <Field label="Hosting and recurring costs">
            <Textarea
              value={proposal.commercialInputs.hostingAndRecurringCosts}
              onChange={(event) =>
                updateCommercial({ hostingAndRecurringCosts: event.target.value })
              }
              placeholder="Domain, hosting platform, recurring costs, ownership, and payment responsibility"
            />
          </Field>
        </div>
      </details>

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
