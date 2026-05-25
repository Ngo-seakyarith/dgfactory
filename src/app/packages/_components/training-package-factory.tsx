"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Clipboard,
  Calculator,
  FileDown,
  FileText,
  Loader2,
  Mail,
  MessageSquareText,
  Save,
  Send,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PilotFeedbackButton } from "@/app/pilot/_components/pilot-feedback-button";
import {
  buildPackageFromParts,
  fullPackageToMarkdown,
  outputToText,
  packageOutputSections,
  type PackageOutputKey,
  type TrainingPackage,
  type TrainingPackageInput,
  type TrainingPackageOutputs,
} from "@/lib/training-packages";
import type { ExportFormat, ExportTarget } from "@/lib/export-package";
import { hasAppAccess, type UserRole } from "@/lib/auth";
import type { KnowledgeSourceNote } from "@/lib/knowledge";
import {
  outputEvaluationTypes,
  reviewerTypes,
  type EvaluateOutputResult,
  type OutputEvaluation,
  type OutputEvaluationType,
  type PromptImprovementSuggestion,
  type ReviewerType,
} from "@/lib/evaluations";
import {
  applyPricingPreset,
  buildCommercialProposalSection,
  calculatePricing,
  clientPricingParagraph,
  defaultPricingInputs,
  formatMoney,
  formatPercent,
  internalProfitabilityNote,
  normalizePricingInputs,
  pricingPresets,
  type PricingInputs,
  type PricingTemplateMode,
} from "@/lib/pricing";

type QaReviewOutput = {
  score: number;
  strengths: string[];
  weaknesses: string[];
  missingSections: string[];
  risks: string[];
  recommendedImprovements: string[];
  clientReadiness: "low" | "medium" | "high";
};

type OutputTabKey = PackageOutputKey | "qaReview" | "feedback";
type RegeneratablePackageSection =
  | "syllabus"
  | "proposal";

type WorkflowStepName =
  | "Syllabus"
  | "Proposal"
  | "Commercial";

type WorkflowTraceItem = {
  step: string;
  agent: string;
  mode: "openai";
  model: string;
  summary: string;
};

const workflowSteps: WorkflowStepName[] = [
  "Syllabus",
  "Proposal",
  "Commercial",
];

const defaultInput: TrainingPackageInput = {
  courseTitle: "",
  audience: "",
  duration: "",
  client: "",
  promise: "",
  context: "",
  tone: "Executive, practical, commercially sharp",
};

