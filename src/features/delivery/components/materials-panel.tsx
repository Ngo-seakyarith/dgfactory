"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  isDeliveryMaterialKey,
  type DeliveryMaterialKey,
  type DeliveryProject,
} from "@/features/delivery";
import {
  deliveryKeys,
  fetchDeliveryProject,
  useGenerateDeliveryMaterialMutation,
} from "@/features/delivery/queries";
import { useLatestGenerationJobQuery } from "@/features/generation-jobs/queries";
import type { GenerationJob } from "@/features/generation-jobs/domain/types";
import { MarkdownPreview } from "@/features/training-packages/components/markdown-preview";
import { errorMessage } from "@/lib/api-client";

const materialMeta: Record<
  DeliveryMaterialKey,
  { label: string; description: string; exportLabel: string; optional?: boolean }
> = {
  slides: {
    label: "Slides",
    description: "Layout-aware slide plan for the session, exportable to PPTX.",
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
  const queryClient = useQueryClient();
  const generateMaterial = useGenerateDeliveryMaterialMutation(project.id);
  const [active, setActive] = useState<DeliveryMaterialKey>("slides");
  const [notices, setNotices] = useState<
    Partial<Record<DeliveryMaterialKey, string>>
  >({});
  const [exporting, setExporting] = useState(false);
  const [activeJobIds, setActiveJobIds] = useState<
    Partial<Record<DeliveryMaterialKey, string>>
  >({});
  const [syncing, setSyncing] = useState<
    Partial<Record<DeliveryMaterialKey, boolean>>
  >({});

  const meta = materialMeta[active];
  const content = project.materials[active];
  const activeJobId = activeJobIds[active];
  const notice = notices[active] ?? "";

  const handleActiveJob = useCallback(
    (target: DeliveryMaterialKey, jobId: string) => {
      setActiveJobIds((current) =>
        current[target] === jobId ? current : { ...current, [target]: jobId },
      );
      setNotices((current) => ({
        ...current,
        [target]:
          "Generation is running in the background. You can leave this page.",
      }));
    },
    [],
  );

  const handleTerminalJob = useCallback(
    (target: DeliveryMaterialKey, job: GenerationJob) => {
      setActiveJobIds((current) => {
        if (current[target] !== job.id) return current;
        const next = { ...current };
        delete next[target];
        return next;
      });
      if (job.status === "Failed") {
        setNotices((current) => ({
          ...current,
          [target]: job.errorMessage || "Material generation failed.",
        }));
        return;
      }
      if (job.status !== "Completed") return;
      setNotices((current) => ({
        ...current,
        [target]: `Loading the generated ${materialMeta[target].label.toLowerCase()}...`,
      }));
      setSyncing((current) => ({ ...current, [target]: true }));

      void fetchDeliveryProject(project.id)
        .then((updatedProject) => {
          if (!updatedProject.materials[target]?.trim()) {
            throw new Error(
              `${materialMeta[target].label} completed, but no saved content was returned.`,
            );
          }
          queryClient.setQueryData<DeliveryProject>(
            deliveryKeys.project(project.id),
            (currentProject) => {
              if (!currentProject) return updatedProject;

              const materials = { ...updatedProject.materials };
              for (const key of deliveryMaterialKeys) {
                if (
                  !materials[key]?.trim() &&
                  currentProject.materials[key]?.trim()
                ) {
                  materials[key] = currentProject.materials[key];
                }
              }

              return { ...updatedProject, materials };
            },
          );
          setNotices((current) => ({
            ...current,
            [target]: `${materialMeta[target].label} generated and saved.`,
          }));
          void queryClient.invalidateQueries({
            queryKey: deliveryKeys.projects(),
            exact: true,
          });
        })
        .catch((error) => {
          setNotices((current) => ({
            ...current,
            [target]: errorMessage(
              error,
              `${materialMeta[target].label} was generated, but the page could not refresh.`,
            ),
          }));
        })
        .finally(() => {
          setSyncing((current) => ({ ...current, [target]: false }));
        });
    },
    [project.id, queryClient],
  );

  async function generate() {
    const target = active;
    setNotices((current) => ({ ...current, [target]: "" }));
    try {
      const payload = await generateMaterial.mutateAsync(target);
      handleActiveJob(target, payload.job.id);
    } catch (error) {
      setNotices((current) => ({
        ...current,
        [target]: errorMessage(error, "Material generation failed."),
      }));
    }
  }

  async function exportMaterial() {
    setExporting(true);
    setNotices((current) => ({ ...current, [active]: "" }));
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
      setNotices((current) => ({
        ...current,
        [active]: errorMessage(error, "Material export failed."),
      }));
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      {deliveryMaterialKeys.map((target) => (
        <MaterialJobObserver
          key={target}
          projectId={project.id}
          target={target}
          trackedJobId={activeJobIds[target]}
          onActive={handleActiveJob}
          onTerminal={handleTerminalJob}
        />
      ))}
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
            const generating =
              Boolean(activeJobIds[key]) || Boolean(syncing[key]);
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
                {generating ? (
                  <Badge variant="gold">Generating</Badge>
                ) : ready ? (
                  <Badge variant="teal">Ready</Badge>
                ) : null}
              </button>
            );
          })}
        </div>

        <p className="text-sm text-muted-foreground">{meta.description}</p>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="gold"
            disabled={
              generateMaterial.isPending ||
              Boolean(activeJobId) ||
              Boolean(syncing[active])
            }
            onClick={() => void generate()}
          >
            {generateMaterial.isPending ||
            Boolean(activeJobId) ||
            syncing[active] ? (
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
    </>
  );
}

function MaterialJobObserver({
  projectId,
  target,
  trackedJobId,
  onActive,
  onTerminal,
}: {
  projectId: string;
  target: DeliveryMaterialKey;
  trackedJobId?: string;
  onActive: (target: DeliveryMaterialKey, jobId: string) => void;
  onTerminal: (target: DeliveryMaterialKey, job: GenerationJob) => void;
}) {
  const jobQuery = useLatestGenerationJobQuery({
    jobType: "delivery_material",
    resourceId: projectId,
    target,
    enabled: true,
  });

  useEffect(() => {
    const job = jobQuery.data;
    if (!job || !isDeliveryMaterialKey(job.target) || job.target !== target) return;
    if (job.status === "Queued" || job.status === "Running") {
      onActive(target, job.id);
      return;
    }
    if (trackedJobId === job.id) onTerminal(target, job);
  }, [jobQuery.data, onActive, onTerminal, target, trackedJobId]);

  return null;
}
