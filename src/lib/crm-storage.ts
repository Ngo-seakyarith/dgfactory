import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  normalizeClient,
  normalizeOpportunity,
  type Client,
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

type CrmStore = {
  clients: Client[];
  opportunities: Opportunity[];
};

const globalForCrmStore = globalThis as typeof globalThis & {
  __dgCrmStore?: CrmStore;
};

const localStore =
  globalForCrmStore.__dgCrmStore ??
  (globalForCrmStore.__dgCrmStore = {
    clients: [],
    opportunities: [],
  });

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

function upsertLocalClient(client: Client) {
  const index = localStore.clients.findIndex((item) => item.id === client.id);

  if (index >= 0) {
    localStore.clients[index] = client;
  } else {
    localStore.clients.unshift(client);
  }

  return client;
}

function upsertLocalOpportunity(opportunity: Opportunity) {
  const index = localStore.opportunities.findIndex(
    (item) => item.id === opportunity.id,
  );

  if (index >= 0) {
    localStore.opportunities[index] = opportunity;
  } else {
    localStore.opportunities.unshift(opportunity);
  }

  return opportunity;
}

export async function listClients() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return [...localStore.clients].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return [...localStore.clients];
  }

  return (data as ClientRow[]).map(clientFromRow);
}

export async function getClient(id: string) {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      return clientFromRow(data as ClientRow);
    }
  }

  return localStore.clients.find((client) => client.id === id) ?? null;
}

export async function saveClient(input: Partial<Client>) {
  const client = normalizeClient({
    ...input,
    updatedAt: new Date().toISOString(),
  });
  upsertLocalClient(client);

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { client, storage: "local" as const };
  }

  const { data, error } = await supabase
    .from("clients")
    .upsert(clientToRow(client), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    return { client, storage: "local" as const };
  }

  return { client: clientFromRow(data as ClientRow), storage: "supabase" as const };
}

export async function deleteClient(id: string) {
  localStore.clients = localStore.clients.filter((client) => client.id !== id);

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { deleted: true, storage: "local" as const };
  }

  const { error } = await supabase.from("clients").delete().eq("id", id);
  return { deleted: true, storage: error ? "local" as const : "supabase" as const };
}

export async function listOpportunities() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return [...localStore.opportunities].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return [...localStore.opportunities];
  }

  return (data as OpportunityRow[]).map(opportunityFromRow);
}

export async function getOpportunity(id: string) {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      return opportunityFromRow(data as OpportunityRow);
    }
  }

  return localStore.opportunities.find((item) => item.id === id) ?? null;
}

export async function saveOpportunity(input: Partial<Opportunity>) {
  const opportunity = normalizeOpportunity({
    ...input,
    updatedAt: new Date().toISOString(),
  });
  upsertLocalOpportunity(opportunity);

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { opportunity, storage: "local" as const };
  }

  const { data, error } = await supabase
    .from("opportunities")
    .upsert(opportunityToRow(opportunity), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    return { opportunity, storage: "local" as const };
  }

  return {
    opportunity: opportunityFromRow(data as OpportunityRow),
    storage: "supabase" as const,
  };
}

export async function deleteOpportunity(id: string) {
  localStore.opportunities = localStore.opportunities.filter(
    (opportunity) => opportunity.id !== id,
  );

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { deleted: true, storage: "local" as const };
  }

  const { error } = await supabase.from("opportunities").delete().eq("id", id);
  return { deleted: true, storage: error ? "local" as const : "supabase" as const };
}
