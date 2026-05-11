import { ClientsPageClient } from "@/components/crm-components";

export default function ClientsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Clients</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Track DG Academy training buyers, contacts, and relationship notes.
        </p>
      </div>
      <ClientsPageClient />
    </div>
  );
}
