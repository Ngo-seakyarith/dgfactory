import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hashPortalToken } from "@/lib/client-portal/token";
import {
  normalizeClientFeedback,
  normalizePortalAccess,
  normalizePortalItem,
  type ClientFeedback,
  type ClientPortalAccess,
  type ClientPortalItem,
  type PortalAccessValidation,
} from "@/lib/client-portal/types";

type AccessRow = {
  id: string;
  client_id: string;
  contact_email: string;
  access_token_hash: string;
  status: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type ItemRow = {
  id: string;
  client_id: string;
  item_type: string;
  item_id: string;
  title: string;
  visibility: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type FeedbackRow = {
  id: string;
  client_id: string;
  related_item_type: string;
  related_item_id: string;
  rating: number | null;
  comments: string;
  requested_changes?: string | null;
  decision_status: string | null;
  next_step_preference?: string | null;
  created_at: string;
};

type PortalStore = {
  access: ClientPortalAccess[];
  items: ClientPortalItem[];
  feedback: ClientFeedback[];
};

const globalForPortalStore = globalThis as typeof globalThis & {
  __dgClientPortalStore?: PortalStore;
};

const localStore =
  globalForPortalStore.__dgClientPortalStore ??
  (globalForPortalStore.__dgClientPortalStore = {
    access: [],
    items: [],
    feedback: [],
  });

function accessToRow(access: ClientPortalAccess) {
  return {
    id: access.id,
    client_id: access.clientId,
    contact_email: access.contactEmail,
    access_token_hash: access.accessTokenHash,
    status: access.status,
    expires_at: access.expiresAt,
    created_at: access.createdAt,
    updated_at: access.updatedAt,
  };
}

function accessFromRow(row: AccessRow) {
  return normalizePortalAccess({
    id: row.id,
    clientId: row.client_id,
    contactEmail: row.contact_email,
    accessTokenHash: row.access_token_hash,
    status: row.status as ClientPortalAccess["status"],
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function itemToRow(item: ClientPortalItem) {
  return {
    id: item.id,
    client_id: item.clientId,
    item_type: item.itemType,
    item_id: item.itemId,
    title: item.title,
    visibility: item.visibility,
    status: item.status,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function itemFromRow(row: ItemRow) {
  return normalizePortalItem({
    id: row.id,
    clientId: row.client_id,
    itemType: row.item_type as ClientPortalItem["itemType"],
    itemId: row.item_id,
    title: row.title,
    visibility: row.visibility as ClientPortalItem["visibility"],
    status: row.status as ClientPortalItem["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function feedbackToRow(feedback: ClientFeedback) {
  return {
    id: feedback.id,
    client_id: feedback.clientId,
    related_item_type: feedback.relatedItemType,
    related_item_id: feedback.relatedItemId,
    rating: feedback.rating,
    comments: feedback.comments,
    requested_changes: feedback.requestedChanges,
    decision_status: feedback.decisionStatus || null,
    next_step_preference: feedback.nextStepPreference,
    created_at: feedback.createdAt,
  };
}

function feedbackFromRow(row: FeedbackRow) {
  return normalizeClientFeedback({
    id: row.id,
    clientId: row.client_id,
    relatedItemType: row.related_item_type,
    relatedItemId: row.related_item_id,
    rating: row.rating,
    comments: row.comments,
    requestedChanges: row.requested_changes ?? "",
    decisionStatus: (row.decision_status ?? "") as ClientFeedback["decisionStatus"],
    nextStepPreference: row.next_step_preference ?? "",
    createdAt: row.created_at,
  });
}

function upsertLocalAccess(access: ClientPortalAccess) {
  const index = localStore.access.findIndex((item) => item.id === access.id);
  if (index >= 0) {
    localStore.access[index] = access;
  } else {
    localStore.access.unshift(access);
  }
  return access;
}

function upsertLocalItem(item: ClientPortalItem) {
  const index = localStore.items.findIndex((existing) => existing.id === item.id);
  if (index >= 0) {
    localStore.items[index] = item;
  } else {
    localStore.items.unshift(item);
  }
  return item;
}

export function publicPortalAccess(access: ClientPortalAccess) {
  return {
    id: access.id,
    clientId: access.clientId,
    contactEmail: access.contactEmail,
    status: access.status,
    expiresAt: access.expiresAt,
    createdAt: access.createdAt,
    updatedAt: access.updatedAt,
  };
}

export async function listPortalAccess(clientId?: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return localStore.access
      .filter((access) => (clientId ? access.clientId === clientId : true))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  let query = supabase
    .from("client_portal_access")
    .select("*")
    .order("updated_at", { ascending: false });

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;
  if (error) {
    return localStore.access.filter((access) =>
      clientId ? access.clientId === clientId : true,
    );
  }

  return (data as AccessRow[]).map(accessFromRow);
}

export async function savePortalAccess(input: Partial<ClientPortalAccess>) {
  const access = normalizePortalAccess({
    ...input,
    updatedAt: new Date().toISOString(),
  });
  upsertLocalAccess(access);
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { access, storage: "local" as const };
  }

  const { data, error } = await supabase
    .from("client_portal_access")
    .upsert(accessToRow(access), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    return { access, storage: "local" as const };
  }

  return { access: accessFromRow(data as AccessRow), storage: "supabase" as const };
}

export async function revokePortalAccess(id: string) {
  const existing = localStore.access.find((access) => access.id === id);
  const updated = existing
    ? normalizePortalAccess({
        ...existing,
        status: "Revoked",
        updatedAt: new Date().toISOString(),
      })
    : null;

  if (updated) {
    upsertLocalAccess(updated);
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { access: updated, storage: "local" as const };
  }

  const { data, error } = await supabase
    .from("client_portal_access")
    .update({ status: "Revoked", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return { access: updated, storage: "local" as const };
  }

  return { access: accessFromRow(data as AccessRow), storage: "supabase" as const };
}

export async function validatePortalToken(
  token: string,
): Promise<PortalAccessValidation> {
  const tokenHash = hashPortalToken(token);
  const supabase = getSupabaseServerClient();
  let access: ClientPortalAccess | null = null;

  if (supabase) {
    const { data, error } = await supabase
      .from("client_portal_access")
      .select("*")
      .eq("access_token_hash", tokenHash)
      .maybeSingle();
    access = !error && data ? accessFromRow(data as AccessRow) : null;
  }

  if (!access) {
    access = localStore.access.find((item) => item.accessTokenHash === tokenHash) ?? null;
  }

  if (!access) {
    return { status: "not_found", access: null };
  }

  if (access.status === "Revoked") {
    return { status: "revoked", access };
  }

  if (access.expiresAt && new Date(access.expiresAt).getTime() < Date.now()) {
    await savePortalAccess({ ...access, status: "Expired" });
    return { status: "expired", access: { ...access, status: "Expired" } };
  }

  return { status: "valid", access };
}

export async function listPortalItems(
  clientId: string,
  options: { publishedOnly?: boolean } = {},
) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return localStore.items
      .filter((item) => item.clientId === clientId)
      .filter((item) =>
        options.publishedOnly
          ? item.status === "Published" && item.visibility === "Client Visible"
          : true,
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  let query = supabase
    .from("client_portal_items")
    .select("*")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false });

  if (options.publishedOnly) {
    query = query.eq("status", "Published").eq("visibility", "Client Visible");
  }

  const { data, error } = await query;
  if (error) {
    return localStore.items.filter((item) => item.clientId === clientId);
  }

  return (data as ItemRow[]).map(itemFromRow);
}

export async function getPortalItemForClient(clientId: string, itemId: string) {
  const items = await listPortalItems(clientId, { publishedOnly: true });
  return items.find((item) => item.id === itemId) ?? null;
}

export async function savePortalItem(input: Partial<ClientPortalItem>) {
  const item = normalizePortalItem({
    ...input,
    updatedAt: new Date().toISOString(),
  });
  upsertLocalItem(item);
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { item, storage: "local" as const };
  }

  const { data, error } = await supabase
    .from("client_portal_items")
    .upsert(itemToRow(item), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    return { item, storage: "local" as const };
  }

  return { item: itemFromRow(data as ItemRow), storage: "supabase" as const };
}

export async function listClientFeedback(clientId?: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return localStore.feedback
      .filter((feedback) => (clientId ? feedback.clientId === clientId : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  let query = supabase
    .from("client_feedback")
    .select("*")
    .order("created_at", { ascending: false });

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;
  if (error) {
    return localStore.feedback.filter((feedback) =>
      clientId ? feedback.clientId === clientId : true,
    );
  }

  return (data as FeedbackRow[]).map(feedbackFromRow);
}

export async function saveClientFeedback(input: Partial<ClientFeedback>) {
  const feedback = normalizeClientFeedback(input);
  localStore.feedback.unshift(feedback);
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { feedback, storage: "local" as const };
  }

  const { data, error } = await supabase
    .from("client_feedback")
    .insert(feedbackToRow(feedback))
    .select("*")
    .single();

  if (error) {
    return { feedback, storage: "local" as const };
  }

  return { feedback: feedbackFromRow(data as FeedbackRow), storage: "supabase" as const };
}
