import { getSupabaseServerClient } from "@/lib/supabase/server";
import { saveAuditLog } from "@/lib/audit";
import {
  isApprovalRiskLevel,
  isApprovalStatus,
  normalizeApprovalRequest,
  normalizeOrchestratorLog,
  type ApprovalRequest,
  type ApprovalRiskLevel,
  type ApprovalStatus,
  type OrchestratorLog,
} from "@/lib/orchestrator/commands";

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

type OrchestratorLogRow = {
  id: string;
  command: string;
  payload: Record<string, unknown> | null;
  result_summary: string | null;
  status: OrchestratorLog["status"] | null;
  created_at: string;
};

type OrchestratorStore = {
  approvals: ApprovalRequest[];
  logs: OrchestratorLog[];
};

const globalForOrchestratorStore = globalThis as typeof globalThis & {
  __dgOrchestratorStore?: OrchestratorStore;
};

const localStore =
  globalForOrchestratorStore.__dgOrchestratorStore ??
  (globalForOrchestratorStore.__dgOrchestratorStore = {
    approvals: [],
    logs: [],
  });

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

function logToRow(log: OrchestratorLog) {
  return {
    id: log.id,
    command: log.command,
    payload: log.payload,
    result_summary: log.resultSummary,
    status: log.status,
    created_at: log.createdAt,
  };
}

function logFromRow(row: OrchestratorLogRow) {
  return normalizeOrchestratorLog({
    id: row.id,
    command: row.command,
    payload: row.payload ?? {},
    resultSummary: row.result_summary ?? "",
    status: row.status ?? "Completed",
    createdAt: row.created_at,
  });
}

function upsertLocalApproval(approval: ApprovalRequest) {
  const index = localStore.approvals.findIndex((item) => item.id === approval.id);

  if (index >= 0) {
    localStore.approvals[index] = approval;
  } else {
    localStore.approvals.unshift(approval);
  }

  return approval;
}

function upsertLocalLog(log: OrchestratorLog) {
  const index = localStore.logs.findIndex((item) => item.id === log.id);

  if (index >= 0) {
    localStore.logs[index] = log;
  } else {
    localStore.logs.unshift(log);
  }

  return log;
}

export async function listApprovalRequests(filters: {
  status?: ApprovalStatus;
} = {}) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return localStore.approvals
      .filter((approval) =>
        filters.status ? approval.status === filters.status : true,
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  let query = supabase
    .from("approval_requests")
    .select("*")
    .order("updated_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    return localStore.approvals;
  }

  return (data as ApprovalRequestRow[]).map(approvalFromRow);
}

export async function getApprovalRequest(id: string) {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("approval_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      return approvalFromRow(data as ApprovalRequestRow);
    }
  }

  return localStore.approvals.find((approval) => approval.id === id) ?? null;
}

export async function saveApprovalRequest(input: Partial<ApprovalRequest>) {
  const approval = normalizeApprovalRequest(input);
  upsertLocalApproval(approval);
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { approval, storage: "local" as const };
  }

  const { data, error } = await supabase
    .from("approval_requests")
    .upsert(approvalToRow(approval), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    return { approval, storage: "local" as const };
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

  if (!current) {
    throw new Error("Approval request not found.");
  }

  const updated = normalizeApprovalRequest({
    ...current,
    status,
    humanNote: humanNote ?? current.humanNote,
    updatedAt: new Date().toISOString(),
  });
  upsertLocalApproval(updated);
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { approval: updated, storage: "local" as const };
  }

  const { data, error } = await supabase
    .from("approval_requests")
    .update({
      status: updated.status,
      human_note: updated.humanNote,
      updated_at: updated.updatedAt,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return { approval: updated, storage: "local" as const };
  }

  return {
    approval: approvalFromRow(data as ApprovalRequestRow),
    storage: "supabase" as const,
  };
}

export async function saveOrchestratorLog(input: Partial<OrchestratorLog>) {
  const log = normalizeOrchestratorLog(input);
  upsertLocalLog(log);
  await saveAuditLog({
    actor: "OpenClaw",
    action: "orchestrator_command",
    entityType: "orchestrator_log",
    entityId: log.id,
    metadata: {
      command: log.command,
      status: log.status,
      resultSummary: log.resultSummary,
      payload: log.payload,
    },
  });
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { log, storage: "local" as const };
  }

  const { data, error } = await supabase
    .from("orchestrator_logs")
    .insert(logToRow(log))
    .select("*")
    .single();

  if (error) {
    return { log, storage: "local" as const };
  }

  return {
    log: logFromRow(data as OrchestratorLogRow),
    storage: "supabase" as const,
  };
}

export async function listOrchestratorLogs() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return [...localStore.logs].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  const { data, error } = await supabase
    .from("orchestrator_logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return localStore.logs;
  }

  return (data as OrchestratorLogRow[]).map(logFromRow);
}
