import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scopeAppData, withAppScope } from "@/lib/request-scope";
import {
  clientNameKey,
  normalizeClient,
  normalizeOpportunity,
  type Client,
  type ClientProfileInput,
  type Opportunity,
  type OpportunityStatus,
} from "@/lib/crm";

type ClientRow = {
  id: string;
  name: string;
  sector: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type OpportunityRow = {
  id: string;
  client_id: string;
  title: string;
  training_need: string | null;
  estimated_value: number | null;
  status: OpportunityStatus | null;
  probability_percent: number | null;
  expected_close_date: string | null;
  next_follow_up_date: string | null;
  notes: string | null;
  linked_package_id: string | null;
  created_at: string;
  updated_at: string;
};

function clientToRow(client: Client) {
  return {
    id: client.id,
    name: client.name,
    sector: client.sector,
    contact_person: client.contactPerson,
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
    email: row.email ?? "",
    phone: row.phone ?? "",
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function opportunityToRow(opportunity: Opportunity) {
  return {
    id: opportunity.id,
    client_id: opportunity.clientId,
    title: opportunity.title,
    training_need: opportunity.trainingNeed,
    estimated_value: opportunity.estimatedValue,
    status: opportunity.status,
    probability_percent: opportunity.probabilityPercent,
    expected_close_date: opportunity.expectedCloseDate || null,
    next_follow_up_date: opportunity.nextFollowUpDate || null,
    notes: opportunity.notes,
    linked_package_id: opportunity.linkedPackageId,
    created_at: opportunity.createdAt,
    updated_at: opportunity.updatedAt,
  };
}

function opportunityFromRow(row: OpportunityRow): Opportunity {
  return normalizeOpportunity({
    id: row.id,
    clientId: row.client_id,
    title: row.title,
    trainingNeed: row.training_need ?? "",
    estimatedValue: row.estimated_value ?? 0,
    status: row.status ?? "Lead",
    probabilityPercent: row.probability_percent ?? 25,
    expectedCloseDate: row.expected_close_date ?? "",
    nextFollowUpDate: row.next_follow_up_date ?? "",
    notes: row.notes ?? "",
    linkedPackageId: row.linked_package_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
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

export async function listOpportunities() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to list opportunities.");
  }

  const query = supabase
    .from("opportunities")
    .select("*")
    .order("updated_at", { ascending: false });
  const { data, error } = await scopeAppData(query);

  if (error) {
    throw new Error(error.message);
  }

  return (data as OpportunityRow[]).map(opportunityFromRow);
}

export async function getOpportunity(id: string) {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await scopeAppData(
      supabase.from("opportunities").select("*").eq("id", id),
    ).maybeSingle();

    if (!error && data) {
      return opportunityFromRow(data as OpportunityRow);
    }
  }

  throw new Error("Supabase is required to load opportunities.");
}

export async function saveOpportunity(input: Partial<Opportunity>) {
  const opportunity = normalizeOpportunity({
    ...input,
    updatedAt: new Date().toISOString(),
  });
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to save opportunities.");
  }

  const { data, error } = await supabase
    .from("opportunities")
    .upsert(withAppScope(opportunityToRow(opportunity)), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    opportunity: opportunityFromRow(data as OpportunityRow),
    storage: "supabase" as const,
  };
}

export async function deleteOpportunity(id: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to delete opportunities.");
  }

  const { error } = await scopeAppData(
    supabase.from("opportunities").delete().eq("id", id),
  );
  if (error) {
    throw new Error(error.message);
  }
  return { deleted: true, storage: "supabase" as const };
}
