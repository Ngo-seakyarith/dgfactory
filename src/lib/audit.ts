import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AuditLog = {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type AuditLogRow = {
  id: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type AuditStore = {
  logs: AuditLog[];
};

const globalForAuditStore = globalThis as typeof globalThis & {
  __dgAuditStore?: AuditStore;
};

const localStore =
  globalForAuditStore.__dgAuditStore ??
  (globalForAuditStore.__dgAuditStore = {
    logs: [],
  });

function redactValue(key: string, value: unknown): unknown {
  if (/key|token|secret|password|authorization/i.test(key)) {
    return "[redacted]";
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return redactMetadata(value as Record<string, unknown>);
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      item && typeof item === "object" ? redactMetadata(item as Record<string, unknown>) : item,
    );
  }

  return value;
}

export function redactMetadata(metadata: Record<string, unknown> = {}) {
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [key, redactValue(key, value)]),
  );
}

export function normalizeAuditLog(input: Partial<AuditLog>): AuditLog {
  return {
    id: input.id || crypto.randomUUID(),
    actor: String(input.actor ?? "DG Academy Operator").trim(),
    action: String(input.action ?? "unknown").trim(),
    entityType: String(input.entityType ?? "system").trim(),
    entityId: String(input.entityId ?? "").trim(),
    metadata: redactMetadata(input.metadata ?? {}),
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

function toRow(log: AuditLog) {
  return {
    id: log.id,
    actor: log.actor,
    action: log.action,
    entity_type: log.entityType,
    entity_id: log.entityId,
    metadata: log.metadata,
    created_at: log.createdAt,
  };
}

function fromRow(row: AuditLogRow): AuditLog {
  return normalizeAuditLog({
    id: row.id,
    actor: row.actor,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  });
}

export async function saveAuditLog(input: Partial<AuditLog>) {
  const log = normalizeAuditLog(input);
  localStore.logs.unshift(log);
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { log, storage: "local" as const };
  }

  const { data, error } = await supabase
    .from("audit_logs")
    .insert(toRow(log))
    .select("*")
    .single();

  if (error) {
    return { log, storage: "local" as const };
  }

  return { log: fromRow(data as AuditLogRow), storage: "supabase" as const };
}

export async function listAuditLogs(limit = 50) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return localStore.logs.slice(0, limit);
  }

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return localStore.logs.slice(0, limit);
  }

  return (data as AuditLogRow[]).map(fromRow);
}
