"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/date-time";
import {
  outputToText,
  packageOutputSections,
  type PackageOutputKey,
  type TrainingPackage,
} from "@/features/training-packages";
import type { ExportFormat, ExportTarget } from "@/features/training-packages";
import { CopyButton } from "./shared";
import { MarkdownPreview } from "./markdown-preview";

export function OutputTabs({ pkg }: { pkg: TrainingPackage }) {
  const sections = useMemo(
    () => packageOutputSections,
    [],
  );
  const [activeKey, setActiveKey] = useState<PackageOutputKey>(
    packageOutputSections[0].key,
  );
  const [exportNotice, setExportNotice] = useState("");

  const activeSection = useMemo(
    () => sections.find((section) => section.key === activeKey)!,
    [activeKey, sections],
  );
  const activeText = outputToText(pkg, activeSection.key);

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
                ? "border-teal-300/45 bg-teal-300/12 text-foreground"
                : "border-white/10 bg-[#07111f]/45 text-muted-foreground hover:border-input hover:text-foreground"
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
          </div>
        </div>
        <MarkdownPreview value={activeText} />
      </div>
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
        <span>Created {formatDateTime(pkg.createdAt)}</span>
        <Link href="/packages" className="font-medium text-[#176a63] hover:text-foreground">
          View saved packages
        </Link>
      </div>
    </div>
  );
}

export const TrainingPackageOutputsView = OutputTabs;
