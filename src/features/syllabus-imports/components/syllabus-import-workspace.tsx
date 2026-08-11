"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  RotateCcw,
  Sparkles,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CommercialSetup } from "@/features/training-packages/components/commercial-setup";
import {
  defaultPricingInputs,
  getTrainerById,
  trainerCatalog,
  type PricingInputs,
} from "@/features/training-packages";
import { useClientsQuery } from "@/features/clients/queries";
import {
  isActiveGenerationJob,
  type GenerationJob,
} from "@/features/generation-jobs/domain/types";
import {
  setGenerationJobQueryData,
  useLatestGenerationJobQuery,
} from "@/features/generation-jobs/queries";
import { requestJson } from "@/lib/api-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import {
  defaultSyllabusMimeType,
  isSupportedSyllabusFileName,
  syllabusFileAccept,
} from "../domain/file-types";
import type {
  SyllabusImportCorrections,
  SyllabusProposalImport,
} from "../domain/types";
import {
  setSyllabusImportQueryData,
  syllabusImportKeys,
  useSyllabusImportQuery,
} from "../queries";

const blankPricing: PricingInputs = {
  ...defaultPricingInputs,
  professionalFee: 0,
  numberOfParticipants: 0,
};

const emptyCorrections: SyllabusImportCorrections = {
  clientId: null,
  clientName: "",
  trainerId: "",
  secondTrainerId: "",
};

