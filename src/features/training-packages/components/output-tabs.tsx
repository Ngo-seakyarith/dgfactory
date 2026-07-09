"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileText, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fullPackageToMarkdown,
  outputToText,
  packageOutputSections,
  type PackageOutputKey,
  type TrainingPackage,
} from "@/features/training-packages";
import type { ExportFormat, ExportTarget } from "@/features/training-packages";
import type { KnowledgeSourceNote } from "@/lib/knowledge";
import { CopyButton } from "./shared";
import { FeedbackPanel } from "./feedback-panel";
import { MarkdownPreview } from "./markdown-preview";
import {
  QaReviewPanel,
  qaReviewToMarkdown,
  type QaReviewOutput,
} from "./qa-review-panel";

type OutputTabKey = PackageOutputKey | "qaReview" | "feedback";
type RegeneratablePackageSection = "syllabus" | "proposal";
function KnowledgeUsedPanel({
  knowledgeUsed,
}: {
  knowledgeUsed: KnowledgeSourceNote[];
}) {
  if (!knowledgeUsed.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
        <div className="text-sm font-semibold text-white">Knowledge used</div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          No DG Academy knowledge documents were matched for this package.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
      <div className="text-sm font-semibold text-white">Knowledge used</div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Internal source notes for DG Academy review. Client exports do not include
        these citations by default.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {knowledgeUsed.map((item) => (
          <Badge
            key={item.id}
            variant={item.visibility === "Client-safe" ? "teal" : "gold"}
            title={`${item.type} - score ${item.score}`}
          >
            {item.title} ({item.score})
          </Badge>
        ))}
      </div>
    </div>
  );
}

function sectionLabel(section: RegeneratablePackageSection) {
  const labels: Record<RegeneratablePackageSection, string> = {
    syllabus: "Syllabus",
    proposal: "Proposal",
  };

  return labels[section];
}

function regeneratableSectionForKey(
  key: OutputTabKey,
): RegeneratablePackageSection | null {
  if (key === "syllabus" || key === "proposal") {
    return key;
  }

  return null;
}

