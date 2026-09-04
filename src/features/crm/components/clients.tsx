"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  FileText,
  LayoutGrid,
  Loader2,
  Plus,
  Rows3,
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
import { Textarea } from "@/components/ui/textarea";
import type { DigitalSolutionProposal } from "@/features/digital-solution-proposals";
import type { TrainingPackage } from "@/features/training-packages";
import {
  clientNameKey,
  createEmptyClient,
  normalizeClient,
  type Client,
} from "@/features/crm/domain";
import {
  useDeleteClientMutation,
  useSaveClientMutation,
} from "@/features/crm/queries";
import { formatDateTime } from "@/lib/date-time";

import { useCrmData } from "./use-crm-data";
import { OpportunityCard } from "./opportunities";
import {
  CrmGridSkeleton,
  EmptyCrmState,
  Field,
  InfoBlock,
  LoadingCard,
  MissingCard,
  Toolbar,
} from "./shared";

export function ClientForm({ existingClient }: { existingClient?: Client }) {
  const router = useRouter();
  const saveMutation = useSaveClientMutation();
  const [client, setClient] = useState<Client>(
    existingClient ?? createEmptyClient(),
  );
  const [notice, setNotice] = useState("");

  function updateField<K extends keyof Client>(key: K, value: Client[K]) {
    setClient((current) => ({ ...current, [key]: value }));
  }

  async function saveClient() {
    setNotice("");

    const clientToSave = normalizeClient({
      ...client,
      updatedAt: new Date().toISOString(),
    });

    try {
      const payload = await saveMutation.mutateAsync(clientToSave);

      router.push(`/clients/${payload.client.id}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Client save failed.");
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
          <Field label="Contact position">
            <Input
              value={client.contactPosition}
              onChange={(event) => updateField("contactPosition", event.target.value)}
              placeholder="Head of HR, Managing Director"
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
          <p className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm font-medium text-destructive">
            {notice}
          </p>
        ) : null}
        <Button type="button" variant="gold" onClick={saveClient} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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

function getClientActivity(
  client: Client,
  packages: TrainingPackage[],
  systemProposals: DigitalSolutionProposal[],
) {
  const clientPackages = packagesForClient(client, packages);
  const clientSystemProposals = systemProposals.filter(
    (proposal) =>
      proposal.clientId === client.id ||
      (!proposal.clientId && clientNameKey(proposal.clientName) === clientNameKey(client.name)),
  );

  return {
    clientPackages,
    clientSystemProposals,
    latestPackage: clientPackages[0],
  };
}

export function ClientCard({
  client,
  packages,
  systemProposals,
}: {
  client: Client;
  packages: TrainingPackage[];
  systemProposals: DigitalSolutionProposal[];
}) {
  const { clientPackages, clientSystemProposals, latestPackage } = getClientActivity(
    client,
    packages,
    systemProposals,
  );

  return (
    <Link
      href={`/clients/${client.id}`}
      className="group rounded-lg border border-white/10 bg-[#07111f]/55 p-4 transition hover:border-teal-300/35 hover:bg-teal-300/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-1 font-semibold text-white">{client.name}</div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {client.contactPerson || "No contact person yet"}
            {client.contactPosition ? `, ${client.contactPosition}` : ""}
            {client.sector ? ` - ${client.sector}` : ""}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-[#176a63]" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="teal">
          {clientPackages.length} {clientPackages.length === 1 ? "package" : "packages"}
        </Badge>
        <Badge variant="outline">
          {clientSystemProposals.length} solution {clientSystemProposals.length === 1 ? "proposal" : "proposals"}
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

function ClientsTable({
  clients,
  packages,
  systemProposals,
}: {
  clients: Client[];
  packages: TrainingPackage[];
  systemProposals: DigitalSolutionProposal[];
}) {
  return (
    <div className="max-h-[70vh] overflow-auto rounded-lg border border-border bg-card">
      <table className="min-w-[2200px] border-separate border-spacing-0 text-left text-xs">
        <caption className="sr-only">DG Academy client relationship records in spreadsheet view</caption>
        <thead className="sticky top-0 z-20 bg-muted text-[11px] uppercase tracking-[0.12em] text-muted-foreground shadow-[0_1px_0_hsl(var(--border))]">
          <tr>
            <th className="sticky left-0 z-30 w-12 border-b border-r border-border bg-muted px-3 py-2 text-center">#</th>
            <th className="sticky left-12 z-30 min-w-56 border-b border-r border-border bg-muted px-3 py-2">Client name</th>
            <th className="min-w-40 border-b border-r border-border px-3 py-2">Sector</th>
            <th className="min-w-48 border-b border-r border-border px-3 py-2">Contact person</th>
            <th className="min-w-48 border-b border-r border-border px-3 py-2">Position</th>
            <th className="min-w-56 border-b border-r border-border px-3 py-2">Email</th>
            <th className="min-w-40 border-b border-r border-border px-3 py-2">Phone</th>
            <th className="min-w-80 border-b border-r border-border px-3 py-2">Notes</th>
            <th className="min-w-28 border-b border-r border-border px-3 py-2 text-right">Packages</th>
            <th className="min-w-36 border-b border-r border-border px-3 py-2 text-right">System proposals</th>
            <th className="min-w-72 border-b border-r border-border px-3 py-2">Latest package</th>
            <th className="min-w-56 border-b border-r border-border px-3 py-2">Created at</th>
            <th className="min-w-56 border-b border-r border-border px-3 py-2">Updated at</th>
            <th className="min-w-80 border-b border-r border-border px-3 py-2">Client ID</th>
            <th className="w-14 border-b border-border px-3 py-2">
              <span className="sr-only">Open client</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client, index) => {
            const { clientPackages, clientSystemProposals, latestPackage } = getClientActivity(
              client,
              packages,
              systemProposals,
            );
            const stickyCellBackground = index % 2 === 0
              ? "bg-card group-hover:bg-accent"
              : "bg-muted group-hover:bg-accent";

            return (
              <tr
                key={client.id}
                className="group align-top even:bg-muted/50 hover:bg-accent/60"
              >
                <td className={`sticky left-0 z-10 border-b border-r border-border px-3 py-2 text-center font-mono text-muted-foreground ${stickyCellBackground}`}>
                  {index + 1}
                </td>
                <td className={`sticky left-12 z-10 border-b border-r border-border px-3 py-2 ${stickyCellBackground}`}>
                  <Link
                    href={`/clients/${client.id}`}
                    className="font-semibold text-foreground transition hover:text-accent-foreground"
                  >
                    {client.name}
                  </Link>
                </td>
                <td className="border-b border-r border-border px-3 py-2 text-muted-foreground">{client.sector || "—"}</td>
                <td className="border-b border-r border-border px-3 py-2 text-foreground">{client.contactPerson || "—"}</td>
                <td className="border-b border-r border-border px-3 py-2 text-muted-foreground">{client.contactPosition || "—"}</td>
                <td className="border-b border-r border-border px-3 py-2 text-muted-foreground">{client.email || "—"}</td>
                <td className="border-b border-r border-border px-3 py-2 text-muted-foreground">{client.phone || "—"}</td>
                <td className="max-w-80 whitespace-pre-wrap border-b border-r border-border px-3 py-2 leading-5 text-muted-foreground">{client.notes || "—"}</td>
                <td className="border-b border-r border-border px-3 py-2 text-right font-mono text-foreground">{clientPackages.length}</td>
                <td className="border-b border-r border-border px-3 py-2 text-right font-mono text-foreground">{clientSystemProposals.length}</td>
                <td className="max-w-72 whitespace-normal border-b border-r border-border px-3 py-2 leading-5 text-muted-foreground">{latestPackage?.title || "—"}</td>
                <td className="border-b border-r border-border px-3 py-2 font-mono text-[11px] text-muted-foreground">{client.createdAt ? formatDateTime(client.createdAt) : "—"}</td>
                <td className="border-b border-r border-border px-3 py-2 font-mono text-[11px] text-muted-foreground">{client.updatedAt ? formatDateTime(client.updatedAt) : "—"}</td>
                <td className="border-b border-r border-border px-3 py-2 font-mono text-[11px] text-muted-foreground">{client.id}</td>
                <td className="border-b border-border px-3 py-2 text-center">
                  <Link
                    href={`/clients/${client.id}`}
                    aria-label={`Open ${client.name}`}
                    className="inline-flex rounded-md p-1 text-muted-foreground transition hover:bg-teal-300/10 hover:text-[#176a63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type ClientsViewMode = "grid" | "rows";

const clientsViewStorageKey = "dg-academy.clients-view";

export function ClientsPageClient() {
  const { clients, packages, systemProposals, notice, isLoading, error, refresh } = useCrmData();
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ClientsViewMode>("grid");

  useEffect(() => {
    try {
      const savedView = window.localStorage.getItem(clientsViewStorageKey);
      if (savedView === "grid" || savedView === "rows") {
        setViewMode(savedView);
      }
    } catch {}
  }, []);

  function changeViewMode(nextView: ClientsViewMode) {
    setViewMode(nextView);
    try {
      window.localStorage.setItem(clientsViewStorageKey, nextView);
    } catch {}
  }

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return clients;
    }

    return clients.filter((client) =>
      [client.name, client.sector, client.contactPerson, client.contactPosition, client.email, client.phone, client.notes]
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
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle>Clients</CardTitle>
            <CardDescription>{notice}</CardDescription>
          </div>
          <div
            className="inline-flex w-fit rounded-lg border border-white/10 bg-[#07111f]/70 p-1"
            role="group"
            aria-label="Client display mode"
          >
            <Button
              type="button"
              size="sm"
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              className="h-8 px-3"
              aria-pressed={viewMode === "grid"}
              onClick={() => changeViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
              Cards
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "rows" ? "secondary" : "ghost"}
              className="h-8 px-3"
              aria-pressed={viewMode === "rows"}
              onClick={() => changeViewMode("rows")}
            >
              <Rows3 className="h-4 w-4" />
              Spreadsheet
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && !clients.length ? (
            <QueryErrorState detail={error.message} onRetry={() => void refresh()} />
          ) : isLoading ? (
            <CrmGridSkeleton />
          ) : filtered.length ? (
            viewMode === "grid" ? (
              <div className="grid gap-3 md:grid-cols-2">
                {filtered.map((client) => (
                  <ClientCard key={client.id} client={client} packages={packages} systemProposals={systemProposals} />
                ))}
              </div>
            ) : (
              <ClientsTable clients={filtered} packages={packages} systemProposals={systemProposals} />
            )
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
  const deleteMutation = useDeleteClientMutation();
  const { clients, opportunities, packages, systemProposals, isLoading } = useCrmData();
  const client = clients.find((item) => item.id === id);
  const clientOpportunities = opportunities.filter((item) => item.clientId === id);
  const clientPackages = client ? packagesForClient(client, packages) : [];
  const clientSystemProposals = systemProposals.filter(
    (proposal) =>
      proposal.clientId === id ||
      (client && !proposal.clientId && clientNameKey(proposal.clientName) === clientNameKey(client.name)),
  );

  async function deleteClient() {
    if (!client || !window.confirm(`Delete "${client.name}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(client.id);
      router.push("/clients");
    } catch {}
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
              {client.contactPerson || "No contact person"}
              {client.contactPosition ? `, ${client.contactPosition}` : ""}
              {client.sector ? ` - ${client.sector}` : ""}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="gold">
              <Link href={`/opportunities/new?clientId=${client.id}`}>
                <Plus className="h-4 w-4" />
                New Opportunity
              </Link>
            </Button>
            <Button type="button" variant="destructive" onClick={deleteClient} disabled={deleteMutation.isPending}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InfoBlock label="Contact position" value={client.contactPosition || "-"} />
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
                      {pkg.duration} · Updated {formatDateTime(pkg.updatedAt)}
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

      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>Digital Solution Proposals</CardTitle>
          <CardDescription>Website, application, portal, data, and AI solution proposals prepared for this client.</CardDescription>
        </CardHeader>
        <CardContent>
          {clientSystemProposals.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {clientSystemProposals.map((proposal) => (
                <Link
                  key={proposal.id}
                  href={`/solution-proposals/${proposal.id}`}
                  className="group flex items-start gap-3 rounded-lg border border-white/10 bg-[#07111f]/55 p-4 transition hover:border-teal-300/35 hover:bg-teal-300/10"
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-teal-200" />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 font-semibold text-white">{proposal.title}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{proposal.status} · Updated {formatDateTime(proposal.updatedAt)}</p>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{proposal.brief.projectGoal}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyCrmState title="No digital solution proposals for this client" href="/solution-proposals/new" label="Create Solution Proposal" />
          )}
        </CardContent>
      </Card>

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

