import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  normalizeSecurityAudit,
  normalizeSecurityAuditItem,
  type SecurityAudit,
  type SecurityAuditItem,
  type SecurityAuditStatus,
  type SecuritySeverity,
} from "@/lib/security/types";

type SecurityStore = {
  audits: SecurityAudit[];
  items: SecurityAuditItem[];
};

type SecurityAuditRow = {
  id: string;
  title: string;
  status: SecurityAuditStatus | null;
  auditor: string | null;
  summary: string | null;
  risk_score: number | null;
  created_at: string;
  updated_at: string;
};

type SecurityAuditItemRow = {
  id: string;
  audit_id: string;
  category: string;
  title: string;
  description: string | null;
  status: SecurityAuditStatus | null;
  severity: SecuritySeverity | null;
  evidence: string | null;
  recommendation: string | null;
  created_at: string;
  updated_at: string;
};

const globalForSecurityStore = globalThis as typeof globalThis & {
  __dgSecurityStore?: SecurityStore;
};

const localStore =
  globalForSecurityStore.__dgSecurityStore ??
  (globalForSecurityStore.__dgSecurityStore = {
    audits: [],
    items: [],
  });

function auditToRow(audit: SecurityAudit) {
  return {
    id: audit.id,
    title: audit.title,
    status: audit.status,
    auditor: audit.auditor || null,
    summary: audit.summary || null,
    risk_score: audit.riskScore,
    created_at: audit.createdAt,
    updated_at: audit.updatedAt,
  };
}

function auditFromRow(row: SecurityAuditRow) {
  return normalizeSecurityAudit({
    id: row.id,
    title: row.title,
    status: row.status ?? "Not Checked",
    auditor: row.auditor ?? "",
    summary: row.summary ?? "",
    riskScore: row.risk_score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function itemToRow(item: SecurityAuditItem) {
  return {
    id: item.id,
    audit_id: item.auditId,
    category: item.category,
    title: item.title,
    description: item.description,
    status: item.status,
    severity: item.severity,
    evidence: item.evidence,
    recommendation: item.recommendation,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function itemFromRow(row: SecurityAuditItemRow) {
  return normalizeSecurityAuditItem({
    id: row.id,
    auditId: row.audit_id,
    category: row.category,
    title: row.title,
    description: row.description ?? "",
    status: row.status ?? "Not Checked",
    severity: row.severity ?? "Medium",
    evidence: row.evidence ?? "",
    recommendation: row.recommendation ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export async function saveSecurityAudit(input: Partial<SecurityAudit>) {
  const audit = normalizeSecurityAudit({
    ...input,
    updatedAt: new Date().toISOString(),
  });
  const index = localStore.audits.findIndex((item) => item.id === audit.id);

  if (index >= 0) {
    localStore.audits[index] = audit;
  } else {
    localStore.audits.unshift(audit);
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { audit, storage: "local" as const };
  }

  const { data, error } = await supabase
    .from("security_audits")
    .upsert(auditToRow(audit), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    return { audit, storage: "local" as const };
  }

  return { audit: auditFromRow(data as SecurityAuditRow), storage: "supabase" as const };
}

export async function saveSecurityAuditItems(items: SecurityAuditItem[]) {
  items.forEach((item) => {
    const normalized = normalizeSecurityAuditItem(item);
    const index = localStore.items.findIndex((current) => current.id === normalized.id);
    if (index >= 0) {
      localStore.items[index] = normalized;
    } else {
      localStore.items.unshift(normalized);
    }
  });

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { items, storage: "local" as const };
  }

  const { data, error } = await supabase
    .from("security_audit_items")
    .upsert(items.map(itemToRow), { onConflict: "id" })
    .select("*");

  if (error) {
    return { items, storage: "local" as const };
  }

  return {
    items: (data as SecurityAuditItemRow[]).map(itemFromRow),
    storage: "supabase" as const,
  };
}

export async function listSecurityAudits() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return [...localStore.audits].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const { data, error } = await supabase
    .from("security_audits")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return localStore.audits;
  }

  return (data as SecurityAuditRow[]).map(auditFromRow);
}

export async function listSecurityAuditItems(auditId?: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return localStore.items
      .filter((item) => (auditId ? item.auditId === auditId : true))
      .sort((a, b) => a.category.localeCompare(b.category));
  }

  let query = supabase.from("security_audit_items").select("*").order("category");
  if (auditId) {
    query = query.eq("audit_id", auditId);
  }
  const { data, error } = await query;

  if (error) {
    return localStore.items.filter((item) => (auditId ? item.auditId === auditId : true));
  }

  return (data as SecurityAuditItemRow[]).map(itemFromRow);
}
