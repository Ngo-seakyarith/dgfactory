"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Check,
  Clipboard,
  Calculator,
  FileText,
  Loader2,
  MessageSquareText,
  Save,
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
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import type { KnowledgeSourceNote } from "@/lib/knowledge";
import {
  emptyProposalBrief,
  type ProposalBrief,
} from "@/lib/proposal-brief";
import {
  getTrainerById,
  trainerCatalog,
  trainerSnapshotFields,
} from "@/lib/trainers";
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
  calculatePricing,
  clientPricingParagraph,
  defaultPricingInputs,
  formatMoney,
  formatPercent,
  internalProfitabilityNote,
  normalizePricingInputs,
  type PricingInputs,
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

const defaultInput: TrainingPackageInput = {
  courseTitle: "",
  audience: "",
  duration: "",
  client: "",
  promise: "",
  context: "",
  tone: "Executive, practical, commercially sharp",
};

const blankPackagePricingInputs: PricingInputs = {
  ...defaultPricingInputs,
  numberOfParticipants: 0,
  numberOfTrainingDays: 0,
  numberOfTrainers: 0,
  trainerDayRate: 0,
  venueCost: 0,
  foodAndBeverageCostPerPerson: 0,
  materialCostPerPerson: 0,
  adminCost: 0,
  marketingCost: 0,
  travelCost: 0,
  otherCost: 0,
  targetProfitMarginPercent: 0,
  discountPercent: 0,
  taxPercent: 0,
};

