import { ClientForm } from "@/app/crm/_components/crm-components";

export default function NewClientPage() {
  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div className="page-eyebrow">Relationships</div>
        <h1 className="page-title">New client</h1>
        <p className="page-description">
          Add a client before creating and tracking training opportunities.
        </p>
      </div>
      <ClientForm />
    </div>
  );
}
