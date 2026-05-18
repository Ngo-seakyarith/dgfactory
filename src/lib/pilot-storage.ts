import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  normalizePilotFeedback,
  normalizePilotGoal,
  normalizePilotIssue,
  type PilotFeedback,
  type PilotGoalStatus,
  type PilotIssue,
  type PilotIssueSeverity,
  type PilotIssueStatus,
  type PilotUrgency,
} from "@/lib/pilot";

type PilotGoalRow = {
  id: string;
  title: string;
  target_number: number | null;
  current_number: number | null;
  status: PilotGoalStatus | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type PilotIssueRow = {
  id: string;
  title: string;
  description: string | null;
  severity: PilotIssueSeverity | null;
  status: PilotIssueStatus | null;
  related_page: string | null;
  related_package_id: string | null;
  related_opportunity_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type PilotFeedbackRow = {
  id: string;
  rating: number | null;
  what_worked: string | null;
  what_was_confusing: string | null;
  what_should_improve: string | null;
  urgency: PilotUrgency | null;
  related_feature: string | null;
  related_page: string | null;
  related_package_id: string | null;
  related_opportunity_id: string | null;
  created_by: string | null;
  created_at: string;
};

function goalFromRow(row: PilotGoalRow) {
  return normalizePilotGoal({
    id: row.id,
    title: row.title,
    targetNumber: row.target_number ?? 0,
    currentNumber: row.current_number ?? 0,
    status: row.status ?? "At Risk",
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function issueToRow(issue: PilotIssue) {
  return {
    id: issue.id,
    title: issue.title,
    description: issue.description,
    severity: issue.severity,
    status: issue.status,
    related_page: issue.relatedPage || null,
    related_package_id: issue.relatedPackageId,
    related_opportunity_id: issue.relatedOpportunityId,
    created_by: issue.createdBy || null,
    created_at: issue.createdAt,
    updated_at: issue.updatedAt,
  };
}

function issueFromRow(row: PilotIssueRow) {
  return normalizePilotIssue({
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    severity: row.severity ?? "Medium",
    status: row.status ?? "Open",
    relatedPage: row.related_page ?? "",
    relatedPackageId: row.related_package_id,
    relatedOpportunityId: row.related_opportunity_id,
    createdBy: row.created_by ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function feedbackToRow(feedback: PilotFeedback) {
  return {
    id: feedback.id,
    rating: feedback.rating,
    what_worked: feedback.whatWorked,
    what_was_confusing: feedback.whatWasConfusing,
    what_should_improve: feedback.whatShouldImprove,
    urgency: feedback.urgency,
    related_feature: feedback.relatedFeature,
    related_page: feedback.relatedPage || null,
    related_package_id: feedback.relatedPackageId,
    related_opportunity_id: feedback.relatedOpportunityId,
    created_by: feedback.createdBy || null,
    created_at: feedback.createdAt,
  };
}

function feedbackFromRow(row: PilotFeedbackRow) {
  return normalizePilotFeedback({
    id: row.id,
    rating: row.rating ?? 3,
    whatWorked: row.what_worked ?? "",
    whatWasConfusing: row.what_was_confusing ?? "",
    whatShouldImprove: row.what_should_improve ?? "",
    urgency: row.urgency ?? "Medium",
    relatedFeature: row.related_feature ?? "",
    relatedPage: row.related_page ?? "",
    relatedPackageId: row.related_package_id,
    relatedOpportunityId: row.related_opportunity_id,
    createdBy: row.created_by ?? "",
    createdAt: row.created_at,
  });
}

export async function ensurePilotGoals() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to ensure pilot goals.");
  }

  const { data } = await supabase.from("pilot_goals").select("id").limit(1);

  if (!data?.length) {
    return { goals: [], storage: "supabase" as const };
  }

  return { goals: await listPilotGoals(), storage: "supabase" as const };
}

export async function listPilotGoals() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to list pilot goals.");
  }

  const { data, error } = await supabase
    .from("pilot_goals")
    .select("*")
    .order("created_at");

  if (error) {
    throw new Error(error.message);
  }

  return (data as PilotGoalRow[]).map(goalFromRow);
}

export async function listPilotIssues() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to list pilot issues.");
  }

  const { data, error } = await supabase
    .from("pilot_issues")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as PilotIssueRow[]).map(issueFromRow);
}

export async function savePilotIssue(input: Partial<PilotIssue>) {
  const issue = normalizePilotIssue({
    ...input,
    updatedAt: new Date().toISOString(),
  });

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is required to save pilot issues.");
  }

  const { data, error } = await supabase
    .from("pilot_issues")
    .upsert(issueToRow(issue), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { issue: issueFromRow(data as PilotIssueRow), storage: "supabase" as const };
}

export async function listPilotFeedback() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to list pilot feedback.");
  }

  const { data, error } = await supabase
    .from("pilot_feedback")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as PilotFeedbackRow[]).map(feedbackFromRow);
}

export async function savePilotFeedback(input: Partial<PilotFeedback>) {
  const feedback = normalizePilotFeedback(input);
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to save pilot feedback.");
  }

  const { data, error } = await supabase
    .from("pilot_feedback")
    .insert(feedbackToRow(feedback))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    feedback: feedbackFromRow(data as PilotFeedbackRow),
    storage: "supabase" as const,
  };
}

export async function getPilotSnapshot() {
  await ensurePilotGoals();
  const [goals, issues, feedback] = await Promise.all([
    listPilotGoals(),
    listPilotIssues(),
    listPilotFeedback(),
  ]);

  return { goals, issues, feedback };
}