export function SyllabusImportWorkspace({
  initialImportId = "",
}: {
  initialImportId?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clientsQuery = useClientsQuery();
  const [importId, setImportId] = useState(initialImportId);
  const importQuery = useSyllabusImportQuery(importId);
  const jobQuery = useLatestGenerationJobQuery({
    jobType: "syllabus_proposal",
    resourceId: importId,
    enabled: Boolean(importId),
  });
  const [file, setFile] = useState<File | null>(null);
  const [pricing, setPricing] = useState<PricingInputs>(blankPricing);
  const [corrections, setCorrections] =
    useState<SyllabusImportCorrections>(emptyCorrections);
  const [activeJobId, setActiveJobId] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const loadedImport = useRef("");

  const command = useMutation({
    mutationFn: ({ url, init }: { url: string; init?: RequestInit }) =>
      requestJson<{ job: GenerationJob }>(url, init),
    onSuccess(payload) {
      if (payload.job) setGenerationJobQueryData(queryClient, payload.job);
    },
  });

  const currentImport = importQuery.data;
  const queryError = importQuery.error ?? jobQuery.error;
  const visibleError =
    error ||
    (queryError instanceof Error
      ? queryError.message
      : queryError
        ? "The syllabus import status could not be loaded."
        : "");
  const needsInput = currentImport?.status === "Needs Input";
  const canRetry = Boolean(
    importId &&
      currentImport &&
      ["Uploaded", "Failed"].includes(currentImport.status) &&
      !isActiveGenerationJob(jobQuery.data),
  );
  const detectedTrainerNames = useMemo(
    () => currentImport?.mapping?.trainerNames.join(", ") || "None detected",
    [currentImport?.mapping?.trainerNames],
  );

  useEffect(() => {
    if (!currentImport || loadedImport.current === currentImport.id) return;
    loadedImport.current = currentImport.id;
    setPricing(currentImport.pricingInputs);
    setCorrections(currentImport.corrections);
    if (currentImport.status === "Failed") {
      setError(currentImport.errorMessage || "Syllabus proposal generation failed.");
    }
  }, [currentImport]);

  useEffect(() => {
    const job = jobQuery.data;
    if (!job) return;
    if (!activeJobId && isActiveGenerationJob(job)) {
      setActiveJobId(job.id);
      setBusy("Reading the syllabus and generating the proposal...");
      return;
    }
    if (job.id !== activeJobId) return;
    if (job.status === "Failed") {
      setActiveJobId("");
      setBusy("");
      setError(job.errorMessage || "Syllabus proposal generation failed.");
      void importQuery.refetch();
      return;
    }
    if (job.status !== "Completed") return;
    setActiveJobId("");
    setBusy("");
    void importQuery.refetch();
  }, [activeJobId, importQuery, jobQuery.data]);

  useEffect(() => {
    if (currentImport?.status === "Completed" && currentImport.packageId) {
      void queryClient.invalidateQueries({ queryKey: ["training-packages"] });
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
    }
  }, [currentImport, queryClient]);

  useEffect(() => {
    if (!currentImport) return;
    void queryClient.invalidateQueries({ queryKey: syllabusImportKeys.list() });
  }, [currentImport, queryClient]);

  async function startGeneration(id: string) {
    const payload = await command.mutateAsync({
      url: `/api/syllabus-imports/${id}/generate`,
      init: { method: "POST" },
    });
    setActiveJobId(payload.job.id);
    setBusy("Reading the syllabus and generating the proposal...");
  }

  async function generate() {
    setError("");
    if (!file) return setError("Choose a syllabus document first.");
    if (!isSupportedSyllabusFileName(file.name)) {
      return setError("Choose a DOCX, PPTX, or text-based PDF syllabus file.");
    }
    if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
      return setError(
        "The syllabus must be a non-empty DOCX, PPTX, or PDF file no larger than 10 MB.",
      );
    }
    if (pricing.professionalFee <= 0) {
      return setError("Enter a professional fee greater than zero.");
    }

    setBusy("Uploading syllabus...");
    let createdId = "";
    try {
      const created = await requestJson<{
        import: SyllabusProposalImport;
        path: string;
        token: string;
      }>("/api/syllabus-imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          pricingInputs: pricing,
        }),
      });
      createdId = created.import.id;
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase browser configuration is missing.");
      const upload = await supabase.storage
        .from("syllabus-proposal-inputs")
        .uploadToSignedUrl(created.path, created.token, file, {
          contentType:
            file.type || defaultSyllabusMimeType(file.name),
        });
      if (upload.error) throw upload.error;

      setImportId(createdId);
      setSyllabusImportQueryData(queryClient, created.import);
      await startGeneration(createdId);
      router.replace(`/packages/from-syllabus/${createdId}`);
    } catch (caught) {
      if (createdId) {
        await fetch(`/api/syllabus-imports/${createdId}`, { method: "DELETE" }).catch(
          () => undefined,
        );
      }
      setBusy("");
      setError(caught instanceof Error ? caught.message : "The syllabus could not be uploaded.");
    }
  }

  async function continueGeneration() {
    if (!currentImport) return;
    setError("");
    if (currentImport.missingFields.includes("client") && !corrections.clientName.trim()) {
      return setError("Select or enter the client name.");
    }
    if (currentImport.missingFields.includes("trainer") && !getTrainerById(corrections.trainerId)) {
      return setError("Select an approved DG Academy trainer.");
    }
    if (
      currentImport.missingFields.includes("participants") &&
      pricing.numberOfParticipants <= 0
    ) {
      return setError("Enter a participant count greater than zero.");
    }
    setBusy("Saving the missing information...");
    try {
      const payload = await requestJson<{ import: SyllabusProposalImport }>(
        `/api/syllabus-imports/${currentImport.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...corrections,
            numberOfParticipants: currentImport.missingFields.includes("participants")
              ? pricing.numberOfParticipants
              : undefined,
          }),
        },
      );
      setSyllabusImportQueryData(queryClient, payload.import);
      await startGeneration(currentImport.id);
    } catch (caught) {
      setBusy("");
      setError(caught instanceof Error ? caught.message : "Generation could not continue.");
    }
  }

  if (importId && importQuery.isPending) {
    return <PageLoadingSkeleton label="Loading syllabus proposal import" />;
  }

  return (
    <div className="space-y-5">
      <div className="page-heading space-y-4">
        <Button asChild variant="ghost" size="sm" className="w-fit px-0 hover:bg-transparent">
          <Link href="/packages/from-syllabus">
            <ArrowLeft className="h-4 w-4" />Syllabus imports
          </Link>
        </Button>
        <div>
          <div className="page-eyebrow">Training production</div>
          <h1 className="page-title">
            {currentImport ? currentImport.originalName : "New proposal from syllabus"}
          </h1>
          <p className="page-description">
            {currentImport
              ? "Review this import's progress and provide information only when generation needs it."
              : "Upload an external syllabus and convert its training content into the standard DG Academy proposal."}
          </p>
        </div>
      </div>

      {visibleError ? (
        <div className="flex items-start gap-3 rounded-md border border-destructive/35 bg-destructive/10 p-4 text-sm font-medium text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{visibleError}</span>
        </div>
      ) : null}

      {busy ? (
        <div className="flex items-center gap-3 rounded-md border border-teal-700/25 bg-teal-50 p-4 text-sm font-medium text-teal-950">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{busy} You can leave this page while the background job continues.</span>
        </div>
      ) : null}

      {currentImport?.status === "Completed" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-teal-700" />Proposal ready
            </CardTitle>
            <CardDescription>
              Generation is complete and the result is available in Training Packages.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {currentImport.packageId ? (
              <Button asChild>
                <Link href={`/packages/${currentImport.packageId}`}>
                  Open saved package<ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/packages/from-syllabus/new">New import</Link>
            </Button>
          </CardContent>
        </Card>
      ) : needsInput && currentImport ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              Confirm missing information
            </CardTitle>
            <CardDescription>
              The syllabus was read successfully. Confirm only the information that could not be matched safely.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {currentImport.missingFields.includes("client") ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Existing client">
                  <Select
                    value={corrections.clientId ?? ""}
                    onChange={(event) => {
                      const client = clientsQuery.data?.find(
                        (item) => item.id === event.target.value,
                      );
                      setCorrections((current) => ({
                        ...current,
                        clientId: client?.id ?? null,
                        clientName: client?.name ?? "",
                      }));
                    }}
                  >
                    <option value="">New client</option>
                    {(clientsQuery.data ?? []).map((client) => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Client name">
                  <Input
                    value={corrections.clientName}
                    placeholder="Enter the client company"
                    onChange={(event) =>
                      setCorrections((current) => ({
                        ...current,
                        clientId: null,
                        clientName: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
            ) : null}

            {currentImport.missingFields.includes("trainer") ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Trainer names detected in the syllabus: <span className="font-medium text-foreground">{detectedTrainerNames}</span>
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Trainer">
                    <Select
                      value={corrections.trainerId}
                      onChange={(event) =>
                        setCorrections((current) => ({
                          ...current,
                          trainerId: event.target.value,
                          secondTrainerId:
                            current.secondTrainerId === event.target.value
                              ? ""
                              : current.secondTrainerId,
                        }))
                      }
                    >
                      <option value="">Select a trainer</option>
                      {trainerCatalog.map((trainer) => (
                        <option key={trainer.id} value={trainer.id}>{trainer.name}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Second trainer (optional)">
                    <Select
                      value={corrections.secondTrainerId}
                      onChange={(event) =>
                        setCorrections((current) => ({
                          ...current,
                          secondTrainerId: event.target.value,
                        }))
                      }
                    >
                      <option value="">No second trainer</option>
                      {trainerCatalog
                        .filter((trainer) => trainer.id !== corrections.trainerId)
                        .map((trainer) => (
                          <option key={trainer.id} value={trainer.id}>{trainer.name}</option>
                        ))}
                    </Select>
                  </Field>
                </div>
              </div>
            ) : null}

            {currentImport.missingFields.includes("participants") ? (
              <Field label="Participants">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={
                    pricing.numberOfParticipants > 0
                      ? String(pricing.numberOfParticipants)
                      : ""
                  }
                  placeholder="Enter participant count"
                  onChange={(event) => {
                    const next = event.target.value;
                    if (!/^\d*$/.test(next)) return;
                    setPricing((current) => ({
                      ...current,
                      numberOfParticipants: next ? Number(next) : 0,
                    }));
                  }}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </Field>
            ) : null}

            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button onClick={() => void continueGeneration()} disabled={Boolean(busy)}>
                <Sparkles className="h-4 w-4" />Continue generation
              </Button>
              <Button asChild variant="outline">
                <Link href="/packages/from-syllabus">Back to imports</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : currentImport ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentImport.status === "Failed" ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
              )}
              {currentImport.status === "Failed"
                ? "Generation failed"
                : currentImport.status === "Finalizing"
                  ? "Finalizing package"
                  : "Generation in progress"}
            </CardTitle>
            <CardDescription>
              {currentImport.status === "Failed"
                ? currentImport.errorMessage || "The proposal could not be generated."
                : "The background job continues even when you leave this page."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 border-y border-border py-4 text-sm sm:grid-cols-2">
              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">Source</div>
                <div className="mt-1 font-medium text-foreground">{currentImport.originalName}</div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">Status</div>
                <div className="mt-1 font-medium text-foreground">{currentImport.status}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canRetry ? (
                <Button
                  onClick={() => {
                    setError("");
                    void startGeneration(importId).catch((caught) => {
                      setBusy("");
                      setError(
                        caught instanceof Error
                          ? caught.message
                          : "Generation could not restart.",
                      );
                    });
                  }}
                  disabled={Boolean(busy)}
                >
                  <RotateCcw className="h-4 w-4" />Retry generation
                </Button>
              ) : null}
              <Button asChild variant="outline">
                <Link href="/packages/from-syllabus">Back to imports</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : importId ? (
        <Card>
          <CardHeader>
            <CardTitle>Import unavailable</CardTitle>
            <CardDescription>
              This syllabus import could not be found or loaded.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/packages/from-syllabus">Back to imports</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-teal-700" />
                Source syllabus
              </CardTitle>
              <CardDescription>
                One English DOCX, PPTX, or text-based PDF file, up to 10 MB. Readable text, lists, tables, and PowerPoint speaker notes are analyzed; images are ignored.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-muted/35 px-5 py-8 text-center transition-colors hover:bg-muted/60">
                {file ? (
                  <CheckCircle2 className="h-7 w-7 text-teal-700" />
                ) : (
                  <Upload className="h-7 w-7 text-muted-foreground" />
                )}
                <span className="text-sm font-semibold text-foreground">
                  {file?.name ?? "Choose syllabus document"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Click to browse"}
                </span>
                <input
                  type="file"
                  accept={syllabusFileAccept}
                  className="sr-only"
                  disabled={Boolean(busy)}
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </CardContent>
          </Card>

          <CommercialSetup
            value={pricing}
            onChange={setPricing}
            description="Enter the professional fee and VAT wording for the proposal."
            showParticipants={false}
          />

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-5">
            <Button onClick={() => void generate()} disabled={Boolean(busy)}>
              <Sparkles className="h-4 w-4" />Generate proposal
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
