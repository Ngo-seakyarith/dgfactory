"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  LayoutGrid,
  Loader2,
  Pencil,
  Plus,
  Rows3,
  Save,
  Trash2,
} from "lucide-react";

import { QueryErrorState } from "@/components/query-error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useSolutionProposalsQuery } from "@/features/digital-solution-proposals/queries";
import type { TrainingPackage } from "@/features/training-packages";
import { useTrainingPackagesQuery } from "@/features/training-packages/queries";
import {
  clientNameKey,
  createEmptyClient,
  normalizeClient,
  type Client,
} from "@/features/crm/domain";
import {
  useClientQuery,
  useClientsQuery,
  useDeleteClientMutation,
  useSaveClientMutation,
} from "@/features/crm/queries";
import { formatDateTime } from "@/lib/date-time";

import {
  CrmGridSkeleton,
  EmptyCrmState,
  Field,
  LoadingCard,
  MissingCard,
  Toolbar,
} from "./shared";

export function ClientForm({
  existingClient,
  onSaved,
  onCancel,
}: {
  existingClient?: Client;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
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

      if (onSaved) onSaved();
      else router.push(`/clients/${payload.client.id}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Client save failed.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{existingClient ? "Edit Client" : "New Client"}</CardTitle>
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
          <Field label="Account owner">
            <Input
              value={client.accountOwner}
              onChange={(event) => updateField("accountOwner", event.target.value)}
              placeholder="DG Academy team member"
            />
          </Field>
          <Field label="Client type">
            <Input
              value={client.clientType}
              onChange={(event) => updateField("clientType", event.target.value)}
              placeholder="Existing client, prospect, partner"
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
        <Field label="Relationship history">
          <Textarea
            value={client.relationshipHistory}
            onChange={(event) => updateField("relationshipHistory", event.target.value)}
            placeholder="Past work and important relationship context"
          />
        </Field>
        <Field label="Next action">
          <Textarea
            value={client.nextAction}
            onChange={(event) => updateField("nextAction", event.target.value)}
            placeholder="The next action for this account"
          />
        </Field>
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
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="gold" onClick={saveClient} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Client
          </Button>
          {onCancel ? <Button type="button" variant="outline" onClick={onCancel} disabled={saveMutation.isPending}>Cancel</Button> : null}
        </div>
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
  const { clientPackages, clientSystemProposals } = getClientActivity(
    client,
    packages,
    systemProposals,
  );

  return (
    <Link
      href={`/clients/${client.id}`}
      className="group rounded-md border border-border bg-card p-4 transition hover:border-[#20867d]/50 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-1 font-semibold text-foreground">{client.name}</div>
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
            {client.contactPerson || "No contact person"}
            {client.contactPosition ? `, ${client.contactPosition}` : ""}
          </p>
          {client.sector ? <p className="mt-1 text-xs text-muted-foreground">{client.sector}</p> : null}
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-[#176a63]" />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {clientPackages.length} training {clientPackages.length === 1 ? "package" : "packages"} · {clientSystemProposals.length} system {clientSystemProposals.length === 1 ? "proposal" : "proposals"}
      </p>
      {client.nextAction ? <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">Next: {client.nextAction}</p> : null}
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
      <table className="min-w-[2700px] border-separate border-spacing-0 text-left text-xs">
        <caption className="sr-only">DG Academy client relationship records in spreadsheet view</caption>
        <thead className="sticky top-0 z-20 bg-muted text-[11px] uppercase tracking-[0.12em] text-muted-foreground shadow-[0_1px_0_hsl(var(--border))]">
          <tr>
            <th className="sticky left-0 z-30 w-12 border-b border-r border-border bg-muted px-3 py-2 text-center">#</th>
            <th className="sticky left-12 z-30 min-w-56 border-b border-r border-border bg-muted px-3 py-2">Client name</th>
            <th className="min-w-40 border-b border-r border-border px-3 py-2">Sector</th>
            <th className="min-w-48 border-b border-r border-border px-3 py-2">Contact person</th>
            <th className="min-w-48 border-b border-r border-border px-3 py-2">Position</th>
            <th className="min-w-40 border-b border-r border-border px-3 py-2">Account owner</th>
            <th className="min-w-36 border-b border-r border-border px-3 py-2">Client type</th>
            <th className="min-w-56 border-b border-r border-border px-3 py-2">Email</th>
            <th className="min-w-40 border-b border-r border-border px-3 py-2">Phone</th>
            <th className="min-w-80 border-b border-r border-border px-3 py-2">Notes</th>
            <th className="min-w-72 border-b border-r border-border px-3 py-2">Next action</th>
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
                <td className="border-b border-r border-border px-3 py-2 text-muted-foreground">{client.accountOwner || "—"}</td>
                <td className="border-b border-r border-border px-3 py-2 text-muted-foreground">{client.clientType || "—"}</td>
                <td className="border-b border-r border-border px-3 py-2 text-muted-foreground">{client.email || "—"}</td>
                <td className="border-b border-r border-border px-3 py-2 text-muted-foreground">{client.phone || "—"}</td>
                <td className="max-w-80 whitespace-pre-wrap border-b border-r border-border px-3 py-2 leading-5 text-muted-foreground">{client.notes || "—"}</td>
                <td className="max-w-72 whitespace-pre-wrap border-b border-r border-border px-3 py-2 leading-5 text-muted-foreground">{client.nextAction || "—"}</td>
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
  const clientsQuery = useClientsQuery();
  const packagesQuery = useTrainingPackagesQuery();
  const proposalsQuery = useSolutionProposalsQuery();
  const clients = useMemo(() => clientsQuery.data ?? [], [clientsQuery.data]);
  const packages = packagesQuery.data ?? [];
  const systemProposals = proposalsQuery.data ?? [];
  const queries = [clientsQuery, packagesQuery, proposalsQuery];
  const isLoading = queries.some((query) => query.isPending);
  const error = queries.find((query) => query.isError)?.error ?? null;
  const notice = error
    ? error.message
    : !isLoading && queries.some((query) => query.isFetching)
      ? "Refreshing client records..."
      : "";
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
      [client.name, client.sector, client.contactPerson, client.contactPosition, client.accountOwner, client.clientType, client.email, client.phone, client.relationshipHistory, client.nextAction, client.notes]
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
            <QueryErrorState
              detail={error.message}
              onRetry={() => void Promise.all(queries.map((item) => item.refetch()))}
            />
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
  const [editing, setEditing] = useState(false);
  const deleteMutation = useDeleteClientMutation();
  const clientQuery = useClientQuery(id);
  const packagesQuery = useTrainingPackagesQuery();
  const proposalsQuery = useSolutionProposalsQuery();
  const client = clientQuery.data;
  const packages = packagesQuery.data ?? [];
  const systemProposals = proposalsQuery.data ?? [];
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

  if (clientQuery.isPending && !client) {
    return <LoadingCard label="Loading client..." />;
  }

  if (!client) {
    return clientQuery.isError ? (
      <QueryErrorState title="Client could not be loaded" detail={clientQuery.error.message} onRetry={() => void clientQuery.refetch()} />
    ) : <MissingCard label="Client not found" href="/clients" />;
  }

  return (
    <div className="space-y-8">
      <header className="border-b border-border pb-5">
        <Link href="/clients" className="text-sm text-muted-foreground hover:text-foreground">Clients</Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="min-w-0 text-2xl font-semibold text-foreground">{client.name}</h1>
          {!editing ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Edit</Button>
              <Button asChild variant="outline"><Link href={`/packages/new?client=${encodeURIComponent(client.name)}`}><Plus className="h-4 w-4" />Training Package</Link></Button>
              <Button asChild variant="outline"><Link href="/solution-proposals/new"><Plus className="h-4 w-4" />System Proposal</Link></Button>
            </div>
          ) : null}
        </div>
      </header>

      {editing ? (
        <ClientForm key={client.updatedAt} existingClient={client} onSaved={() => setEditing(false)} onCancel={() => setEditing(false)} />
      ) : (
        <>
          {client.nextAction ? (
            <section aria-labelledby="client-next-action" className="border-l-2 border-primary pl-4">
              <h2 id="client-next-action" className="text-sm font-semibold">Next action</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{client.nextAction}</p>
            </section>
          ) : null}

          <div className="grid gap-8 md:grid-cols-2">
            <section aria-labelledby="client-contact">
              <h2 id="client-contact" className="border-b border-border pb-2 text-base font-semibold">Contact</h2>
              <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                <ClientDetailField label="Person" value={client.contactPerson} />
                <ClientDetailField label="Position" value={client.contactPosition} />
                <ClientDetailField label="Email" value={client.email} href={client.email ? `mailto:${client.email}` : undefined} />
                <ClientDetailField label="Phone" value={client.phone} href={client.phone ? `tel:${client.phone}` : undefined} />
              </dl>
              {!client.contactPerson && !client.contactPosition && !client.email && !client.phone ? <p className="mt-3 text-sm text-muted-foreground">No contact details yet.</p> : null}
            </section>
            <section aria-labelledby="client-account">
              <h2 id="client-account" className="border-b border-border pb-2 text-base font-semibold">Account</h2>
              <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                <ClientDetailField label="Sector" value={client.sector} />
                <ClientDetailField label="Type" value={client.clientType} />
                <ClientDetailField label="Owner" value={client.accountOwner} />
              </dl>
              {!client.sector && !client.clientType && !client.accountOwner ? <p className="mt-3 text-sm text-muted-foreground">No account details yet.</p> : null}
            </section>
          </div>

          {client.relationshipHistory || client.notes ? (
            <section aria-labelledby="client-context" className="border-t border-border pt-5">
              <h2 id="client-context" className="text-base font-semibold">Relationship context</h2>
              <dl className="mt-3 grid gap-6 md:grid-cols-2">
                <ClientDetailField label="History" value={client.relationshipHistory} />
                <ClientDetailField label="Notes" value={client.notes} />
              </dl>
            </section>
          ) : null}
        </>
      )}

      <section aria-labelledby="client-training-packages" className="border-t border-border pt-5">
        <h2 id="client-training-packages" className="text-base font-semibold">Training Packages <span className="ml-1 font-normal text-muted-foreground">{packagesQuery.isPending ? "" : clientPackages.length}</span></h2>
        {packagesQuery.isPending ? <ClientHistorySkeleton /> : packagesQuery.isError ? (
          <QueryErrorState title="Training packages could not be loaded" detail={packagesQuery.error.message} onRetry={() => void packagesQuery.refetch()} />
        ) : clientPackages.length ? (
          <div className="mt-3 divide-y divide-border border-y border-border">
            {clientPackages.map((pkg) => (
              <Link key={pkg.id} href={`/packages/${pkg.id}`} className="group flex items-center justify-between gap-4 py-3 hover:text-primary">
                <div className="min-w-0">
                  <div className="font-medium text-foreground group-hover:text-primary">{pkg.title}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{pkg.status === "Draft" ? "Draft" : pkg.salesStatus} · {pkg.duration} · Updated {formatDateTime(pkg.updatedAt)}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-muted-foreground">No training packages yet.</p>}
      </section>

      <section aria-labelledby="client-system-proposals" className="border-t border-border pt-5">
        <h2 id="client-system-proposals" className="text-base font-semibold">Intelligent System Proposals <span className="ml-1 font-normal text-muted-foreground">{proposalsQuery.isPending ? "" : clientSystemProposals.length}</span></h2>
        {proposalsQuery.isPending ? <ClientHistorySkeleton /> : proposalsQuery.isError ? (
          <QueryErrorState title="System proposals could not be loaded" detail={proposalsQuery.error.message} onRetry={() => void proposalsQuery.refetch()} />
        ) : clientSystemProposals.length ? (
          <div className="mt-3 divide-y divide-border border-y border-border">
            {clientSystemProposals.map((proposal) => (
              <Link key={proposal.id} href={`/solution-proposals/${proposal.id}`} className="group flex items-center justify-between gap-4 py-3 hover:text-primary">
                <div className="min-w-0">
                  <div className="font-medium text-foreground group-hover:text-primary">{proposal.title}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{proposal.status === "Generated" ? proposal.salesStatus : proposal.status} · Updated {formatDateTime(proposal.updatedAt)}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-muted-foreground">No intelligent system proposals yet.</p>}
      </section>

      <div className="border-t border-border pt-5">
        {deleteMutation.isError ? <p role="alert" className="mb-3 text-sm text-destructive">{deleteMutation.error.message}</p> : null}
        <Button type="button" variant="destructive" onClick={deleteClient} disabled={deleteMutation.isPending}>
          <Trash2 className="h-4 w-4" />Delete client
        </Button>
      </div>
    </div>
  );
}

function ClientDetailField({ label, value, href }: { label: string; value: string; href?: string }) {
  if (!value.trim()) return null;
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
        {href ? <a href={href} className="text-primary underline-offset-2 hover:underline">{value}</a> : value}
      </dd>
    </div>
  );
}

function ClientHistorySkeleton() {
  return (
    <div className="mt-3 space-y-3" aria-busy="true">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
