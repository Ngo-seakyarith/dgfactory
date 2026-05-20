import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scopeByOrganization, withOrganizationId } from "@/lib/organization-scope";

export const approvalStatuses = [
  "Pending",
  "Approved",
  "Rejected",
  "Expired",
] as const;

export type ApprovalStatus = (typeof approvalStatuses)[number];

export const approvalRiskLevels = ["Low", "Medium", "High"] as const;

export type ApprovalRiskLevel = (typeof approvalRiskLevels)[number];

export type ApprovalRequest = {
  id: string;
  requestedBy: string;
  actionType: string;
  payload: Record<string, unknown>;
  status: ApprovalStatus;
  riskLevel: ApprovalRiskLevel;
  humanNote: string;
  createdAt: string;
  updatedAt: string;
};

type ApprovalRequestRow = {
  id: string;
  requested_by: string;
  action_type: string;
  payload: Record<string, unknown> | null;
  status: ApprovalStatus | null;
  risk_level: ApprovalRiskLevel | null;
  human_note: string | null;
  created_at: string;
  updated_at: string;
};

export function isApprovalStatus(value: unknown): value is ApprovalStatus {
  return (
    typeof value === "string" &&
    approvalStatuses.includes(value as ApprovalStatus)
  );
}

export function isApprovalRiskLevel(value: unknown): value is ApprovalRiskLevel {
  return (
    typeof value === "string" &&
    approvalRiskLevels.includes(value as ApprovalRiskLevel)
  );
}

export function normalizePayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function normalizeApprovalRequest(
  value: Partial<ApprovalRequest>,
): ApprovalRequest {
  const now = new Date().toISOString();

  return {
    id: value.id || crypto.randomUUID(),
    requestedBy: String(value.requestedBy ?? "System").trim(),
    actionType: String(value.actionType ?? "REQUEST_APPROVAL").trim(),
    payload: normalizePayload(value.payload),
    status: isApprovalStatus(value.status) ? value.status : "Pending",
    riskLevel: isApprovalRiskLevel(value.riskLevel) ? value.riskLevel : "Medium",
    humanNote: String(value.humanNote ?? "").trim(),
    createdAt: value.createdAt || now,
    updatedAt: value.updatedAt || now,
  };
}

function approvalToRow(approval: ApprovalRequest) {
  return {
    id: approval.id,
    requested_by: approval.requestedBy,
    action_type: approval.actionType,
    payload: approval.payload,
    status: approval.status,
    risk_level: approval.riskLevel,
    human_note: approval.humanNote,
    created_at: approval.createdAt,
    updated_at: approval.updatedAt,
  };
}

function approvalFromRow(row: ApprovalRequestRow) {
  return normalizeApprovalRequest({
    id: row.id,
    requestedBy: row.requested_by,
    actionType: row.action_type,
    payload: row.payload ?? {},
    status: isApprovalStatus(row.status) ? row.status : "Pending",
    riskLevel: isApprovalRiskLevel(row.risk_level) ? row.risk_level : "Medium",
    humanNote: row.human_note ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export async function listApprovalRequests(filters: {
  status?: ApprovalStatus;
} = {}) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to list approval requests.");
  }

  let query = scopeByOrganization(supabase
    .from("approval_requests")
    .select("*")
    .order("updated_at", { ascending: false }));

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data as ApprovalRequestRow[]).map(approvalFromRow);
}

export async function getApprovalRequest(id: string) {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await scopeByOrganization(
      supabase.from("approval_requests").select("*").eq("id", id),
    ).maybeSingle();

    if (!error && data) {
      return approvalFromRow(data as ApprovalRequestRow);
    }
  }

  throw new Error("Supabase is required to load approval requests.");
}

export async function saveApprovalRequest(input: Partial<ApprovalRequest>) {
  const approval = normalizeApprovalRequest(input);
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to save approval requests.");
  }

  const { data, error } = await supabase
    .from("approval_requests")
    .upsert(withOrganizationId(approvalToRow(approval)), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    approval: approvalFromRow(data as ApprovalRequestRow),
    storage: "supabase" as const,
  };
}

export async function updateApprovalRequest({
  id,
  status,
  humanNote,
}: {
  id: string;
  status: ApprovalStatus;
  humanNote?: string;
}) {
  const current = await getApprovalRequest(id);
  const updated = normalizeApprovalRequest({
    ...current,
    status,
    humanNote: humanNote ?? current.humanNote,
    updatedAt: new Date().toISOString(),
  });
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to update approval requests.");
  }

  const { data, error } = await scopeByOrganization(
    supabase
      .from("approval_requests")
      .update({
        status: updated.status,
        human_note: updated.humanNote,
        updated_at: updated.updatedAt,
      })
      .eq("id", id),
  )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    approval: approvalFromRow(data as ApprovalRequestRow),
    storage: "supabase" as const,
  };
}