export function PackageForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<TrainingPackageInput>(defaultInput);
  const [pricingInputs, setPricingInputs] =
    useState<PricingInputs>(defaultPricingInputs);
  const [currentPackage, setCurrentPackage] = useState<TrainingPackage | null>(null);
  const [useMultiAgent, setUseMultiAgent] = useState(true);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workflowTrace, setWorkflowTrace] = useState<WorkflowTraceItem[]>([]);
  const [workflowFailedStep, setWorkflowFailedStep] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const prefill = {
      courseTitle: searchParams.get("courseTitle") ?? "",
      audience: searchParams.get("audience") ?? "",
      duration: searchParams.get("duration") ?? "",
      client: searchParams.get("client") ?? "",
      promise: searchParams.get("promise") ?? "",
      context: searchParams.get("context") ?? "",
      tone: searchParams.get("tone") ?? "",
    };

    if (Object.values(prefill).some(Boolean)) {
      setForm((current) => ({
        ...current,
        courseTitle: prefill.courseTitle || current.courseTitle,
        audience: prefill.audience || current.audience,
        duration: prefill.duration || current.duration,
        client: prefill.client || current.client,
        promise: prefill.promise || current.promise,
        context: prefill.context || current.context,
        tone: prefill.tone || current.tone,
      }));
      setNotice("Prefilled from Adaptive Growth offer variant.");
    }
  }, [searchParams]);

  function updateField<K extends keyof TrainingPackageInput>(
    key: K,
    value: TrainingPackageInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updatePricing(nextInputs: PricingInputs) {
    const normalizedInputs = normalizePricingInputs(nextInputs);
    const pricingOutputs = calculatePricing(normalizedInputs);

    setPricingInputs(normalizedInputs);
    setCurrentPackage((current) =>
      current
        ? {
            ...current,
            pricingInputs: normalizedInputs,
            pricingOutputs,
            commercialProposal: buildCommercialProposalSection({
              title: current.title,
              client: current.client,
              inputs: normalizedInputs,
              outputs: pricingOutputs,
            }),
            updatedAt: new Date().toISOString(),
          }
        : current,
    );
  }

  async function generatePackage() {
    setError("");
    setNotice("");
    setWorkflowTrace([]);
    setWorkflowFailedStep("");
    setIsGenerating(true);

    try {
      const response = await fetch(useMultiAgent ? "/api/workflows/generate-package" : "/api/generate-package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, pricingInputs, useMultiAgent }),
      });

      const payload = (await response.json()) as {
        workflowId?: string | null;
        outputs?: TrainingPackageOutputs;
        syllabus?: string;
        proposal?: string;
        commercialProposal?: string;
        traceSummary?: WorkflowTraceItem[];
        knowledgeUsed?: KnowledgeSourceNote[];
        state?: { currentStep?: string; error?: string };
        qaScore?: number;
        mode?: "openai";
        notice?: string;
        error?: string;
      };
      const outputs =
        payload.outputs ??
        (payload.syllabus && payload.proposal
          ? {
              syllabus: payload.syllabus,
              proposal: payload.proposal,
              commercialProposal: payload.commercialProposal ?? "",
            }
          : undefined);

      if (!response.ok || !outputs) {
        setWorkflowId(payload.workflowId ?? null);
        setWorkflowFailedStep(payload.state?.currentStep ?? "");
        throw new Error(payload.error ?? "Generation failed.");
      }

      const pkg = buildPackageFromParts({
        input: form,
        outputs,
        generationMode: "openai",
        pricingInputs,
        knowledgeUsed: payload.knowledgeUsed ?? [],
      });

      setCurrentPackage(pkg);
      setWorkflowId(payload.workflowId ?? null);
      setWorkflowTrace(payload.traceSummary ?? []);
      setNotice(
        payload.notice ??
          (useMultiAgent
            ? `Multi-agent workflow completed${payload.qaScore ? ` with QA score ${payload.qaScore}/100` : ""}.`
            : "Generated with OpenAI."),
      );
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Generation failed.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function savePackage() {
    if (!currentPackage) {
      return;
    }

    setIsSaving(true);
    setError("");
    setNotice("");

    const packageToSave = {
      ...currentPackage,
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch("/api/training-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(packageToSave),
      });
      const payload = (await response.json()) as {
        package?: TrainingPackage;
        storage?: "supabase";
        error?: string;
      };

      if (!response.ok || !payload.package) {
        throw new Error(payload.error ?? "Database save failed.");
      }

      setCurrentPackage(payload.package);
      setNotice("Saved in Supabase.");
      router.push(`/packages/${payload.package.id}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Database save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="space-y-5">
        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>Training Idea</CardTitle>
          <CardDescription>
            Enter the commercial brief. The factory turns it into a sellable DG
            Academy package.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Course title">
            <Input
              value={form.courseTitle}
              onChange={(event) => updateField("courseTitle", event.target.value)}
              placeholder="AI Leadership Sprint for Bank Executives"
            />
          </Field>
          <Field label="Target learners">
            <Input
              value={form.audience}
              onChange={(event) => updateField("audience", event.target.value)}
              placeholder="Senior managers, innovation leads, department heads"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Duration">
              <Input
                value={form.duration}
                onChange={(event) => updateField("duration", event.target.value)}
                placeholder="1 day, 2 days, 6 weeks"
              />
            </Field>
            <Field label="Client or market">
              <Input
                value={form.client}
                onChange={(event) => updateField("client", event.target.value)}
                placeholder="Cambodian banks, universities, hospitality groups"
              />
            </Field>
          </div>
          <Field label="Program promise">
            <Textarea
              value={form.promise}
              onChange={(event) => updateField("promise", event.target.value)}
              placeholder="Help leaders identify practical AI use cases and leave with a 30-day implementation plan."
            />
          </Field>
          <Field label="Context and examples">
            <Textarea
              value={form.context}
              onChange={(event) => updateField("context", event.target.value)}
              placeholder="Include local enterprise examples, workflow redesign, governance, and customer-facing AI use cases."
            />
          </Field>
          <Field label="Tone">
            <Select
              value={form.tone}
              onChange={(event) => updateField("tone", event.target.value)}
            >
              <option>Executive, practical, commercially sharp</option>
              <option>Premium, strategic, boardroom-ready</option>
              <option>Warm, accessible, confidence-building</option>
              <option>Direct, operational, implementation-focused</option>
            </Select>
          </Field>

          <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-[#07111f]/55 p-3">
            <input
              type="checkbox"
              checked={useMultiAgent}
              onChange={(event) => setUseMultiAgent(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-[#07111f]"
            />
            <span>
              <span className="block text-sm font-semibold text-white">
                Use multi-agent generation
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                Chief Brain plans, specialists draft the syllabus, proposal,
                and commercial pricing narrative.
              </span>
            </span>
          </label>

          {error ? (
            <div className="rounded-lg border border-red-300/25 bg-red-400/10 p-3 text-sm leading-6 text-red-100">
              {error}
              {workflowFailedStep ? (
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generatePackage}
                  >
                    Retry workflow
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
          {notice ? (
            <div className="rounded-lg border border-teal-300/25 bg-teal-300/10 p-3 text-sm leading-6 text-teal-50">
              {notice}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="gold"
              size="lg"
              className="w-full sm:w-auto"
              onClick={generatePackage}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate Training Package
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
              onClick={savePackage}
              disabled={!currentPackage || isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Package
            </Button>
          </div>
        </CardContent>
        </Card>

        <CommercialSetup
          value={pricingInputs}
          onChange={updatePricing}
          title="Commercial Setup"
          description="Set pricing assumptions before generation. Numbers are calculated by code, not invented by AI."
        />
      </div>

      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div>
            <CardTitle>Generated Package</CardTitle>
            <CardDescription>
              Outputs are organized into tabs with copy controls for fast client
              packaging.
            </CardDescription>
          </div>
          {currentPackage?.generationMode ? <Badge variant="teal">OpenAI</Badge> : null}
        </CardHeader>
        <CardContent>
          {useMultiAgent || workflowTrace.length > 0 || workflowFailedStep ? (
            <WorkflowProgress
              isGenerating={isGenerating}
              trace={workflowTrace}
              failedStep={workflowFailedStep}
              workflowId={workflowId}
            />
          ) : null}
          {currentPackage ? (
            <OutputTabs pkg={currentPackage} onPackageUpdate={setCurrentPackage} />
          ) : (
            <EmptyState
              title="Your production package will appear here."
              detail="Generate once, review the tabs, then save the package locally or into Supabase when configured."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const TrainingPackageFactory = PackageForm;

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-white">{label}</span>
      {children}
    </label>
  );
}

function WorkflowProgress({
  isGenerating,
  trace,
  failedStep,
  workflowId,
}: {
  isGenerating: boolean;
  trace: WorkflowTraceItem[];
  failedStep: string;
  workflowId: string | null;
}) {
  const visibleStepNames = new Set<string>(workflowSteps);
  const visibleTrace = trace.filter((item) => visibleStepNames.has(item.step));
  const completedSteps = new Set(visibleTrace.map((item) => item.step));

  return (
    <div className="mb-5 rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-white">
            Multi-agent workflow
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {workflowId ? `Workflow ${workflowId}` : "Workflow will start on generation."}
          </p>
        </div>
        <Badge variant={failedStep ? "outline" : isGenerating ? "gold" : trace.length ? "teal" : "outline"}>
          {failedStep ? `Failed at ${failedStep}` : isGenerating ? "Running" : trace.length ? "Completed" : "Ready"}
        </Badge>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {workflowSteps.map((step, index) => {
          const done = completedSteps.has(step);
          const failed = failedStep === step;
          return (
            <div
              key={step}
              className={`rounded-lg border p-3 text-sm ${
                failed
                  ? "border-red-300/30 bg-red-400/10 text-red-100"
                  : done
                    ? "border-teal-300/25 bg-teal-300/10 text-teal-50"
                    : "border-white/10 bg-white/[0.03] text-muted-foreground"
              }`}
            >
              <div className="text-xs font-mono opacity-70">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="mt-1 font-medium">{step}</div>
            </div>
          );
        })}
      </div>
      {visibleTrace.length ? (
        <div className="mt-4 space-y-2">
          {visibleTrace.slice(-2).map((item) => (
            <div
              key={`${item.step}-${item.agent}`}
              className="rounded-lg border border-white/10 bg-[#07111f]/60 p-3 text-xs leading-5 text-muted-foreground"
            >
              <span className="font-semibold text-white">{item.step}</span> by {item.agent}: {item.summary}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

export function SaveButton({
  disabled,
  isSaving,
  onSave,
}: {
  disabled?: boolean;
  isSaving?: boolean;
  onSave: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full sm:w-auto"
      onClick={onSave}
      disabled={disabled || isSaving}
    >
      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      Save Package
    </Button>
  );
}

export function QualityChecklist({
  checklist,
}: {
  checklist: TrainingPackage["qualityChecklist"];
}) {
  return (
    <div className="grid gap-2">
      {checklist.map((item, index) => (
        <div
          key={`${item.category}-${index}`}
          className="rounded-lg border border-white/10 bg-[#07111f]/55 p-3"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-white">{item.category}</span>
            <span className={item.status === "ready" ? "text-xs text-teal-100" : "text-xs text-[#f7d889]"}>
              {item.status === "ready" ? "Ready" : "Review"}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.item}</p>
        </div>
      ))}
    </div>
  );
}

export function CommercialSetup({
  value,
  onChange,
  title = "Commercial Setup",
  description = "Pricing assumptions for the client offer and internal margin view.",
}: {
  value: PricingInputs;
  onChange: (value: PricingInputs) => void;
  title?: string;
  description?: string;
}) {
  const pricingOutputs = calculatePricing(value);

  function updateNumber(key: keyof PricingInputs, rawValue: string) {
    onChange(
      normalizePricingInputs({
        ...value,
        [key]: rawValue === "" ? 0 : Number(rawValue),
        pricingTemplate: "Custom",
      }),
    );
  }

  function updateText(key: keyof PricingInputs, rawValue: string | boolean) {
    const nextValue =
      key === "pricingTemplate" ? (rawValue as PricingTemplateMode) : rawValue;
    onChange(
      normalizePricingInputs({
        ...value,
        [key]: nextValue,
        pricingTemplate:
          key === "pricingTemplate" ? (nextValue as PricingTemplateMode) : "Custom",
      }),
    );
  }

  function applyPreset(preset: PricingTemplateMode) {
    onChange(applyPricingPreset(value, preset));
  }

  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-teal-100" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pricing template">
            <Select
              value={value.pricingTemplate}
              onChange={(event) => applyPreset(event.target.value as PricingTemplateMode)}
            >
              {Object.keys(pricingPresets).map((preset) => (
                <option key={preset}>{preset}</option>
              ))}
            </Select>
          </Field>
          <Field label="Currency">
            <Input
              value={value.currency}
              onChange={(event) => updateText("currency", event.target.value)}
              placeholder="USD"
            />
          </Field>
          <Field label="Training format">
            <Select
              value={value.trainingFormat}
              onChange={(event) => updateText("trainingFormat", event.target.value)}
            >
              <option>In-house</option>
              <option>Public workshop</option>
              <option>Online</option>
              <option>Hybrid</option>
            </Select>
          </Field>
          <NumberField label="Participants" value={value.numberOfParticipants} onChange={(next) => updateNumber("numberOfParticipants", next)} />
          <NumberField label="Training days" value={value.numberOfTrainingDays} onChange={(next) => updateNumber("numberOfTrainingDays", next)} />
          <NumberField label="Trainers" value={value.numberOfTrainers} onChange={(next) => updateNumber("numberOfTrainers", next)} />
          <NumberField label="Trainer day rate" value={value.trainerDayRate} onChange={(next) => updateNumber("trainerDayRate", next)} />
          <NumberField label="Venue cost" value={value.venueCost} onChange={(next) => updateNumber("venueCost", next)} />
          <NumberField label="F&B cost per person" value={value.foodAndBeverageCostPerPerson} onChange={(next) => updateNumber("foodAndBeverageCostPerPerson", next)} />
          <NumberField label="Material cost per person" value={value.materialCostPerPerson} onChange={(next) => updateNumber("materialCostPerPerson", next)} />
          <NumberField label="Admin cost" value={value.adminCost} onChange={(next) => updateNumber("adminCost", next)} />
          <NumberField label="Marketing cost" value={value.marketingCost} onChange={(next) => updateNumber("marketingCost", next)} />
          <NumberField label="Travel cost" value={value.travelCost} onChange={(next) => updateNumber("travelCost", next)} />
          <NumberField label="Other cost" value={value.otherCost} onChange={(next) => updateNumber("otherCost", next)} />
          <NumberField label="Target margin %" value={value.targetProfitMarginPercent} onChange={(next) => updateNumber("targetProfitMarginPercent", next)} />
          <NumberField label="Discount %" value={value.discountPercent} onChange={(next) => updateNumber("discountPercent", next)} />
          <NumberField label="Tax %" value={value.taxPercent} onChange={(next) => updateNumber("taxPercent", next)} />
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-[#07111f]/55 p-3">
          <input
            type="checkbox"
            checked={value.fundingNoteEnabled}
            onChange={(event) => updateText("fundingNoteEnabled", event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-white/20 bg-[#07111f]"
          />
          <span>
            <span className="block text-sm font-semibold text-white">
              Add SDF / HRD-style funding note
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              Use when the client may need funding documentation or eligibility language.
            </span>
          </span>
        </label>

        {value.fundingNoteEnabled ? (
          <Field label="Funding note text">
            <Textarea
              value={value.fundingNoteText}
              onChange={(event) => updateText("fundingNoteText", event.target.value)}
            />
          </Field>
        ) : null}

        {pricingOutputs.warnings.length > 0 ? (
          <div className="rounded-lg border border-red-300/25 bg-red-400/10 p-3 text-sm leading-6 text-red-100">
            {pricingOutputs.warnings.join(" ")}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <MiniMetric
            label="Recommended price"
            value={formatMoney(pricingOutputs.finalPrice, value.currency)}
          />
          <MiniMetric
            label="Per participant"
            value={formatMoney(pricingOutputs.pricePerParticipant, value.currency)}
          />
          <MiniMetric
            label="Est. margin"
            value={formatPercent(pricingOutputs.estimatedProfitMargin)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-3">
      <div className="text-xs text-teal-50/75">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function PricingPanel({
  pkg,
  canViewInternal,
}: {
  pkg: TrainingPackage;
  canViewInternal: boolean;
}) {
  const inputs = pkg.pricingInputs;
  const outputs = pkg.pricingOutputs;
  const costRows = [
    ["Trainer cost", outputs.trainerCost],
    ["Venue cost", inputs.venueCost],
    ["Participant variable cost", outputs.participantVariableCost],
    ["Admin cost", inputs.adminCost],
    ["Marketing cost", inputs.marketingCost],
    ["Travel cost", inputs.travelCost],
    ["Other cost", inputs.otherCost],
  ];

  return (
    <div className="max-h-[34rem] overflow-auto p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <MiniMetric label="Final recommended price" value={formatMoney(outputs.finalPrice, inputs.currency)} />
        <MiniMetric label="Price per participant" value={formatMoney(outputs.pricePerParticipant, inputs.currency)} />
        {canViewInternal ? (
          <>
            <MiniMetric label="Total direct cost" value={formatMoney(outputs.totalDirectCost, inputs.currency)} />
            <MiniMetric label="Estimated profit" value={formatMoney(outputs.estimatedProfit, inputs.currency)} />
            <MiniMetric label="Estimated profit margin" value={formatPercent(outputs.estimatedProfitMargin)} />
          </>
        ) : null}
        <MiniMetric label="Discount / Tax" value={`${formatMoney(outputs.discountAmount, inputs.currency)} / ${formatMoney(outputs.taxAmount, inputs.currency)}`} />
      </div>

      {canViewInternal ? (
      <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.06] text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Cost item</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {costRows.map(([label, value]) => (
              <tr key={label} className="border-t border-white/10">
                <td className="px-4 py-3 text-slate-100">{label}</td>
                <td className="px-4 py-3 text-right font-mono text-white">
                  {formatMoney(Number(value), inputs.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-4">
          <div className="text-sm font-semibold text-teal-50">
            Client-facing pricing paragraph
          </div>
          <p className="mt-2 text-sm leading-6 text-teal-50/80">
            {clientPricingParagraph(inputs, outputs)}
          </p>
        </div>
        {canViewInternal ? (
        <div className="rounded-lg border border-[#d7a842]/25 bg-[#d7a842]/10 p-4">
          <div className="text-sm font-semibold text-[#f7d889]">
            Internal-only profitability note
          </div>
          <p className="mt-2 text-sm leading-6 text-[#f7d889]/85">
            {internalProfitabilityNote(inputs, outputs)}
          </p>
        </div>
        ) : null}
      </div>
    </div>
  );
}

function qaReviewToMarkdown(review: QaReviewOutput) {
  return [
    `# QA Review`,
    "",
    `Score: ${review.score}/100`,
    `Client readiness: ${review.clientReadiness}`,
    "",
    "## Strengths",
    ...review.strengths.map((item) => `- ${item}`),
    "",
    "## Weaknesses",
    ...review.weaknesses.map((item) => `- ${item}`),
    "",
    "## Missing Sections",
    ...(review.missingSections.length
      ? review.missingSections.map((item) => `- ${item}`)
      : ["- None flagged"]),
    "",
    "## Risks",
    ...review.risks.map((item) => `- ${item}`),
    "",
    "## Recommended Improvements",
    ...review.recommendedImprovements.map((item) => `- ${item}`),
  ].join("\n");
}

function QaReviewPanel({
  review,
  notice,
  isRunning,
  onRun,
}: {
  review: QaReviewOutput | null;
  notice: string;
  isRunning: boolean;
  onRun: () => void;
}) {
  if (!review) {
    return (
      <div className="p-4">
        <div className="rounded-lg border border-dashed border-white/15 bg-[#07111f]/45 p-8 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-teal-100" />
          <div className="mt-4 text-base font-semibold text-white">
            Run a Brain Layer QA review.
          </div>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            The QA agent checks client readiness, missing sections, risks, and
            recommended improvements before export or customer handoff.
          </p>
          <Button
            type="button"
            variant="gold"
            className="mt-5"
            onClick={onRun}
            disabled={isRunning}
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Run QA Review
          </Button>
          {notice ? (
            <p className="mt-3 text-sm font-medium text-teal-50">{notice}</p>
          ) : null}
        </div>
      </div>
    );
  }

  const readinessVariant =
    review.clientReadiness === "high"
      ? "teal"
      : review.clientReadiness === "medium"
        ? "gold"
        : "outline";

  return (
    <div className="max-h-[34rem] overflow-auto p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <MiniMetric label="QA score" value={`${review.score}/100`} />
        <div className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-3">
          <div className="text-xs text-teal-50/75">Client readiness</div>
          <Badge variant={readinessVariant} className="mt-2 capitalize">
            {review.clientReadiness}
          </Badge>
        </div>
        <MiniMetric
          label="Missing sections"
          value={review.missingSections.length.toString()}
        />
      </div>
      {notice ? (
        <p className="mt-4 rounded-lg border border-teal-300/20 bg-teal-300/10 p-3 text-sm text-teal-50">
          {notice}
        </p>
      ) : null}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <QaList title="Strengths" items={review.strengths} />
        <QaList title="Weaknesses" items={review.weaknesses} />
        <QaList title="Missing sections" items={review.missingSections} empty="None flagged" />
        <QaList title="Risks" items={review.risks} />
        <div className="lg:col-span-2">
          <QaList title="Recommended improvements" items={review.recommendedImprovements} />
        </div>
      </div>
    </div>
  );
}

function QaList({
  title,
  items,
  empty = "None listed",
}: {
  title: string;
  items: string[];
  empty?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
      <div className="text-sm font-semibold text-white">{title}</div>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
        {(items.length ? items : [empty]).map((item, index) => (
          <li key={`${title}-${index}`}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

function parseMultilineList(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function FeedbackPanel({ pkg }: { pkg: TrainingPackage }) {
  const [outputType, setOutputType] =
    useState<OutputEvaluationType>("proposal");
  const [reviewerType, setReviewerType] = useState<ReviewerType>("Sopheap");
  const [score, setScore] = useState(85);
  const [feedback, setFeedback] = useState("");
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [improvementSuggestions, setImprovementSuggestions] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiEvaluation, setAiEvaluation] = useState<EvaluateOutputResult | null>(null);
  const [savedSuggestions, setSavedSuggestions] = useState<
    PromptImprovementSuggestion[]
  >([]);
  const selectedOutputText = outputTypeText(pkg, outputType);

  async function saveFeedback() {
    setIsSaving(true);
    setNotice("");

    try {
      const response = await fetch("/api/output-evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: pkg.id,
          outputType,
          score,
          reviewerType,
          feedback,
          strengths: parseMultilineList(strengths),
          weaknesses: parseMultilineList(weaknesses),
          improvementSuggestions: parseMultilineList(improvementSuggestions),
        } satisfies Partial<OutputEvaluation>),
      });
      const payload = (await response.json()) as {
        evaluation?: OutputEvaluation;
        error?: string;
      };

      if (!response.ok || !payload.evaluation) {
        throw new Error(payload.error ?? "Feedback could not be saved.");
      }

      setNotice("Feedback saved to the quality loop.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Feedback could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function suggestImprovements() {
    setIsEvaluating(true);
    setNotice("");

    try {
      if (!selectedOutputText.trim()) {
        throw new Error("This output is empty, so it cannot be evaluated yet.");
      }

      const response = await fetch("/api/evaluate-output", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          output: selectedOutputText,
          outputType,
          targetAudience: pkg.audience,
          clientContext: [pkg.client, pkg.context].filter(Boolean).join("\n\n"),
          packageId: pkg.id,
          persist: true,
        }),
      });
      const payload = (await response.json()) as {
        evaluation?: EvaluateOutputResult;
        savedSuggestions?: PromptImprovementSuggestion[];
        mode?: "openai";
        model?: string;
        notice?: string;
        error?: string;
      };

      if (!response.ok || !payload.evaluation) {
        throw new Error(payload.error ?? "AI evaluation failed.");
      }

      setAiEvaluation(payload.evaluation);
      setSavedSuggestions(payload.savedSuggestions ?? []);
      setScore(payload.evaluation.score);
      setStrengths(payload.evaluation.strengths.join("\n"));
      setWeaknesses(payload.evaluation.weaknesses.join("\n"));
      setImprovementSuggestions(payload.evaluation.improvementSuggestions.join("\n"));
      setNotice(
        payload.notice ??
          `AI evaluation completed with ${payload.model ?? "OpenAI"}. Suggestions require human approval.`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "AI evaluation failed.");
    } finally {
      setIsEvaluating(false);
    }
  }

  return (
    <div className="max-h-[42rem] overflow-auto p-4">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <MessageSquareText className="h-4 w-4 text-teal-100" />
              Score and feedback
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Capture human review or run AI evaluation. Prompt suggestions are stored
              for approval, not applied automatically.
            </p>
          </div>
          <Field label="Output type">
            <Select
              value={outputType}
              onChange={(event) =>
                setOutputType(event.target.value as OutputEvaluationType)
              }
            >
              {outputEvaluationTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reviewer">
            <Select
              value={reviewerType}
              onChange={(event) => setReviewerType(event.target.value as ReviewerType)}
            >
              {reviewerTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Score 1-100">
            <Input
              type="number"
              min="1"
              max="100"
              value={score}
              onChange={(event) => setScore(Number(event.target.value))}
            />
          </Field>
          <Field label="Comments">
            <Textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="What did the reviewer notice?"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={saveFeedback}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Feedback
            </Button>
            <Button
              type="button"
              variant="gold"
              onClick={suggestImprovements}
              disabled={isEvaluating || !selectedOutputText.trim()}
            >
              {isEvaluating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Suggest Improvements
            </Button>
          </div>
          {notice ? (
            <p className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-3 text-sm text-teal-50">
              {notice}
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <Field label="Strengths">
            <Textarea
              value={strengths}
              onChange={(event) => setStrengths(event.target.value)}
              placeholder="One per line"
            />
          </Field>
          <Field label="Weaknesses">
            <Textarea
              value={weaknesses}
              onChange={(event) => setWeaknesses(event.target.value)}
              placeholder="One per line"
            />
          </Field>
          <Field label="Improvement suggestions">
            <Textarea
              value={improvementSuggestions}
              onChange={(event) => setImprovementSuggestions(event.target.value)}
              placeholder="One per line"
            />
          </Field>
          {aiEvaluation ? (
            <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-white">
                  AI evaluation result
                </div>
                <Badge variant={aiEvaluation.score >= 80 ? "teal" : "gold"}>
                  {aiEvaluation.score}/100
                </Badge>
              </div>
              <QaList title="Risks" items={aiEvaluation.risks} />
              {savedSuggestions.length ? (
                <div className="mt-3 space-y-2">
                  <div className="text-sm font-semibold text-white">
                    Stored prompt suggestions
                  </div>
                  {savedSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="rounded-lg border border-[#d7a842]/25 bg-[#d7a842]/10 p-3 text-sm leading-6 text-[#f7d889]"
                    >
                      {suggestion.targetAgent}: {suggestion.suggestedChange}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

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

function outputTypeText(pkg: TrainingPackage, outputType: OutputEvaluationType) {
  if (outputType === "deck") {
    return pkg.deckOutline;
  }

  if (outputType === "commercial_proposal") {
    return pkg.commercialProposal;
  }

  if (outputType === "follow_up_email") {
    return pkg.followUpEmail;
  }

  if (outputType === "full_package") {
    return fullPackageToMarkdown(pkg);
  }

  if (outputType === "delivery_report") {
    return "";
  }

  return pkg[outputType];
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
  const [shareNotice, setShareNotice] = useState("");
  const [includeInternalNotes, setIncludeInternalNotes] = useState(false);
  const [qaReview, setQaReview] = useState<QaReviewOutput | null>(null);
  const [qaNotice, setQaNotice] = useState("");
  const [isRunningQa, setIsRunningQa] = useState(false);
  const [isRegenerating, setIsRegenerating] =
    useState<RegeneratablePackageSection | "">("");
  const [regenerateNotice, setRegenerateNotice] = useState("");
  const [role, setRole] = useState<UserRole>("Pending");
  const canViewInternal = hasAppAccess(role);

  const activeSection = useMemo(
    () => sections.find((section) => section.key === activeKey)!,
    [activeKey, sections],
  );
  const fullPackage = fullPackageToMarkdown(pkg);
  const qaReviewText = qaReview ? qaReviewToMarkdown(qaReview) : "";
  const activeText = outputToText(pkg, activeSection.key as PackageOutputKey);
  const activeRegeneratableSection = regeneratableSectionForKey(activeSection.key);
  const emailHref = `mailto:?subject=${encodeURIComponent(`DG Academy Training Package: ${pkg.title}`)}&body=${encodeURIComponent(fullPackage)}`;

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session");
        const payload = (await response.json()) as { user?: { role?: UserRole } };
        if (payload.user?.role) {
          setRole(payload.user.role);
        }
      } catch {
        setRole("Pending");
      }
    }

    void loadSession();
  }, []);

  async function exportPackage(format: ExportFormat, target: ExportTarget = "full") {
    setExportNotice(`Preparing ${format.toUpperCase()} export...`);
    const response = await fetch("/api/export-package", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format,
        target,
        package: pkg,
        includeInternalNotes,
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
    {
      label: "Export Proposal PDF",
      format: "pdf",
      target: "proposal",
      icon: FileDown,
      disabled: !pkg.proposal.trim(),
    },
  ];

  async function sendToTelegramOperator() {
    await navigator.clipboard.writeText(fullPackage);
    setShareNotice(
      "Package copied. Telegram is opening @sopheaphin; paste the copied package there to send it to customers.",
    );
    window.open("https://t.me/sopheaphin", "_blank", "noopener,noreferrer");
  }

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
              label={`Copy ${activeSection.label}`}
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
            {activeSection.key === "pricing" ? (
              <>
                <CopyButton
                  value={pkg.commercialProposal}
                  label="Copy Commercial Proposal"
                />
                {canViewInternal ? (
                  <CopyButton
                    value={internalProfitabilityNote(pkg.pricingInputs, pkg.pricingOutputs)}
                    label="Copy Internal Note"
                  />
                ) : null}
              </>
            ) : null}
          </div>
        </div>
        {activeSection.key === "pricing" ? (
          <PricingPanel pkg={pkg} canViewInternal={canViewInternal} />
        ) : (
          <pre className="max-h-[34rem] overflow-auto whitespace-pre-wrap p-4 font-sans text-sm leading-7 text-slate-100">
            {activeText}
          </pre>
        )}
      </div>
      {regenerateNotice ? (
        <p className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-3 text-sm text-teal-50">
          {regenerateNotice}
        </p>
      ) : null}

      <KnowledgeUsedPanel knowledgeUsed={pkg.knowledgeUsed ?? []} />

      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-4">
          <div>
            <div className="text-sm font-semibold text-teal-50">Customer handoff</div>
            <p className="mt-1 text-xs leading-5 text-teal-50/75">
              Send the full package by email, download a text file, or open Telegram to @sopheaphin.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild type="button" variant="outline" size="sm">
              <a href={emailHref}>
                <Mail className="h-4 w-4" />
                Email Customer
              </a>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => exportPackage("txt", "full")}>
              <FileDown className="h-4 w-4" />
              Download TXT
            </Button>
            <Button type="button" variant="gold" size="sm" onClick={sendToTelegramOperator}>
              <Send className="h-4 w-4" />
              Telegram @sopheaphin
            </Button>
          </div>
          {shareNotice ? (
            <p className="mt-3 text-xs font-medium text-teal-50">{shareNotice}</p>
          ) : null}
        </div>

        <div className="rounded-lg border border-[#d7a842]/25 bg-[#d7a842]/10 p-4">
          <div>
            <div className="text-sm font-semibold text-[#f7d889]">V1.2 export engine</div>
            <p className="mt-1 text-xs leading-5 text-[#f7d889]/80">
              Download client-ready files with DG Academy headers and clear names.
            </p>
          </div>
          {canViewInternal ? (
          <label className="mt-4 flex items-center gap-2 text-xs font-medium text-[#f7d889]">
            <input
              type="checkbox"
              checked={includeInternalNotes}
              onChange={(event) => setIncludeInternalNotes(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-[#07111f]"
            />
            Include internal notes in export
          </label>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
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
          </div>
          {exportNotice ? (
            <p className="mt-3 text-xs font-medium text-[#f7d889]">{exportNotice}</p>
          ) : null}
          <div className="mt-4">
            <PilotFeedbackButton
              relatedPage={`/packages/${pkg.id}`}
              relatedFeature="Proposal export"
              relatedPackageId={pkg.id}
            />
          </div>
        </div>
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

export function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="flex min-h-[31rem] items-center justify-center rounded-lg border border-dashed border-white/15 bg-[#07111f]/45 p-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-teal-300/10 text-teal-100">
          <Sparkles className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}
      </CardContent>
    </Card>
  );
}

export function ErrorState({
  title = "Something went wrong",
  detail,
}: {
  title?: string;
  detail: string;
}) {
  return (
    <Card className="border-red-300/25 bg-red-400/10 shadow-executive">
      <CardContent className="p-6">
        <div className="text-base font-semibold text-red-100">{title}</div>
        <p className="mt-2 text-sm leading-6 text-red-100/80">{detail}</p>
      </CardContent>
    </Card>
  );
}
