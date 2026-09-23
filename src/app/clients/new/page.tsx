import { ClientForm } from "@/features/crm/components/clients";

export default function NewClientPage() {
  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div className="page-eyebrow">Relationships</div>
        <h1 className="page-title">New client</h1>
        <p className="page-description">
          Add a client to link training packages and intelligent-system proposals.
        </p>
      </div>
      <ClientForm />
    </div>
  );
}
