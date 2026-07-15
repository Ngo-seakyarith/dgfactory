"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  Clipboard,
  DollarSign,
  FileText,
  Loader2,
  Mail,
  Plus,
  Save,
  Search,
  Trash2,
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
import { ClientPortalManager } from "@/app/client-portal/_components/client-portal-components";
import {
  calculatePipelineMetrics,
  clientNameKey,
  createEmptyClient,
  createEmptyOpportunity,
  formatCrmMoney,
  normalizeClient,
  normalizeOpportunity,
  opportunityStatuses,
  type Client,
  type FollowUpDraft,
  type Opportunity,
  type OpportunityStatus,
} from "@/lib/crm";
import type { TrainingPackage } from "@/features/training-packages";

function useCrmData() {
  const [clients, setClients] = useState<Client[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [packages, setPackages] = useState<TrainingPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState("Loading CRM records...");

  async function refresh() {
    try {
      const [clientsResponse, opportunitiesResponse, packagesResponse] =
        await Promise.all([
          fetch("/api/clients", { cache: "no-store" }),
          fetch("/api/opportunities", { cache: "no-store" }),
          fetch("/api/training-packages", { cache: "no-store" }),
        ]);
      const clientsPayload = (await clientsResponse.json()) as {
        clients?: Client[];
        error?: string;
      };
      const opportunitiesPayload = (await opportunitiesResponse.json()) as {
        opportunities?: Opportunity[];
        error?: string;
      };
      const packagesPayload = (await packagesResponse.json()) as {
        packages?: TrainingPackage[];
        error?: string;
      };

      if (!clientsResponse.ok) {
        throw new Error(clientsPayload.error ?? "Client database read failed.");
      }
      if (!opportunitiesResponse.ok) {
        throw new Error(opportunitiesPayload.error ?? "Opportunity database read failed.");
      }
      if (!packagesResponse.ok) {
        throw new Error(packagesPayload.error ?? "Package database read failed.");
      }

      setClients(clientsPayload.clients ?? []);
      setOpportunities(opportunitiesPayload.opportunities ?? []);
      setPackages(packagesPayload.packages ?? []);
      setNotice("Showing Supabase-backed CRM records.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Database read was unavailable.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { clients, opportunities, packages, isLoading, notice, refresh };
}

export function OpportunityStatusBadge({ status }: { status: OpportunityStatus }) {
  const variant =
    status === "Won" ? "teal" : status === "Lost" || status === "Dormant" ? "outline" : "gold";

  return <Badge variant={variant}>{status}</Badge>;
}

export function ClientForm({ existingClient }: { existingClient?: Client }) {
  const router = useRouter();
  const [client, setClient] = useState<Client>(
    existingClient ?? createEmptyClient(),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");

  function updateField<K extends keyof Client>(key: K, value: Client[K]) {
    setClient((current) => ({ ...current, [key]: value }));
  }

  async function saveClient() {
    setIsSaving(true);
    setNotice("");

    const clientToSave = normalizeClient({
      ...client,
      updatedAt: new Date().toISOString(),
    });

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientToSave),
      });
      const payload = (await response.json()) as {
        client?: Client;
        storage?: "supabase";
        error?: string;
      };

      if (!response.ok || !payload.client) {
        throw new Error(payload.error ?? "Client save failed.");
      }

      router.push(`/clients/${payload.client.id}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Client save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardTitle>{existingClient ? "Edit Client" : "New Client"}</CardTitle>
        <CardDescription>
          Capture the buyer, contact, and context for training opportunities.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Client name">
          <Input
            value={client.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="ABC Bank"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sector">
            <Input
              value={client.sector}
              onChange={(event) => updateField("sector", event.target.value)}
              placeholder="Banking, telecom, education"
            />
          </Field>
          <Field label="Contact person">
            <Input
              value={client.contactPerson}
              onChange={(event) => updateField("contactPerson", event.target.value)}
              placeholder="Decision maker or sponsor"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={client.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="name@company.com"
            />
          </Field>
          <Field label="Phone">
            <Input
              value={client.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              placeholder="+855..."
            />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea
            value={client.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Relationship context, buyer priorities, procurement notes"
          />
        </Field>
        {notice ? (
          <p className="rounded-lg border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">
            {notice}
          </p>
        ) : null}
        <Button type="button" variant="gold" onClick={saveClient} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Client
        </Button>
      </CardContent>
    </Card>
  );
}

function packagesForClient(client: Client, packages: TrainingPackage[]) {
  return packages.filter(
    (pkg) =>
      pkg.clientId === client.id ||
      (!pkg.clientId && clientNameKey(pkg.client) === clientNameKey(client.name)),
  );
}

export function ClientCard({
  client,
  packages,
}: {
  client: Client;
  packages: TrainingPackage[];
}) {
  const clientPackages = packagesForClient(client, packages);
  const latestPackage = clientPackages[0];

  return (
    <Link
      href={`/clients/${client.id}`}
      className="group rounded-lg border border-white/10 bg-[#07111f]/55 p-4 transition hover:border-teal-300/35 hover:bg-teal-300/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-1 font-semibold text-white">{client.name}</div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {client.contactPerson || "No contact person yet"} {client.sector ? `- ${client.sector}` : ""}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-teal-100" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="teal">
          {clientPackages.length} {clientPackages.length === 1 ? "package" : "packages"}
        </Badge>
        {client.email ? <Badge variant="outline">{client.email}</Badge> : null}
        {client.phone ? <Badge variant="outline">{client.phone}</Badge> : null}
      </div>
      {latestPackage ? (
        <p className="mt-3 line-clamp-1 text-xs text-muted-foreground">
          Latest: {latestPackage.title}
        </p>
      ) : null}
    </Link>
  );
}

export function ClientsPageClient() {
  const { clients, packages, notice } = useCrmData();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return clients;
    }

    return clients.filter((client) =>
      [client.name, client.sector, client.contactPerson, client.email, client.notes]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [clients, query]);

  return (
    <div className="space-y-5">
      <Toolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search clients"
        href="/clients/new"
        label="New Client"
      />
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>Clients</CardTitle>
          <CardDescription>{notice}</CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {filtered.map((client) => (
                <ClientCard key={client.id} client={client} packages={packages} />
              ))}
            </div>
          ) : (
            <EmptyCrmState title="No clients yet" href="/clients/new" label="Create Client" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ClientDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { clients, opportunities, packages, isLoading } = useCrmData();
  const client = clients.find((item) => item.id === id);
  const clientOpportunities = opportunities.filter((item) => item.clientId === id);
  const clientPackages = client ? packagesForClient(client, packages) : [];

  async function deleteClient() {
    if (!client || !window.confirm(`Delete "${client.name}"?`)) {
      return;
    }

    const response = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
    if (response.ok) {
      router.push("/clients");
    }
  }

  if (isLoading && !client) {
    return <LoadingCard label="Loading client..." />;
  }

  if (!client) {
    return <MissingCard label="Client not found" href="/clients" />;
  }

  return (
    <div className="space-y-5">
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div>
            <CardTitle>{client.name}</CardTitle>
            <CardDescription className="mt-2">
              {client.contactPerson || "No contact person"} {client.sector ? `- ${client.sector}` : ""}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="gold">
              <Link href={`/opportunities/new?clientId=${client.id}`}>
                <Plus className="h-4 w-4" />
                New Opportunity
              </Link>
            </Button>
            <Button type="button" variant="destructive" onClick={deleteClient}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <InfoBlock label="Email" value={client.email || "-"} />
          <InfoBlock label="Phone" value={client.phone || "-"} />
          <InfoBlock label="Notes" value={client.notes || "-"} />
        </CardContent>
      </Card>

      <ClientForm existingClient={client} />

      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>Training Packages</CardTitle>
          <CardDescription>
            Proposals and syllabi created for this client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientPackages.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {clientPackages.map((pkg) => (
                <Link
                  key={pkg.id}
                  href={`/packages/${pkg.id}`}
                  className="group flex items-start gap-3 rounded-lg border border-white/10 bg-[#07111f]/55 p-4 transition hover:border-teal-300/35 hover:bg-teal-300/10"
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-teal-200" />
                  <div className="min-w-0">
                    <div className="line-clamp-1 font-semibold text-white">
                      {pkg.title}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {pkg.duration} · Updated {new Date(pkg.updatedAt).toLocaleDateString()}
                    </p>
                    {pkg.proposalBrief.clientBackground ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {pkg.proposalBrief.clientBackground}
                      </p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyCrmState
              title="No packages for this client"
              href={`/packages/new?client=${encodeURIComponent(client.name)}`}
              label="Create Package"
            />
          )}
        </CardContent>
      </Card>

      <ClientPortalManager
        client={client}
        opportunities={clientOpportunities}
        packages={packages}
      />

      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>Client Opportunities</CardTitle>
          <CardDescription>
            Active and historical training opportunities for this client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientOpportunities.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {clientOpportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  client={client}
                />
              ))}
            </div>
          ) : (
            <EmptyCrmState
              title="No opportunities for this client"
              href={`/opportunities/new?clientId=${client.id}`}
              label="Create Opportunity"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function OpportunityForm({
  existingOpportunity,
}: {
  existingOpportunity?: Opportunity;
}) {
  const router = useRouter();
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
      status: sourcePackage ? "Proposal Draft" : "Lead",
    }),
  );
  const [isSaving, setIsSaving] = useState(false);
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
      status: current.status === "Lead" && sourcePackage ? "Proposal Draft" : current.status,
    }));
  }, [clientIdFromQuery, existingOpportunity, packageIdFromQuery, sourcePackage]);

  function updateField<K extends keyof Opportunity>(key: K, value: Opportunity[K]) {
    setOpportunity((current) => ({ ...current, [key]: value }));
  }

  async function saveOpportunity() {
    setIsSaving(true);
    setNotice("");

    const opportunityToSave = normalizeOpportunity({
      ...opportunity,
      updatedAt: new Date().toISOString(),
    });

    try {
      const response = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opportunityToSave),
      });
      const payload = (await response.json()) as {
        opportunity?: Opportunity;
        storage?: "supabase";
        error?: string;
      };

      if (!response.ok || !payload.opportunity) {
        throw new Error(payload.error ?? "Opportunity save failed.");
      }

      router.push(`/opportunities/${payload.opportunity.id}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Opportunity save failed.");
    } finally {
      setIsSaving(false);
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
          <Field label="Probability %">
            <Input
              type="number"
              min={0}
              max={100}
              value={opportunity.probabilityPercent}
              onChange={(event) =>
                updateField("probabilityPercent", Number(event.target.value))
              }
            />
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
          <p className="rounded-lg border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">
            {notice}
          </p>
        ) : null}
        <Button
          type="button"
          variant="gold"
          onClick={saveOpportunity}
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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
      className="group rounded-lg border border-white/10 bg-[#07111f]/55 p-4 transition hover:border-teal-300/35 hover:bg-teal-300/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-2 font-semibold leading-6 text-white">
            {opportunity.title}
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {client?.name ?? "Unassigned client"} - {opportunity.trainingNeed}
          </p>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-teal-100" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <OpportunityStatusBadge status={opportunity.status} />
        <Badge variant="outline">{formatCrmMoney(opportunity.estimatedValue)}</Badge>
        <Badge variant="outline">{opportunity.probabilityPercent}%</Badge>
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
  const { clients, opportunities, notice } = useCrmData();
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
          {filtered.length ? (
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
  const { clients, opportunities, packages, isLoading } = useCrmData();
  const opportunity = opportunities.find((item) => item.id === id);
  const client = clients.find((item) => item.id === opportunity?.clientId);
  const linkedPackage = packages.find(
    (pkg) => pkg.id === opportunity?.linkedPackageId,
  );
  const [draft, setDraft] = useState<FollowUpDraft | null>(null);
  const [draftNotice, setDraftNotice] = useState("");
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  async function deleteOpportunity() {
    if (!opportunity || !window.confirm(`Delete "${opportunity.title}"?`)) {
      return;
    }

    const response = await fetch(`/api/opportunities/${opportunity.id}`, { method: "DELETE" });
    if (response.ok) {
      router.push("/opportunities");
    }
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
              <Badge variant="outline">{opportunity.probabilityPercent}% probability</Badge>
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
            <Button type="button" variant="destructive" onClick={deleteOpportunity}>
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

      {opportunity.status === "Won" ? (
        <Card className="border-teal-300/20 bg-teal-300/10 shadow-executive">
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <CardTitle>Create Delivery Project</CardTitle>
              <CardDescription>
                This opportunity is won. Start delivery preparation with the client,
                linked package, and commercial context prefilled where available.
              </CardDescription>
            </div>
            <Button asChild variant="gold">
              <Link href={`/delivery/new?opportunityId=${opportunity.id}`}>
                <Plus className="h-4 w-4" />
                Create Delivery Project
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

export function PipelineBoard() {
  const { clients, opportunities, notice } = useCrmData();
  const metrics = calculatePipelineMetrics(opportunities);

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Total opps" value={metrics.totalOpportunities.toString()} />
        <Metric label="Total value" value={formatCrmMoney(metrics.totalEstimatedValue)} />
        <Metric label="Weighted value" value={formatCrmMoney(metrics.weightedPipelineValue)} />
        <Metric label="Proposals sent" value={metrics.proposalsSent.toString()} />
        <Metric label="Won" value={metrics.wonOpportunities.toString()} />
        <Metric label="Lost" value={metrics.lostOpportunities.toString()} />
      </section>

      <FollowUpReminder opportunities={metrics.upcomingFollowUps} clients={clients} />

      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>Pipeline Board</CardTitle>
          <CardDescription>{notice}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 xl:grid-cols-4">
            {opportunityStatuses.map((status) => {
              const items = opportunities.filter((item) => item.status === status);
              return (
                <div
                  key={status}
                  className="min-h-48 rounded-lg border border-white/10 bg-[#07111f]/55 p-3"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <OpportunityStatusBadge status={status} />
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((opportunity) => (
                      <OpportunityCard
                        key={opportunity.id}
                        opportunity={opportunity}
                        client={clients.find((client) => client.id === opportunity.clientId)}
                        compact
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function FollowUpReminder({
  opportunities,
  clients,
}: {
  opportunities: Opportunity[];
  clients: Client[];
}) {
  return (
    <Card className="border-teal-300/20 bg-teal-300/10 shadow-executive">
      <CardHeader>
        <CardTitle>Upcoming Follow-Ups</CardTitle>
        <CardDescription>
          Opportunities with follow-up dates in the next 14 days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {opportunities.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {opportunities.map((opportunity) => (
              <Link
                key={opportunity.id}
                href={`/opportunities/${opportunity.id}`}
                className="rounded-lg border border-teal-300/20 bg-[#07111f]/55 p-3 transition hover:border-teal-300/40"
              >
                <div className="font-medium text-white">{opportunity.title}</div>
                <p className="mt-1 text-sm text-teal-50/80">
                  {clients.find((client) => client.id === opportunity.clientId)?.name ?? "Client"} - {opportunity.nextFollowUpDate}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-teal-50/80">
            No upcoming follow-ups in the next 14 days.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function PackageOpportunityPanel({ pkg }: { pkg: TrainingPackage }) {
  const { clients, opportunities, refresh } = useCrmData();
  const linkedOpportunity = opportunities.find(
    (opportunity) => opportunity.linkedPackageId === pkg.id,
  );
  const linkedClient = clients.find(
    (client) => client.id === linkedOpportunity?.clientId,
  );
  const [selectedOpportunityId, setSelectedOpportunityId] = useState("");
  const [notice, setNotice] = useState("");

  async function linkExistingOpportunity() {
    const opportunity = opportunities.find((item) => item.id === selectedOpportunityId);

    if (!opportunity) {
      setNotice("Select an opportunity to link.");
      return;
    }

    const updated = normalizeOpportunity({
      ...opportunity,
      linkedPackageId: pkg.id,
      updatedAt: new Date().toISOString(),
    });
    const response = await fetch("/api/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setNotice(payload.error ?? "Opportunity link save failed.");
      return;
    }

    await refresh();
    setNotice("Package linked to opportunity.");
  }

  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardTitle>Opportunity Link</CardTitle>
        <CardDescription>
          Connect this training package to the proposal pipeline.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {linkedOpportunity ? (
          <div className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-4">
            <div className="text-sm font-semibold text-teal-50">
              Linked to {linkedOpportunity.title}
            </div>
            <p className="mt-1 text-sm text-teal-50/80">
              {linkedClient?.name ?? "Client not found"} - {linkedOpportunity.status}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href={`/opportunities/${linkedOpportunity.id}`}>
                Open Opportunity
              </Link>
            </Button>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Select
            value={selectedOpportunityId}
            onChange={(event) => setSelectedOpportunityId(event.target.value)}
          >
            <option value="">Select opportunity to link</option>
            {opportunities.map((opportunity) => (
              <option key={opportunity.id} value={opportunity.id}>
                {opportunity.title}
              </option>
            ))}
          </Select>
          <Button type="button" variant="outline" onClick={linkExistingOpportunity}>
            Link to Opportunity
          </Button>
        </div>

        <Button asChild variant="gold">
          <Link href={`/opportunities/new?packageId=${pkg.id}`}>
            <Plus className="h-4 w-4" />
            Create Opportunity from Package
          </Link>
        </Button>

        {notice ? <p className="text-sm text-teal-50">{notice}</p> : null}
      </CardContent>
    </Card>
  );
}

function Toolbar({
  query,
  onQueryChange,
  placeholder,
  href,
  label,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder: string;
  href: string;
  label: string;
}) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={placeholder}
            className="pl-9"
          />
        </div>
        <Button asChild variant="gold" className="w-full sm:w-auto">
          <Link href={href}>
            <Plus className="h-4 w-4" />
            {label}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

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

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium leading-6 text-white">{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-2 font-mono text-xl font-semibold text-white">{value}</div>
      </CardContent>
    </Card>
  );
}

function EmptyCrmState({
  title,
  href,
  label,
}: {
  title: string;
  href: string;
  label: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-white/15 bg-[#07111f]/45 p-8 text-center">
      <DollarSign className="mx-auto h-8 w-8 text-teal-100" />
      <div className="mt-4 text-base font-semibold text-white">{title}</div>
      <Button asChild variant="gold" className="mt-5">
        <Link href={href}>
          <Plus className="h-4 w-4" />
          {label}
        </Link>
      </Button>
    </div>
  );
}

function LoadingCard({ label }: { label: string }) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}
      </CardContent>
    </Card>
  );
}

function MissingCard({ label, href }: { label: string; href: string }) {
  return (
    <Card className="border-red-300/25 bg-red-400/10 shadow-executive">
      <CardContent className="p-6">
        <div className="font-semibold text-red-100">{label}</div>
        <Button asChild variant="outline" className="mt-4">
          <Link href={href}>Go Back</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function DraftBlock({ title, value }: { title: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-white">{title}</div>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          <Clipboard className="h-4 w-4" />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-slate-100">
        {value}
      </pre>
    </div>
  );
}
