import { clientPricingParagraph, internalProfitabilityNote } from "@/lib/pricing";
import type { ExportTarget } from "@/lib/export-package";
import type { TrainingPackage } from "@/lib/training-packages";

export type ExportSafetyIssue = {
  severity: "Medium" | "High" | "Critical";
  term: string;
  message: string;
};

export type ExportSafetyResult = {
  allowed: boolean;
  issues: ExportSafetyIssue[];
  recommendation: string;
};

const internalTerms = [
  "internal only",
  "internal note",
  "internal profitability",
  "estimated profit",
  "estimated margin",
  "profit margin",
  "target margin",
  "target profit",
  "direct cost",
  "trainer day rate",
  "cost breakdown",
  "internal knowledge",
  "internal source",
  "client-safe export includes internal",
];

function textForTarget(pkg: TrainingPackage, target: ExportTarget) {
  if (target === "proposal") {
    return [pkg.proposal, pkg.commercialProposal].join("\n\n");
  }

  if (target === "pricing") {
    return [
      clientPricingParagraph(pkg.pricingInputs, pkg.pricingOutputs),
      internalProfitabilityNote(pkg.pricingInputs, pkg.pricingOutputs),
    ].join("\n");
  }

  if (target === "syllabus") return pkg.syllabus;
  if (target === "workbook") return pkg.workbook;
  if (target === "follow-up-email") return pkg.followUpEmail;
  if (target === "slides") return pkg.deckOutline;

  return [
    pkg.proposal,
    pkg.commercialProposal,
    pkg.syllabus,
    pkg.workbook,
    pkg.followUpEmail,
    pkg.deckOutline,
  ].join("\n\n");
}

export function validateClientExportSafety({
  pkg,
  target,
  includeInternalNotes,
  actorCanApproveInternal,
}: {
  pkg: TrainingPackage;
  target: ExportTarget;
  includeInternalNotes: boolean;
  actorCanApproveInternal: boolean;
}): ExportSafetyResult {
  if (includeInternalNotes && actorCanApproveInternal) {
    return {
      allowed: true,
      issues: [],
      recommendation:
        "Admin explicitly selected internal export. Review file before sharing externally.",
    };
  }

  const text = textForTarget(pkg, target).toLowerCase();
  const issues: ExportSafetyIssue[] = internalTerms
    .filter((term) => text.includes(term))
    .map((term) => ({
      severity:
        term.includes("profit") || term.includes("margin") || term.includes("direct cost")
          ? "Critical" as const
          : "High" as const,
      term,
      message: `Client-facing export appears to contain internal term: ${term}.`,
    }));
  const internalKnowledge = (pkg.knowledgeUsed ?? []).filter(
    (source) => source.visibility === "Internal",
  );

  if (internalKnowledge.length && target !== "proposal") {
    issues.push({
      severity: "Medium",
      term: "internal knowledge source",
      message:
        "Package has internal knowledge notes. Export content is scanned; source notes remain internal.",
    });
  }

  return {
    allowed: issues.filter((issue) => issue.severity !== "Medium").length === 0,
    issues,
    recommendation: issues.length
      ? "Remove internal margin/notes language or export as an explicit Admin internal file only."
      : "No internal export leakage markers detected.",
  };
}
