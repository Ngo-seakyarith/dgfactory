"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createEmptyClient, normalizeClient, type Client } from "../domain";
import { useSaveClientMutation } from "../queries";
import { Field } from "./shared";

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
  const [client, setClient] = useState(() => existingClient ?? createEmptyClient());
  const [error, setError] = useState("");
  function update(key: keyof Client, value: string) { setClient((current) => ({ ...current, [key]: value })); }
  async function save() {
    setError("");
    if (!client.name.trim()) { setError("Client name is required."); return; }
    try {
      const payload = await mutation.mutateAsync(normalizeClient({ ...client, updatedAt: new Date().toISOString() }));
      onSaved(payload.client);
    } catch (error) { setError(error instanceof Error ? error.message : "Client could not be saved."); }
  }
  return <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
    <h2 className="font-semibold">{existingClient ? "Edit client" : "New client"}</h2>
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map(([key, label]) => <Field key={key} label={label}><Input required={key === "name"} type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} value={client[key]} onChange={(event) => update(key, event.target.value)} /></Field>)}
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Relationship history"><Textarea rows={2} value={client.relationshipHistory} onChange={(event) => update("relationshipHistory", event.target.value)} /></Field>
      <Field label="Next action"><Textarea rows={2} value={client.nextAction} onChange={(event) => update("nextAction", event.target.value)} /></Field>
      <div className="sm:col-span-2"><Field label="Notes"><Textarea rows={2} value={client.notes} onChange={(event) => update("notes", event.target.value)} /></Field></div>
    </div>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    <div className="flex gap-2"><Button type="submit" variant="gold" disabled={mutation.isPending}><Save className="h-4 w-4" />{mutation.isPending ? "Saving..." : "Save client"}</Button><Button type="button" variant="outline" disabled={mutation.isPending} onClick={onCancel}>Cancel</Button></div>
  </form>;
}
