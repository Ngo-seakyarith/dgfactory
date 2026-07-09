import {
  fullPackageToMarkdown,
  qualityChecklistToMarkdown,
  type TrainingPackage,
} from "@/features/training-packages/domain/training-package";
import {
  pricingSummaryToMarkdown,
} from "@/features/training-packages/domain/pricing";
import type { ExportTarget } from "./types";

function filePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "training-package";
}

function exportLabel(target: ExportTarget) {
  const labels: Record<ExportTarget, string> = {
    full: "full-package",
    proposal: "proposal",
    syllabus: "syllabus",
    workbook: "workbook",
    "follow-up-email": "follow-up-email",
    slides: "slides",
    summary: "summary",
    pricing: "pricing",
  };

  return labels[target];
}

export function exportFilename(pkg: TrainingPackage, target: ExportTarget, format: string) {
  return `${filePart(pkg.title)}-${exportLabel(target)}.${format}`;
}

export function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function wrapText(value: string, maxLength = 92) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxLength && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });

  if (line) lines.push(line);
  return lines.length > 0 ? lines : [value];
}

export function markdownToLines(value: string) {
  return value.replace(/\r\n/g, "\n").split("\n");
}

export function contentForTarget(pkg: TrainingPackage, target: ExportTarget) {
  const summary = [
    `# ${pkg.title}`,
    "",
    `Client: ${pkg.client}`,
    `Audience: ${pkg.audience}`,
    `Duration: ${pkg.duration}`,
    `Promise: ${pkg.promise}`,
  ].join("\n");

  const targets: Record<ExportTarget, string> = {
    full: fullPackageToMarkdown(pkg),
    proposal: pkg.proposal,
    syllabus: pkg.syllabus,
    workbook: pkg.workbook,
    "follow-up-email": pkg.followUpEmail,
    slides: pkg.deckOutline,
    summary,
    pricing: pricingSummaryToMarkdown(pkg.pricingInputs, pkg.pricingOutputs),
  };

  const content = targets[target];
  return content?.trim() ? content : summary;
}

export function docTitle(target: ExportTarget) {
  const labels: Record<ExportTarget, string> = {
    full: "Full Training Package",
    proposal: "Training Proposal",
    syllabus: "Training Syllabus",
    workbook: "Participant Workbook",
    "follow-up-email": "Follow-up Email",
    slides: "Slide Deck Outline",
    summary: "Package Summary",
    pricing: "Pricing Summary",
  };

  return labels[target];
}
