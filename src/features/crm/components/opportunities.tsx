"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  Loader2,
  Mail,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import { QueryErrorState } from "@/components/query-error-state";
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
import { useDeliveryProjectsQuery } from "@/features/delivery/queries";
import {
  createEmptyOpportunity,
  formatCrmMoney,
  isWonOpportunityStatus,
  normalizeOpportunity,
  opportunityStatuses,
  type Client,
  type FollowUpDraft,
  type Opportunity,
  type OpportunityStatus,
} from "@/features/crm/domain";
import {
  useDeleteOpportunityMutation,
  useSaveOpportunityMutation,
} from "@/features/crm/queries";

import { useCrmData } from "./use-crm-data";
import {
  CrmGridSkeleton,
  DraftBlock,
  EmptyCrmState,
  Field,
  InfoBlock,
  LoadingCard,
  MissingCard,
  OpportunityStatusBadge,
  Toolbar,
} from "./shared";

export function OpportunityForm({
  existingOpportunity,
}: {
  existingOpportunity?: Opportunity;
}) {
  const router = useRouter();
  const saveMutation = useSaveOpportunityMutation();
  const searchParams = useSearchParams();
  const { clients, packages } = useCrmData();
  const clientIdFromQuery = searchParams.get("clientId") ?? "";
  const packageIdFromQuery = searchParams.get("packageId") ?? "";
  const sourcePackage = packages.find((pkg) => pkg.id === packageIdFromQuery);
  const [opportunity, setOpportunity] = useState<Opportunity>(() =>
    existingOpportunity ??
    createEmptyOpportunity({
      clientId: clientIdFromQuery,
      linkedPackageId: sourcePackage?.id ?? (packageIdFromQuery || null),
      title: sourcePackage ? sourcePackage.title : "",
      trainingNeed: sourcePackage ? sourcePackage.promise : "",
      estimatedValue: sourcePackage?.pricingOutputs.finalPrice ?? 0,
      status: sourcePackage ? "Syllabus Sent" : "Lead",
    }),
  );
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (existingOpportunity) {
      return;
    }

    setOpportunity((current) => ({
      ...current,
      clientId: current.clientId || clientIdFromQuery,
      linkedPackageId:
        current.linkedPackageId ?? sourcePackage?.id ?? (packageIdFromQuery || null),
      title: current.title || sourcePackage?.title || "",
      trainingNeed: current.trainingNeed || sourcePackage?.promise || "",
      estimatedValue: current.estimatedValue || sourcePackage?.pricingOutputs.finalPrice || 0,
      status: current.status === "Lead" && sourcePackage ? "Syllabus Sent" : current.status,
    }));
  }, [clientIdFromQuery, existingOpportunity, packageIdFromQuery, sourcePackage]);

  function updateField<K extends keyof Opportunity>(key: K, value: Opportunity[K]) {
    setOpportunity((current) => ({ ...current, [key]: value }));
  }

  async function saveOpportunity() {
    setNotice("");

    const opportunityToSave = normalizeOpportunity({
      ...opportunity,
      updatedAt: new Date().toISOString(),
    });

    try {
      const payload = await saveMutation.mutateAsync(opportunityToSave);

      router.push(`/opportunities/${payload.opportunity.id}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Opportunity save failed.");
    }
  }

  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardTitle>{existingOpportunity ? "Edit Opportunity" : "New Opportunity"}</CardTitle>
        <CardDescription>
          Track the training need from lead through proposal and close.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Client">
          <Select
            value={opportunity.clientId}
            onChange={(event) => updateField("clientId", event.target.value)}
          >
            <option value="">Select client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Opportunity title">
          <Input
            value={opportunity.title}
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="AI leadership training for executive team"
          />
        </Field>
        <Field label="Training need">
          <Textarea
            value={opportunity.trainingNeed}
            onChange={(event) => updateField("trainingNeed", event.target.value)}
            placeholder="What capability or business outcome does the client need?"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Estimated value">
            <Input
              type="number"
              value={opportunity.estimatedValue}
              onChange={(event) =>
                updateField("estimatedValue", Number(event.target.value))
              }
            />
          </Field>
          <Field label="Status">
            <Select
              value={opportunity.status}
              onChange={(event) =>
                updateField("status", event.target.value as OpportunityStatus)
              }
            >
              {opportunityStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </Select>
          </Field>
          <Field label="Expected close date">
            <Input
              type="date"
              value={opportunity.expectedCloseDate}
              onChange={(event) =>
                updateField("expectedCloseDate", event.target.value)
              }
            />
          </Field>
          <Field label="Next follow-up date">
            <Input
              type="date"
              value={opportunity.nextFollowUpDate}
              onChange={(event) =>
                updateField("nextFollowUpDate", event.target.value)
              }
            />
          </Field>
          <Field label="Linked package">
            <Select
              value={opportunity.linkedPackageId ?? ""}
              onChange={(event) =>
                updateField("linkedPackageId", event.target.value || null)
              }
            >
              <option value="">No linked package</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.title}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Notes">
          <Textarea
            value={opportunity.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Discovery notes, objections, procurement details, next action"
          />
        </Field>
        {notice ? (
          <p className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm font-medium text-destructive">
            {notice}
          </p>
        ) : null}
        <Button
          type="button"
          variant="gold"
          onClick={saveOpportunity}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Opportunity
        </Button>
      </CardContent>
    </Card>
  );
}

export function OpportunityCard({
  opportunity,
  client,
  compact,
}: {
  opportunity: Opportunity;
  client?: Client;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/opportunities/${opportunity.id}`}
      className="group rounded-lg border border-border bg-card p-4 shadow-sm transition hover:border-[#20867d]/45 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-2 font-semibold leading-6 text-card-foreground">
            {opportunity.title}
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {client?.name ?? "Unassigned client"} - {opportunity.trainingNeed}
          </p>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-[#176a63]" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <OpportunityStatusBadge status={opportunity.status} />
        <Badge variant="outline">{formatCrmMoney(opportunity.estimatedValue)}</Badge>
      </div>
      {!compact && opportunity.nextFollowUpDate ? (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          Follow up {opportunity.nextFollowUpDate}
        </div>
      ) : null}
    </Link>
  );
}

export function OpportunitiesPageClient() {
  const { clients, opportunities, notice, isLoading, error, refresh } = useCrmData();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return opportunities;
    }

    return opportunities.filter((opportunity) =>
      [opportunity.title, opportunity.trainingNeed, opportunity.status, opportunity.notes]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [opportunities, query]);

  return (
    <div className="space-y-5">
      <Toolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search opportunities"
        href="/opportunities/new"
        label="New Opportunity"
      />
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>Opportunities</CardTitle>
          <CardDescription>{notice}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && !opportunities.length ? (
            <QueryErrorState detail={error.message} onRetry={() => void refresh()} />
          ) : isLoading ? (
            <CrmGridSkeleton />
          ) : filtered.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {filtered.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  client={clients.find((client) => client.id === opportunity.clientId)}
                />
              ))}
            </div>
          ) : (
            <EmptyCrmState
              title="No opportunities yet"
              href="/opportunities/new"
              label="Create Opportunity"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function OpportunityDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const deleteMutation = useDeleteOpportunityMutation();
  const { clients, opportunities, packages, isLoading } = useCrmData();
  const opportunity = opportunities.find((item) => item.id === id);
  const client = clients.find((item) => item.id === opportunity?.clientId);
  const linkedPackage = packages.find(
    (pkg) => pkg.id === opportunity?.linkedPackageId,
  );
  const deliveriesQuery = useDeliveryProjectsQuery();
  const linkedDelivery = (deliveriesQuery.data ?? []).find(
    (project) =>
      project.opportunityId === id ||
      (project.packageId && project.packageId === linkedPackage?.id),
  );
  const [draft, setDraft] = useState<FollowUpDraft | null>(null);
  const [draftNotice, setDraftNotice] = useState("");
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  async function deleteOpportunity() {
    if (!opportunity || !window.confirm(`Delete "${opportunity.title}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(opportunity.id);
      router.push("/opportunities");
    } catch {}
  }

  async function generateFollowUp() {
    if (!opportunity) {
      return;
    }

    setIsGeneratingDraft(true);
    setDraftNotice("");

    try {
      const response = await fetch("/api/opportunities/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: client?.name ?? "",
          status: opportunity.status,
          trainingNeed: opportunity.trainingNeed,
          lastNotes: opportunity.notes,
          nextFollowUpDate: opportunity.nextFollowUpDate,
        }),
      });
      const payload = (await response.json()) as {
        draft?: FollowUpDraft;
        mode?: "openai";
        notice?: string;
        error?: string;
      };

      if (!response.ok || !payload.draft) {
        throw new Error(payload.error ?? "Follow-up generation failed.");
      }

      setDraft(payload.draft);
      setDraftNotice(payload.notice ?? `Draft generated with ${payload.mode}.`);
    } catch (error) {
      setDraftNotice(
        error instanceof Error ? error.message : "Follow-up generation failed.",
      );
    } finally {
      setIsGeneratingDraft(false);
    }
  }

  if (isLoading && !opportunity) {
    return <LoadingCard label="Loading opportunity..." />;
  }

  if (!opportunity) {
    return <MissingCard label="Opportunity not found" href="/opportunities" />;
  }

  return (
    <div className="space-y-5">
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <OpportunityStatusBadge status={opportunity.status} />
              <Badge variant="outline">{formatCrmMoney(opportunity.estimatedValue)}</Badge>
            </div>
            <CardTitle>{opportunity.title}</CardTitle>
            <CardDescription className="mt-2">
              {client?.name ?? "No client selected"} - {opportunity.trainingNeed}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/opportunities/new">
                <Plus className="h-4 w-4" />
                New Opportunity
              </Link>
            </Button>
            <Button type="button" variant="destructive" onClick={deleteOpportunity} disabled={deleteMutation.isPending}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <InfoBlock label="Expected close" value={opportunity.expectedCloseDate || "-"} />
          <InfoBlock label="Next follow-up" value={opportunity.nextFollowUpDate || "-"} />
          <InfoBlock
            label="Linked package"
            value={linkedPackage?.title ?? "No linked package"}
          />
        </CardContent>
      </Card>

      {isWonOpportunityStatus(opportunity.status) ? (
        <Card className="border-teal-300/20 bg-teal-300/10 shadow-executive">
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <CardTitle>Training Delivery</CardTitle>
              <CardDescription>
                {linkedDelivery
                  ? "Open the linked delivery to manage training preparation, delivery, and completion."
                  : linkedPackage
                    ? "Save this status to create the delivery record for the linked package."
                    : "Link a training package to create its delivery record, or open the delivery workspace."}
              </CardDescription>
            </div>
            <Button asChild variant="gold">
              <Link href={linkedDelivery ? `/delivery/${linkedDelivery.id}` : "/delivery"}>
                <ArrowRight className="h-4 w-4" />
                Open Delivery
              </Link>
            </Button>
          </CardHeader>
        </Card>
      ) : null}

      <OpportunityForm existingOpportunity={opportunity} />

      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle>Follow-Up Draft</CardTitle>
            <CardDescription>
              Generate draft text only. The app does not send email or messages automatically.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="gold"
            onClick={generateFollowUp}
            disabled={isGeneratingDraft}
          >
            {isGeneratingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Generate Follow-Up Message
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {draftNotice ? (
            <p className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-3 text-sm text-teal-50">
              {draftNotice}
            </p>
          ) : null}
          {draft ? (
            <div className="grid gap-3 lg:grid-cols-3">
              <DraftBlock title="Follow-up email" value={draft.followUpEmail} />
              <DraftBlock title="Short message" value={draft.shortMessage} />
              <DraftBlock title="Suggested next step" value={draft.suggestedNextStep} />
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              Click generate when you want a safe draft for the next client touchpoint.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

