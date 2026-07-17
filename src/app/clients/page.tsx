import { ClientsPageClient } from "@/app/crm/_components/crm-components";

export default function ClientsPage() {
  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div className="page-eyebrow">Relationships</div>
        <h1 className="page-title">Clients</h1>
        <p className="page-description">
          Track DG Academy training buyers, contacts, and relationship notes.
        </p>
      </div>
      <ClientsPageClient />
    </div>
  );
}