export function PackageForm({
  initialPackage,
  onPackageSaved,
}: {
  initialPackage?: TrainingPackage;
  onPackageSaved?: (pkg: TrainingPackage) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<TrainingPackageInput>(() =>
    initialPackage
      ? {
          courseTitle: initialPackage.title,
          audience: initialPackage.audience,
          duration: initialPackage.duration,
          client: initialPackage.client,
          promise: initialPackage.promise,
          context: initialPackage.context,
          tone: initialPackage.tone || defaultInput.tone,
        }
      : defaultInput,
  );
  const [proposalBrief, setProposalBrief] =
    useState<ProposalBrief>(initialPackage?.proposalBrief ?? emptyProposalBrief);
  const selectedTrainer = useMemo(
    () => getTrainerById(proposalBrief.trainerId),
    [proposalBrief.trainerId],
  );
  const [pricingInputs, setPricingInputs] =
    useState<PricingInputs>(
      initialPackage?.pricingInputs ?? blankPackagePricingInputs,
    );
  const [currentPackage, setCurrentPackage] =
    useState<TrainingPackage | null>(initialPackage ?? null);
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

  function updateProposalBrief(key: keyof ProposalBrief, value: string) {
    setProposalBrief((current) => ({ ...current, [key]: value }));
  }

  function selectTrainer(trainerId: string) {
    const trainer = getTrainerById(trainerId);

    setProposalBrief((current) => ({
      ...current,
      ...(trainer ? trainerSnapshotFields(trainer) : {
        trainerId: "",
        trainerImageUrl: "",
        trainerName: "",
        trainerTitle: "",
        trainerBio: "",
        trainerExperience: "",
        trainerQualifications: "",
      }),
    }));
  }

  function updatePricing(nextInputs: PricingInputs) {
    const normalizedInputs = normalizePricingInputs(nextInputs);
    const pricingOutputs = calculatePricing(normalizedInputs);

    setPricingInputs(normalizedInputs);
    setProposalBrief((current) => ({
      ...current,
      vatStatus: normalizedInputs.vatStatus,
    }));
    setCurrentPackage((current) =>
      current
        ? {
            ...current,
            pricingInputs: normalizedInputs,
            pricingOutputs,
            updatedAt: new Date().toISOString(),
          }
        : current,
    );
  }

  async function persistPackage(packageToSave: TrainingPackage) {
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

    return payload.package;
  }

  async function generatePackage() {
    setError("");
    setNotice("");
    setIsGenerating(true);

    try {
      if (!selectedTrainer) {
        throw new Error("Select a trainer before generating the package.");
      }

      const generationInput: TrainingPackageInput = { ...form, proposalBrief };
      const response = await fetch("/api/generate-package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...generationInput, pricingInputs }),
      });

      const payload = (await response.json()) as {
        outputs?: TrainingPackageOutputs;
        syllabus?: string;
        proposal?: string;
        knowledgeUsed?: KnowledgeSourceNote[];
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
            }
          : undefined);

      if (!response.ok || !outputs) {
        throw new Error(payload.error ?? "Generation failed.");
      }

      const pkg = buildPackageFromParts({
        input: generationInput,
        outputs,
        id: initialPackage?.id ?? currentPackage?.id,
        createdAt: initialPackage?.createdAt ?? currentPackage?.createdAt,
        pricingInputs,
        knowledgeUsed:
          payload.knowledgeUsed ??
          currentPackage?.knowledgeUsed ??
          initialPackage?.knowledgeUsed ??
          [],
      });

      setCurrentPackage(pkg);
      const savedPackage = await persistPackage(pkg);
      setCurrentPackage(savedPackage);
      onPackageSaved?.(savedPackage);
      setNotice(payload.notice ?? "Generated with OpenRouter and saved in Supabase.");
      router.replace(`/packages/${savedPackage.id}`);
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

    const packageToSave: TrainingPackage = {
      ...currentPackage,
      updatedAt: new Date().toISOString(),
    };

    try {
      const savedPackage = await persistPackage(packageToSave);
      setCurrentPackage(savedPackage);
      onPackageSaved?.(savedPackage);
      setNotice("Saved in Supabase.");
      router.push(`/packages/${savedPackage.id}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Database save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-5">
        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle>Proposal Brief</CardTitle>
            <CardDescription>Client facts and required training content.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Course title">
                <Input value={form.courseTitle} onChange={(event) => updateField("courseTitle", event.target.value)} placeholder="AI for Marketing Analytics" />
              </Field>
              <Field label="Client">
                <Input value={form.client} onChange={(event) => updateField("client", event.target.value)} placeholder="Nippon Paint" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cover heading">
                <Input value={proposalBrief.coverHeading} onChange={(event) => updateProposalBrief("coverHeading", event.target.value)} placeholder="AI Capability Development" />
              </Field>
              <Field label="Certification or program label">
                <Input value={proposalBrief.certificationLabel} onChange={(event) => updateProposalBrief("certificationLabel", event.target.value)} placeholder="DG Academy Certified AI Practitioner (DCAP) - Level 2 Marketing" />
              </Field>
            </div>
            <Field label="Cover subtitle">
              <Textarea value={proposalBrief.coverSubtitle} onChange={(event) => updateProposalBrief("coverSubtitle", event.target.value)} placeholder="Practical AI skills for reporting, analytics, competitor tracking, and customer service" />
            </Field>
            <Field label="Target learners">
              <Input value={form.audience} onChange={(event) => updateField("audience", event.target.value)} placeholder="Marketing team, campaign managers, analysts, customer-service leads" />
            </Field>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Client background">
                <Textarea rows={5} value={proposalBrief.clientBackground} onChange={(event) => updateProposalBrief("clientBackground", event.target.value)} placeholder="Company, sector, team responsibilities, current priorities, and operating context" />
              </Field>
              <Field label="Training need">
                <Textarea rows={5} value={proposalBrief.trainingNeed} onChange={(event) => updateProposalBrief("trainingNeed", event.target.value)} placeholder="Reporting delays, analysis gaps, competitor monitoring needs, customer-service challenges" />
              </Field>
            </div>
            <Field label="Program goal">
              <Textarea value={form.promise} onChange={(event) => updateField("promise", event.target.value)} placeholder="Enable the team to use AI for faster analysis, stronger decisions, and more productive daily workflows" />
            </Field>
            <Field label="Special requirements">
              <Textarea value={form.context} onChange={(event) => updateField("context", event.target.value)} placeholder="Required tools, local examples, available data, confidentiality limits, and topics to avoid" />
            </Field>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle>Course Design</CardTitle>
            <CardDescription>Objectives, methodology, tools, and evaluation reflected in the proposal.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <Field label="Objectives and outcomes">
              <Textarea rows={7} value={proposalBrief.objectives} onChange={(event) => updateProposalBrief("objectives", event.target.value)} placeholder="Enter one objective per line" />
            </Field>
            <Field label="Expected learning outcomes">
              <Textarea rows={7} value={proposalBrief.expectedLearningOutcomes} onChange={(event) => updateProposalBrief("expectedLearningOutcomes", event.target.value)} placeholder="Enter one outcome per line. Leave blank if the proposal does not need this section." />
            </Field>
            <Field label="Content priorities">
              <Textarea rows={7} value={proposalBrief.contentPriorities} onChange={(event) => updateProposalBrief("contentPriorities", event.target.value)} placeholder="Enter required sessions, topics, and practical applications" />
            </Field>
            <Field label="Who should attend">
              <Textarea rows={6} value={proposalBrief.whoShouldAttend} onChange={(event) => updateProposalBrief("whoShouldAttend", event.target.value)} placeholder="Enter one participant group per line. Leave blank if the audience field is enough." />
            </Field>
            <Field label="Training methodology">
              <Textarea rows={6} value={proposalBrief.methodology} onChange={(event) => updateProposalBrief("methodology", event.target.value)} placeholder="Theory/practice ratio, demonstrations, exercises, group work, follow-up" />
            </Field>
            <Field label="Training tools and materials">
              <Textarea rows={6} value={proposalBrief.trainingTools} onChange={(event) => updateProposalBrief("trainingTools", event.target.value)} placeholder="AI tools, templates, datasets, handouts, certificates, action plans" />
            </Field>
            <Field label="Evaluation approach">
              <Textarea rows={5} value={proposalBrief.evaluationApproach} onChange={(event) => updateProposalBrief("evaluationApproach", event.target.value)} placeholder="Pre-training assessment, practical exercises, observation, feedback, application evidence" />
            </Field>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle>Schedule & Trainer</CardTitle>
            <CardDescription>Delivery details and facilitator profile shown in the proposal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Duration">
                <Input value={form.duration} onChange={(event) => updateField("duration", event.target.value)} placeholder="Half-day" />
              </Field>
              <Field label="Date">
                <Input value={proposalBrief.scheduleDate} onChange={(event) => updateProposalBrief("scheduleDate", event.target.value)} placeholder="TBC" />
              </Field>
              <Field label="Time">
                <Input value={proposalBrief.scheduleTime} onChange={(event) => updateProposalBrief("scheduleTime", event.target.value)} placeholder="8:30 AM - 12:00 PM" />
              </Field>
              <Field label="Venue">
                <Input value={proposalBrief.scheduleVenue} onChange={(event) => updateProposalBrief("scheduleVenue", event.target.value)} placeholder="Client office or TBC" />
              </Field>
            </div>
            <Field
              label="Trainer"
              description="Required. The selected DG Academy profile is used exactly as approved."
            >
              <Select
                value={proposalBrief.trainerId}
                onChange={(event) => selectTrainer(event.target.value)}
                required
              >
                <option value="">Select a trainer</option>
                {trainerCatalog.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.name}
                  </option>
                ))}
              </Select>
            </Field>

            {selectedTrainer ? (
              <div className="grid gap-6 border-t border-white/10 pt-5 lg:grid-cols-[180px_minmax(0,1fr)]">
                <div className="relative aspect-[4/5] w-full max-w-[180px] overflow-hidden rounded-md bg-white">
                  <Image
                    src={selectedTrainer.imageUrl}
                    alt={selectedTrainer.name}
                    fill
                    sizes="180px"
                    className="object-contain"
                  />
                </div>
                <div className="min-w-0 space-y-5">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {selectedTrainer.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Trainer &amp; Speaker
                    </p>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {selectedTrainer.bio}
                  </p>
                  {selectedTrainer.experience.length > 0 ? (
                    <div>
                      <h4 className="mb-2 text-sm font-semibold text-foreground">
                        Experience
                      </h4>
                      <ul className="space-y-1.5 pl-5 text-sm leading-6 text-muted-foreground">
                        {selectedTrainer.experience.map((item) => (
                          <li key={item} className="list-disc">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {selectedTrainer.qualifications.length > 0 ? (
                    <div>
                      <h4 className="mb-2 text-sm font-semibold text-foreground">
                        Qualifications
                      </h4>
                      <ul className="space-y-1.5 pl-5 text-sm leading-6 text-muted-foreground">
                        {selectedTrainer.qualifications.map((item) => (
                          <li key={item} className="list-disc">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle>Fee & Acceptance</CardTitle>
            <CardDescription>Proposal terms around the professional fee.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <Field label="Package includes">
              <Textarea rows={6} value={proposalBrief.includedItems} onChange={(event) => updateProposalBrief("includedItems", event.target.value)} placeholder="Enter one included item per line" />
            </Field>
            <Field label="Client responsibilities">
              <Textarea rows={6} value={proposalBrief.clientResponsibilities} onChange={(event) => updateProposalBrief("clientResponsibilities", event.target.value)} placeholder="Enter one client responsibility per line" />
            </Field>
            <Field label="Billing arrangement">
              <Textarea value={proposalBrief.billingArrangement} onChange={(event) => updateProposalBrief("billingArrangement", event.target.value)} placeholder="The professional fee 100% shall be made to DG Academy before the training date." />
            </Field>
            <Field label="Payment instructions">
              <Textarea value={proposalBrief.paymentInstructions} onChange={(event) => updateProposalBrief("paymentInstructions", event.target.value)} placeholder="Payment shall be made in either cash or check or bank transfer to DG Academy's account No: 34730640543314/ DGACADEMY of ACLEDA Bank. Bank slip shall be sent to DG Academy should the payment is made through bank transfer." />
            </Field>
            <Field label="Acceptance deadline">
              <Input value={proposalBrief.acceptanceDeadline} onChange={(event) => updateProposalBrief("acceptanceDeadline", event.target.value)} placeholder="No later than one week before the training date" />
            </Field>
            <Field
              label="Proposal date"
              description="Mr. Hin Sopheap, Executive Director, remains the authorized DG Academy signatory."
            >
              <Input value={proposalBrief.proposalDate} onChange={(event) => updateProposalBrief("proposalDate", event.target.value)} placeholder="17 June 2026" />
            </Field>
          </CardContent>
        </Card>

        <CommercialSetup
          value={pricingInputs}
          onChange={updatePricing}
          title="Commercial Setup"
          description="Enter the client-facing fee and tax details used in the proposal."
        />

        <div className="space-y-3">
          {error ? (
            <div className="rounded-lg border border-red-300/25 bg-red-400/10 p-3 text-sm leading-6 text-red-100">
              {error}
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
              disabled={isGenerating || !selectedTrainer}
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
              disabled={!currentPackage || isSaving || isGenerating}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Package
            </Button>
          </div>
        </div>
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
        </CardHeader>
        <CardContent>
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
  description = "Pricing assumptions for the client offer.",
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
      }),
    );
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
          <NumberField label="Participants" placeholder="Enter participant count" value={value.numberOfParticipants} onChange={(next) => updateNumber("numberOfParticipants", next)} />
          <NumberField label="Professional fee (USD)" placeholder="Enter quoted professional fee" value={value.professionalFee} onChange={(next) => updateNumber("professionalFee", next)} />
          <Field label="VAT wording">
            <Select
              value={value.vatStatus}
              onChange={(event) =>
                onChange(
                  normalizePricingInputs({
                    ...value,
                    vatStatus: event.target.value,
                  }),
                )
              }
            >
              <option>Excluding VAT</option>
              <option>Including VAT</option>
            </Select>
          </Field>
          <NumberField label="Discount %" placeholder="Enter discount percent" value={value.discountPercent} onChange={(next) => updateNumber("discountPercent", next)} />
          <NumberField label="VAT / tax %" placeholder="Enter VAT or tax percent" value={value.taxPercent} onChange={(next) => updateNumber("taxPercent", next)} />
        </div>

        {pricingOutputs.warnings.length > 0 ? (
          <div className="rounded-lg border border-red-300/25 bg-red-400/10 p-3 text-sm leading-6 text-red-100">
            {pricingOutputs.warnings.join(" ")}
          </div>
        ) : null}

      </CardContent>
    </Card>
  );
}

function NumberField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: number;
  onChange: (value: string) => void;
}) {
  const formattedValue = Number.isFinite(value) && value !== 0 ? String(value) : "";
  const [draftValue, setDraftValue] = useState(formattedValue);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDraftValue(formattedValue);
    }
  }, [formattedValue, isFocused]);

  function handleChange(nextValue: string) {
    if (!/^-?\d*\.?\d*$/.test(nextValue)) {
      return;
    }

    setDraftValue(nextValue);
    onChange(nextValue);
  }

  return (
    <Field label={label}>
      <Input
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={isFocused ? draftValue : formattedValue}
        onChange={(event) => handleChange(event.target.value)}
        onFocus={(event) => {
          setIsFocused(true);
          setDraftValue(formattedValue);
          event.currentTarget.select();
        }}
        onBlur={() => setIsFocused(false)}
        className="tabular-nums"
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

function renderInlineMarkdown(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[0.9em] text-teal-100"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return part;
  });
}

function MarkdownPreview({ value }: { value: string }) {
  const lines = value.split(/\r?\n/);
  const elements: ReactNode[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  function flushList() {
    if (!listType || listItems.length === 0) {
      return;
    }

    const Tag = listType;
    elements.push(
      <Tag
        key={`list-${elements.length}`}
        className={`my-3 space-y-1 pl-6 text-sm leading-7 text-slate-200 ${
          listType === "ol" ? "list-decimal" : "list-disc"
        }`}
      >
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`}>{renderInlineMarkdown(item)}</li>
        ))}
      </Tag>,
    );
    listType = null;
    listItems = [];
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      const className =
        level === 1
          ? "mb-4 mt-1 text-2xl font-semibold leading-tight text-white"
          : level === 2
            ? "mb-2 mt-6 text-lg font-semibold leading-snug text-white"
            : "mb-2 mt-4 text-base font-semibold leading-snug text-teal-50";
      elements.push(
        <div key={`heading-${index}`} className={className}>
          {renderInlineMarkdown(heading[2])}
        </div>,
      );
      return;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)/);
    if (bullet) {
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      listItems.push(bullet[1]);
      return;
    }

    const numbered = trimmed.match(/^\d+\.\s+(.+)/);
    if (numbered) {
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      listItems.push(numbered[1]);
      return;
    }

    flushList();
    elements.push(
      <p key={`paragraph-${index}`} className="my-3 text-sm leading-7 text-slate-200">
        {renderInlineMarkdown(trimmed)}
      </p>,
    );
  });

  flushList();

  return (
    <div className="max-h-[34rem] overflow-auto p-5">
      <div className="max-w-4xl">{elements}</div>
    </div>
  );
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

export function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="flex min-h-[12rem] items-center justify-center rounded-lg border border-dashed border-white/15 bg-[#07111f]/45 p-6 text-center">
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