export function OutputTabs({
  pkg,
  onPackageUpdate,
}: {
  pkg: TrainingPackage;
  onPackageUpdate?: (pkg: TrainingPackage) => void | Promise<void>;
}) {
  const sections = useMemo(
    () => packageOutputSections,
    [],
  );
  const [activeKey, setActiveKey] = useState<OutputTabKey>(
    packageOutputSections[0].key,
  );
  const [exportNotice, setExportNotice] = useState("");
  const [qaReview, setQaReview] = useState<QaReviewOutput | null>(null);
  const [qaNotice, setQaNotice] = useState("");
  const [isRunningQa, setIsRunningQa] = useState(false);
  const [isRegenerating, setIsRegenerating] =
    useState<RegeneratablePackageSection | "">("");
  const [regenerateNotice, setRegenerateNotice] = useState("");

  const activeSection = useMemo(
    () => sections.find((section) => section.key === activeKey)!,
    [activeKey, sections],
  );
  const fullPackage = fullPackageToMarkdown(pkg);
  const qaReviewText = qaReview ? qaReviewToMarkdown(qaReview) : "";
  const activeText = outputToText(pkg, activeSection.key as PackageOutputKey);
  const activeRegeneratableSection = regeneratableSectionForKey(activeSection.key);

  async function exportPackage(format: ExportFormat, target: ExportTarget = "full") {
    setExportNotice(`Preparing ${format.toUpperCase()} export...`);
    const response = await fetch("/api/export-package", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format,
        target,
        package: pkg,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setExportNotice(payload.error ?? "Export failed.");
      return;
    }

    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const match = disposition.match(/filename="([^"]+)"/);
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.href = url;
    link.download = match?.[1] ?? `dg-academy-training-package.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExportNotice(`${format.toUpperCase()} export downloaded.`);
  }

  const exportActions: Array<{
    label: string;
    format: ExportFormat;
    target: ExportTarget;
    icon: typeof FileText;
    disabled: boolean;
  }> = [
    {
      label: "Export Proposal DOCX",
      format: "docx",
      target: "proposal",
      icon: FileText,
      disabled: !pkg.proposal.trim(),
    },
    {
      label: "Export Syllabus DOCX",
      format: "docx",
      target: "syllabus",
      icon: FileText,
      disabled: !pkg.syllabus.trim(),
    },
  ];

  async function runQaReview() {
    setIsRunningQa(true);
    setQaNotice("");

    try {
      const response = await fetch("/api/qa-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageContent: fullPackage,
          client: pkg.client,
          audience: pkg.audience,
          context: pkg.context,
        }),
      });
      const payload = (await response.json()) as {
        review?: QaReviewOutput;
        mode?: "openai";
        model?: string;
        notice?: string;
        error?: string;
      };

      if (!response.ok || !payload.review) {
        throw new Error(payload.error ?? "QA review failed.");
      }

      setQaReview(payload.review);
      setQaNotice(
        payload.notice ??
          `QA review completed with ${payload.model ?? "OpenAI"}.`,
      );
    } catch (error) {
      setQaNotice(error instanceof Error ? error.message : "QA review failed.");
    } finally {
      setIsRunningQa(false);
    }
  }

  async function regenerateSection(section: RegeneratablePackageSection) {
    setIsRegenerating(section);
    setRegenerateNotice("");

    try {
      const response = await fetch("/api/workflows/regenerate-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section,
          packageInput: {
            courseTitle: pkg.title,
            audience: pkg.audience,
            duration: pkg.duration,
            client: pkg.client,
            promise: pkg.promise,
            context: pkg.context,
            tone: pkg.tone,
            proposalBrief: pkg.proposalBrief,
            pricingInputs: pkg.pricingInputs,
          },
          currentPackage: {
            syllabus: pkg.syllabus,
            proposal: pkg.proposal,
          },
        }),
      });
      const payload = (await response.json()) as {
        section?: RegeneratablePackageSection;
        content?: string;
        mode?: "openai";
        error?: string;
      };

      if (!response.ok || !payload.section || payload.content === undefined) {
        throw new Error(payload.error ?? "Section regeneration failed.");
      }

      const updatedPackage = {
        ...pkg,
        [payload.section]: payload.content,
        updatedAt: new Date().toISOString(),
      };
      await onPackageUpdate?.(updatedPackage);
      setRegenerateNotice(
        `${sectionLabel(payload.section)} regenerated with ${payload.mode ?? "openai"} mode.`,
      );
    } catch (error) {
      setRegenerateNotice(
        error instanceof Error ? error.message : "Section regeneration failed.",
      );
    } finally {
      setIsRegenerating("");
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <button
            key={section.key}
            type="button"
            onClick={() => setActiveKey(section.key)}
            className={`rounded-lg border px-3 py-3 text-left text-sm transition ${
              activeKey === section.key
                ? "border-teal-300/45 bg-teal-300/12 text-white"
                : "border-white/10 bg-[#07111f]/45 text-muted-foreground hover:border-white/20 hover:text-white"
            }`}
          >
            <span className="font-semibold">{section.label}</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              {section.description}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-white/10 bg-[#07111f]/60">
        <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-white">{activeSection.label}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {activeSection.description}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton
              value={activeText}
              label={`Copy ${activeSection.label} MD`}
            />
            {activeRegeneratableSection ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => regenerateSection(activeRegeneratableSection)}
                disabled={Boolean(isRegenerating) || !onPackageUpdate}
                title={
                  onPackageUpdate
                    ? `Regenerate ${sectionLabel(activeRegeneratableSection)}`
                    : "Open a package detail page to regenerate saved sections."
                }
              >
                {isRegenerating === activeRegeneratableSection ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Regenerate this section
              </Button>
            ) : null}
          </div>
        </div>
        <MarkdownPreview value={activeText} />
      </div>
      {regenerateNotice ? (
        <p className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-3 text-sm text-teal-50">
          {regenerateNotice}
        </p>
      ) : null}

      <KnowledgeUsedPanel knowledgeUsed={pkg.knowledgeUsed ?? []} />

      <div className="flex flex-wrap gap-2">
            {exportActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={`${action.format}-${action.target}`}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => exportPackage(action.format, action.target)}
                  disabled={action.disabled}
                  title={action.disabled ? "This package section is missing." : action.label}
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
                </Button>
              );
            })}
          {exportNotice ? (
            <p className="basis-full text-xs font-medium text-[#f7d889]">{exportNotice}</p>
          ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Created {new Date(pkg.createdAt).toLocaleString()}</span>
        <Link href="/packages" className="font-medium text-teal-100 hover:text-white">
          View saved packages
        </Link>
      </div>
    </div>
  );
}

export const TrainingPackageOutputsView = OutputTabs;
