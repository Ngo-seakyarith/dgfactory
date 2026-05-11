import { ClientForm } from "@/components/crm-components";

export default function NewClientPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">New Client</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Add a client before creating and tracking training opportunities.
        </p>
      </div>
      <ClientForm />
    </div>
  );
}
