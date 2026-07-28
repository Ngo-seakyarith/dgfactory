"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  createTrainingOutputTemplate,
  fullPackageToMarkdown,
  outputToText,
  packageOutputSections,
  type PackageOutputKey,
  type TrainingPackage,
  type TrainingPackageInput,
} from "@/features/training-packages";
import type { ExportFormat, ExportTarget } from "@/features/training-packages";
import type { Client, ClientProfileInput } from "@/lib/crm";
import { useClientsQuery } from "@/features/clients/queries";
import {
  useGenerateTrainingPackageMutation,
  useSaveTrainingPackageMutation,
} from "@/features/training-packages/queries";
import {
  emptyProposalBrief,
  type ProposalBrief,
} from "@/features/training-packages";
import {
  emptySecondTrainerSnapshotFields,
  emptyTrainerSnapshotFields,
  getTrainerById,
  secondTrainerSnapshotFields,
  trainerCatalog,
  trainerSnapshotFields,
  type TrainerCatalogEntry,
} from "@/features/training-packages";
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
} from "@/features/training-packages";
import { CommercialSetup } from "./commercial-setup";
import { OutputTabs } from "./output-tabs";
import { EmptyState } from "./shared";

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
const defaultInput: TrainingPackageInput = {
  courseTitle: "",
  audience: "",
  duration: "",
  client: "",
  promise: "",
  context: "",
  tone: "Executive, practical, commercially sharp",
};

const emptyClientProfile: ClientProfileInput = {
  name: "",
  sector: "",
  contactPerson: "",
  contactPosition: "",
  email: "",
  phone: "",
};

function profileFromClient(client: Client): ClientProfileInput {
  return {
    id: client.id,
    name: client.name,
    sector: client.sector,
    contactPerson: client.contactPerson,
    contactPosition: client.contactPosition,
    email: client.email,
    phone: client.phone,
  };
}

