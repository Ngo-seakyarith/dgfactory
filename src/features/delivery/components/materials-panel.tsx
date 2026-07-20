"use client";

import { useState } from "react";
import { Download, FileText, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  deliveryMaterialKeys,
  type DeliveryMaterialKey,
  type DeliveryProject,
} from "@/features/delivery";
import { useGenerateDeliveryMaterialMutation } from "@/features/delivery/queries";
import { MarkdownPreview } from "@/features/training-packages/components/markdown-preview";
import { errorMessage } from "@/lib/api-client";

const materialMeta: Record<
  DeliveryMaterialKey,
  { label: string; description: string; exportLabel: string; optional?: boolean }
> = {
  slides: {
    label: "Slides",
    description: "Slide deck outline for the session, exportable to PPTX.",
    exportLabel: "Export PPTX",
  },
  workbook: {
    label: "Workbook",
    description: "Participant workbook (6-10 pages) with exercises and templates.",
    exportLabel: "Export DOCX",
  },
  facilitatorGuide: {
    label: "Facilitator Guide",
    description: "About 5 pages: timed agenda, run notes, and contingencies for the trainer.",
    exportLabel: "Export DOCX",
  },
  promptLibrary: {
    label: "Prompt Library",
    description: "Optional: ready-to-use AI prompts for participants of AI trainings.",
    exportLabel: "Export DOCX",
    optional: true,
  },
};

export function MaterialsPanel({ project }: { project: DeliveryProject }) {
  const generateMaterial = useGenerateDeliveryMaterialMutation(project.id);
  const [active, setActive] = useState<DeliveryMaterialKey>("slides");
  const [notice, setNotice] = useState("");
  const [exporting, setExporting] = useState(false);

  const meta = materialMeta[active];
  const content = project.materials[active];

  async function generate() {
    setNotice("");
    try {
      const payload = await generateMaterial.mutateAsync(active);
      if (payload.notice) setNotice(payload.notice);
    } catch (error) {
      setNotice(errorMessage(error, "Material generation failed."));
    }
  }

  async function exportMaterial() {
    setExporting(true);
    setNotice("");
    try {
      const response = await fetch(
        `/api/delivery-projects/${project.id}/materials/export`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target: active }),
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Material export failed.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `DGAcademy_${project.title.replace(/[^a-z0-9]+/gi, "_")}_${meta.label.replace(/\s+/g, "")}.${active === "slides" ? "pptx" : "docx"}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setNotice(errorMessage(error, "Material export failed."));
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Training Materials</CardTitle>
        <CardDescription className="mt-2">
          AI drafts each material from the proposal and the confirmed delivery
          details. Review and regenerate until it is ready, then export.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Training materials">
          {deliveryMaterialKeys.map((key) => {
            const item = materialMeta[key];
            const ready = Boolean(project.materials[key]?.trim());
            const activeTab = active === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeTab}
                onClick={() => setActive(key)}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  activeTab
                    ? "border-teal-300/55 bg-teal-400/10"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                {item.label}
                {ready ? <Badge variant="teal">Ready</Badge> : null}
              </button>
            );
          })}
        </div>

        <p className="text-sm text-muted-foreground">{meta.description}</p>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="gold"
            disabled={generateMaterial.isPending}
            onClick={() => void generate()}
          >
            {generateMaterial.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Sparkles />
            )}
            {content ? `Regenerate ${meta.label}` : `Generate ${meta.label}`}
          </Button>
          {content ? (
            <Button
              type="button"
              variant="outline"
              disabled={exporting}
              onClick={() => void exportMaterial()}
            >
              {exporting ? <Loader2 className="animate-spin" /> : <Download />}
              {meta.exportLabel}
            </Button>
          ) : null}
          {notice ? (
            <span className="text-sm text-muted-foreground">{notice}</span>
          ) : null}
        </div>

        {content ? (
          <div className="overflow-hidden rounded-md border border-white/10 bg-[#07111f]/55">
            <MarkdownPreview value={content} />
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-white/15 p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {meta.optional
                ? `No ${meta.label.toLowerCase()} yet. Generate it for AI-focused trainings, or skip it.`
                : `No ${meta.label.toLowerCase()} yet. Generate it from the proposal and delivery details.`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
