import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scopeAppData, withAppScope } from "@/lib/request-scope";
import {
  normalizeSecurityAudit,
  normalizeSecurityAuditItem,
  type SecurityAudit,
  type SecurityAuditItem,
  type SecurityAuditStatus,
  type SecuritySeverity,
} from "@/lib/security/types";

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

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is required to save security audits.");
  }

  const { data, error } = await supabase
    .from("security_audits")
    .upsert(withAppScope(auditToRow(audit)), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { audit: auditFromRow(data as SecurityAuditRow), storage: "supabase" as const };
}

export async function saveSecurityAuditItems(items: SecurityAuditItem[]) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is required to save security audit items.");
  }

  const { data, error } = await supabase
    .from("security_audit_items")
    .upsert(items.map((item) => withAppScope(itemToRow(item))), { onConflict: "id" })
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  return {
    items: (data as SecurityAuditItemRow[]).map(itemFromRow),
    storage: "supabase" as const,
  };
}

export async function listSecurityAudits() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to list security audits.");
  }

  const query = supabase
    .from("security_audits")
    .select("*")
    .order("created_at", { ascending: false });
  const { data, error } = await scopeAppData(query);

  if (error) {
    throw new Error(error.message);
  }

  return (data as SecurityAuditRow[]).map(auditFromRow);
}

export async function listSecurityAuditItems(auditId?: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to list security audit items.");
  }

  let query = scopeAppData(supabase.from("security_audit_items").select("*").order("category"));
  if (auditId) {
    query = query.eq("audit_id", auditId);
  }
  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data as SecurityAuditItemRow[]).map(itemFromRow);
}