function TrainerProfilePreview({
  trainer,
  label,
}: {
  trainer: TrainerCatalogEntry;
  label: string;
}) {
  return (
    <div className="grid gap-6 border-t border-white/10 pt-5 lg:grid-cols-[180px_minmax(0,1fr)]">
      <div>
        <Badge variant="outline" className="mb-3">
          {label}
        </Badge>
        <div className="relative aspect-[4/5] w-full max-w-[180px] overflow-hidden rounded-md bg-white">
          <Image
            src={trainer.imageUrl}
            alt={trainer.name}
            fill
            sizes="180px"
            className="object-contain"
          />
        </div>
      </div>
      <div className="min-w-0 space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {trainer.name}
          </h3>
          <p className="text-sm text-muted-foreground">Trainer &amp; Speaker</p>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{trainer.bio}</p>
        {trainer.experience.length > 0 ? (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">
              Experience
            </h4>
            <ul className="space-y-1.5 pl-5 text-sm leading-6 text-muted-foreground">
              {trainer.experience.map((item) => (
                <li key={item} className="list-disc">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {trainer.qualifications.length > 0 ? (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">
              Qualifications
            </h4>
            <ul className="space-y-1.5 pl-5 text-sm leading-6 text-muted-foreground">
              {trainer.qualifications.map((item) => (
                <li key={item} className="list-disc">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

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
  const clientsQuery = useClientsQuery();
  const clients = clientsQuery.data ?? [];
  const saveMutation = useSaveTrainingPackageMutation();
  const generateMutation = useGenerateTrainingPackageMutation();
  const initialClientResolved = useRef(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfileInput>(() => ({
    ...emptyClientProfile,
    id: initialPackage?.clientId ?? undefined,
    name: initialPackage?.client ?? "",
  }));
  const selectedTrainer = useMemo(
    () => getTrainerById(proposalBrief.trainerId),
    [proposalBrief.trainerId],
  );
  const selectedSecondTrainer = useMemo(
    () => getTrainerById(proposalBrief.secondTrainerId),
    [proposalBrief.secondTrainerId],
  );
  const [pricingInputs, setPricingInputs] =
    useState<PricingInputs>(
      initialPackage?.pricingInputs ?? blankPackagePricingInputs,
    );
  const [currentPackage, setCurrentPackage] =
    useState<TrainingPackage | null>(initialPackage ?? null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (initialClientResolved.current || !clientsQuery.data || clientsQuery.isFetching) return;
    initialClientResolved.current = true;

    const linked = initialPackage?.clientId
      ? clientsQuery.data.find((client) => client.id === initialPackage.clientId)
      : clientsQuery.data.find(
          (client) =>
            client.name.trim().toLowerCase() ===
            (initialPackage?.client ?? "").trim().toLowerCase(),
        );
    if (linked) {
      setClientProfile(profileFromClient(linked));
      setForm((current) => ({ ...current, client: linked.name }));
    }
  }, [clientsQuery.data, clientsQuery.isFetching, initialPackage]);

  useEffect(() => {
    if (clientsQuery.isError) {
      setNotice(clientsQuery.error.message);
    }
  }, [clientsQuery.error, clientsQuery.isError]);

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
      if (prefill.client) {
        setClientProfile((current) => ({
          ...current,
          id: undefined,
          name: prefill.client,
        }));
      }
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

  function updateClientField(
    key: Exclude<keyof ClientProfileInput, "id">,
    value: string,
  ) {
    setClientProfile((current) => ({ ...current, [key]: value }));
    if (key === "name") {
      updateField("client", value);
    }
  }

  function selectClient(clientId: string) {
    if (!clientId) {
      setClientProfile({ ...emptyClientProfile });
      updateField("client", "");
      return;
    }

    const client = clients.find((item) => item.id === clientId);
    if (client) {
      setClientProfile(profileFromClient(client));
      updateField("client", client.name);
    }
  }

  function selectTrainer(trainerId: string) {
    const trainer = getTrainerById(trainerId);

    setProposalBrief((current) => ({
      ...current,
      ...(trainer ? trainerSnapshotFields(trainer) : emptyTrainerSnapshotFields),
      ...(trainer?.id === current.secondTrainerId
        ? emptySecondTrainerSnapshotFields
        : {}),
    }));
  }

  function selectSecondTrainer(trainerId: string) {
    const trainer = getTrainerById(trainerId);

    setProposalBrief((current) => ({
      ...current,
      ...(trainer && trainer.id !== current.trainerId
        ? secondTrainerSnapshotFields(trainer)
        : emptySecondTrainerSnapshotFields),
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
    const payload = await saveMutation.mutateAsync({
      package: packageToSave,
      client: clientProfile,
    });

    setClientProfile(profileFromClient(payload.client));
    return payload.package;
  }

  async function generatePackage() {
    setError("");
    setNotice("");
    try {
      if (!selectedTrainer) {
        throw new Error("Select a trainer before generating the package.");
      }

      const generationInput: TrainingPackageInput = { ...form, proposalBrief };
      const payload = await generateMutation.mutateAsync({
        ...generationInput,
        pricingInputs,
      });
      const outputs =
        payload.outputs ??
        (payload.syllabus && payload.proposal
          ? {
              syllabus: payload.syllabus,
              proposal: payload.proposal,
            }
          : undefined);

      if (!outputs) {
        throw new Error("Generation returned no package outputs.");
      }

      const pkg = buildPackageFromParts({
        input: generationInput,
        outputs,
        id: initialPackage?.id ?? currentPackage?.id,
        createdAt: initialPackage?.createdAt ?? currentPackage?.createdAt,
        clientId: clientProfile.id ?? currentPackage?.clientId ?? initialPackage?.clientId,
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
      requestAnimationFrame(() => {
        outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Generation failed.",
      );
    }
  }

  async function savePackage() {
    setError("");
    setNotice("");

    try {
      const isDraft = !currentPackage || currentPackage.status === "Draft";
      let packageToSave: TrainingPackage;

      if (isDraft) {
        if (!form.courseTitle.trim() || !form.client.trim()) {
          throw new Error("Enter the course title and client before saving.");
        }

        const draftInput: TrainingPackageInput = { ...form, proposalBrief };
        packageToSave = buildPackageFromParts({
          input: draftInput,
          outputs: createTrainingOutputTemplate(draftInput),
          id: initialPackage?.id ?? currentPackage?.id,
          createdAt: initialPackage?.createdAt ?? currentPackage?.createdAt,
          clientId:
            clientProfile.id ??
            currentPackage?.clientId ??
            initialPackage?.clientId,
          pricingInputs,
          knowledgeUsed:
            currentPackage?.knowledgeUsed ?? initialPackage?.knowledgeUsed ?? [],
        });
      } else {
        packageToSave = {
          ...currentPackage,
          clientId: clientProfile.id ?? currentPackage.clientId,
          client: form.client,
          updatedAt: new Date().toISOString(),
        };
      }

      const savedPackage = await persistPackage(packageToSave);
      setCurrentPackage(savedPackage);
      onPackageSaved?.(savedPackage);
      setNotice(
        savedPackage.status === "Draft"
          ? "Draft saved in Supabase. You can generate it later."
          : "Saved in Supabase.",
      );
      router.push(`/packages/${savedPackage.id}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Database save failed.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-5">
        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
            <CardDescription>
              Select an existing client or create one with this package.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Existing client">
              <Select
                value={clientProfile.id ?? ""}
                onChange={(event) => selectClient(event.target.value)}
              >
                <option value="">New client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company name">
                <Input
                  value={clientProfile.name}
                  onChange={(event) => updateClientField("name", event.target.value)}
                  placeholder="Nippon Paint"
                />
              </Field>
              <Field label="Sector">
                <Input
                  value={clientProfile.sector ?? ""}
                  onChange={(event) => updateClientField("sector", event.target.value)}
                  placeholder="Manufacturing, banking, telecom"
                />
              </Field>
              <Field label="Contact person">
                <Input
                  value={clientProfile.contactPerson ?? ""}
                  onChange={(event) => updateClientField("contactPerson", event.target.value)}
                  placeholder="Decision maker or program sponsor"
                />
              </Field>
              <Field label="Contact position">
                <Input
                  value={clientProfile.contactPosition ?? ""}
                  onChange={(event) => updateClientField("contactPosition", event.target.value)}
                  placeholder="Head of HR, Managing Director"
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={clientProfile.email ?? ""}
                  onChange={(event) => updateClientField("email", event.target.value)}
                  placeholder="name@company.com"
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={clientProfile.phone ?? ""}
                  onChange={(event) => updateClientField("phone", event.target.value)}
                  placeholder="+855..."
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle>Proposal Brief</CardTitle>
            <CardDescription>Client facts and required training content.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Course title">
              <Input value={form.courseTitle} onChange={(event) => updateField("courseTitle", event.target.value)} placeholder="AI for Marketing Analytics" />
            </Field>
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
            <Field label="Objectives">
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
            <div className="grid gap-4 lg:grid-cols-2">
              <Field
                label="Primary trainer"
                description="Required. The approved profile is used exactly as stored."
              >
                <Select
                  value={proposalBrief.trainerId}
                  onChange={(event) => selectTrainer(event.target.value)}
                  required
                >
                  <option value="">Select a trainer</option>
                  {trainerCatalog.map((trainer) => (
                    <option
                      key={trainer.id}
                      value={trainer.id}
                      disabled={trainer.id === proposalBrief.secondTrainerId}
                    >
                      {trainer.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Second trainer"
                description="Optional. Add a co-trainer when the program needs two facilitators."
              >
                <Select
                  value={proposalBrief.secondTrainerId}
                  onChange={(event) => selectSecondTrainer(event.target.value)}
                >
                  <option value="">No second trainer</option>
                  {trainerCatalog.map((trainer) => (
                    <option
                      key={trainer.id}
                      value={trainer.id}
                      disabled={trainer.id === proposalBrief.trainerId}
                    >
                      {trainer.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {selectedTrainer ? (
              <TrainerProfilePreview
                trainer={selectedTrainer}
                label="Primary trainer"
              />
            ) : null}
            {selectedSecondTrainer ? (
              <TrainerProfilePreview
                trainer={selectedSecondTrainer}
                label="Second trainer"
              />
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
            <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm font-medium leading-6 text-destructive">
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
              disabled={generateMutation.isPending || saveMutation.isPending || !selectedTrainer}
            >
              {generateMutation.isPending ? (
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
              disabled={saveMutation.isPending || generateMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Package
            </Button>
          </div>
        </div>
      </div>

      <div ref={outputRef} className="scroll-mt-6">
        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
            <div>
              <CardTitle>
                {currentPackage?.status === "Draft"
                  ? "Package Draft"
                  : "Generated Package"}
              </CardTitle>
              <CardDescription>
                {currentPackage?.status === "Draft"
                  ? "Your inputs are saved. Generate when you are ready."
                  : "Outputs are organized into tabs with copy controls for fast client packaging."}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {currentPackage?.status === "Generated" ? (
              <OutputTabs pkg={currentPackage} />
            ) : currentPackage ? (
              <EmptyState
                title="Draft saved."
                detail="Your form, trainer selection, client information, and commercial setup are stored. Generate the package when you are ready."
              />
            ) : (
              <EmptyState
                title="Your production package will appear here."
                detail="Generate once, review the tabs, then save the package locally or into Supabase when configured."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const TrainingPackageFactory = PackageForm;

export { EmptyState, ErrorState, LoadingState } from './shared';

