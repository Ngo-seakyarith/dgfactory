import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scopeAppData, withAppScope } from "@/lib/request-scope";
import {
  clientNameKey,
  normalizeClient,
  type Client,
  type ClientProfileInput,
} from "@/features/crm/domain";

type ClientRow = {
  id: string;
  name: string;
  sector: string | null;
  contact_person: string | null;
  contact_position: string | null;
  account_owner: string | null;
  client_type: string | null;
  relationship_history: string | null;
  next_action: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function clientToRow(client: Client) {
  return {
    id: client.id,
    name: client.name,
    sector: client.sector,
    contact_person: client.contactPerson,
    contact_position: client.contactPosition,
    account_owner: client.accountOwner,
    client_type: client.clientType,
    relationship_history: client.relationshipHistory,
    next_action: client.nextAction,
    email: client.email,
    phone: client.phone,
    notes: client.notes,
    created_at: client.createdAt,
    updated_at: client.updatedAt,
  };
}

function clientFromRow(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    sector: row.sector ?? "",
    contactPerson: row.contact_person ?? "",
    contactPosition: row.contact_position ?? "",
    accountOwner: row.account_owner ?? "",
    clientType: row.client_type ?? "",
    relationshipHistory: row.relationship_history ?? "",
    nextAction: row.next_action ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listClients() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to list clients.");
  }

  const query = supabase
    .from("clients")
    .select("*")
    .order("updated_at", { ascending: false });
  const { data, error } = await scopeAppData(query);

  if (error) {
    throw new Error(error.message);
  }

  return (data as ClientRow[]).map(clientFromRow);
}

export async function getClient(id: string) {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await scopeAppData(
      supabase.from("clients").select("*").eq("id", id),
    ).maybeSingle();

    if (!error && data) {
      return clientFromRow(data as ClientRow);
    }
  }

  throw new Error("Supabase is required to load clients.");
}

export async function saveClient(input: Partial<Client>) {
  const client = normalizeClient({
    ...input,
    updatedAt: new Date().toISOString(),
  });
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to save clients.");
  }

  const { data, error } = await supabase
    .from("clients")
    .upsert(withAppScope(clientToRow(client)), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { client: clientFromRow(data as ClientRow), storage: "supabase" as const };
}

export async function resolvePackageClient(
  input: ClientProfileInput,
  packageClientName: string,
) {
  const name = packageClientName.trim();
  if (!name) {
    throw new Error("Client name is required.");
  }

  const clients = await listClients();
  const selected = input.id
    ? clients.find((client) => client.id === input.id)
    : undefined;
  const matchingName = clients.find(
    (client) => clientNameKey(client.name) === clientNameKey(name),
  );
  const existing = selected ?? matchingName;

  return saveClient({
    ...existing,
    ...input,
    id: existing?.id,
    name,
    notes: existing?.notes ?? "",
    createdAt: existing?.createdAt,
  });
}

export async function deleteClient(id: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to delete clients.");
  }

  const { error } = await scopeAppData(supabase.from("clients").delete().eq("id", id));
  if (error) {
    throw new Error(error.message);
  }
  return { deleted: true, storage: "supabase" as const };
}
