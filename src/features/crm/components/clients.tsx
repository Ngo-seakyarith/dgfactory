"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppForm } from "@/components/ui/form";
import { createEmptyClient, normalizeClient, type Client } from "../domain";
import { clientFormSchema } from "../client-form";
import { useSaveClientMutation } from "../queries";

const fields = [
  ["name", "Client name"], ["accountOwner", "Account owner"],
  ["contactPerson", "Contact person"], ["contactPosition", "Contact position"],
  ["email", "Email"], ["phone", "Phone"], ["sector", "Sector"], ["clientType", "Client type"],
] as const;

export function ClientForm({ existingClient, onSaved, onCancel }: {
  existingClient?: Client;
  onSaved: (client: Client) => void;
  onCancel: () => void;
}) {
  const mutation = useSaveClientMutation();
  const [initialValues] = useState(() => existingClient ?? createEmptyClient());
  const [error, setError] = useState("");
  const form = useAppForm({
    defaultValues: initialValues,
    validators: { onChange: clientFormSchema, onSubmit: clientFormSchema },
    async onSubmit({ value }) {
      setError("");
      try {
        const payload = await mutation.mutateAsync(normalizeClient({ ...value, updatedAt: new Date().toISOString() }));
        onSaved(payload.client);
      } catch (error) { setError(error instanceof Error ? error.message : "Client could not be saved."); }
    },
  });
  return <form className="space-y-4" noValidate onSubmit={(event) => { event.preventDefault(); void form.handleSubmit(); }}>
    <h2 className="font-semibold">{existingClient ? "Edit client" : "New client"}</h2>
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map(([name, label]) => <form.AppField key={name} name={name}>{(field) => <field.TextField label={label} required={name === "name"} type={name === "email" ? "email" : name === "phone" ? "tel" : "text"} />}</form.AppField>)}
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <form.AppField name="relationshipHistory">{(field) => <field.TextareaField label="Relationship history" rows={2} />}</form.AppField>
      <form.AppField name="nextAction">{(field) => <field.TextareaField label="Next action" rows={2} />}</form.AppField>
      <div className="sm:col-span-2"><form.AppField name="notes">{(field) => <field.TextareaField label="Notes" rows={2} />}</form.AppField></div>
    </div>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    <form.Subscribe selector={(state) => state.isSubmitting}>{(isSubmitting) => <div className="flex gap-2"><Button type="submit" variant="gold" disabled={isSubmitting}><Save className="h-4 w-4" />{isSubmitting ? "Saving..." : "Save client"}</Button><Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>Cancel</Button></div>}</form.Subscribe>
  </form>;
}
