import { getSupabaseServerClient } from "@/lib/supabase/server";

import {
  emptySolutionCommercialInputs,
  emptySolutionProposalBrief,
  normalizeSolutionCommercialInputs,
} from "../domain/proposal";
import type {
  CombinedDatasetAnalysis,
  DatasetProfile,
  DigitalSolutionProposal,
  DigitalSolutionProposalContent,
  SolutionCommercialInputs,
  SolutionProposalBrief,
  SolutionProposalStatus,
  SolutionReview,
  SolutionSourceFile,
  SolutionType,
  SourceFileStatus,
} from "../domain/types";

export const SOLUTION_PROPOSAL_BUCKET = "solution-proposal-inputs";

type ProposalRow = {
  id: string;
  client_id: string | null;
  client_name: string;
  title: string;
  solution_type?: SolutionType | null;
  brief: Partial<SolutionProposalBrief> & Record<string, unknown>;
  status: string;
  combined_analysis: CombinedDatasetAnalysis | null;
  analyst_review: SolutionReview | null;
  proposal_content: DigitalSolutionProposalContent | null;
  commercial_inputs: SolutionCommercialInputs;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type FileRow = {
  id: string;
  proposal_id: string;
  original_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  parse_status: SourceFileStatus;
  analysis_snapshot: DatasetProfile | null;
  error_message: string;
  created_at: string;
  updated_at: string;
};

function normalizeStatus(status: string): SolutionProposalStatus {
  if (status === "Analyzing") return "Reviewing";
  if (status === "Analysis Ready") return "Review Ready";
  if (["Draft", "Reviewing", "Review Ready", "Generated", "Failed"].includes(status)) {
    return status as SolutionProposalStatus;
  }
  return "Draft";
}

function normalizeBrief(value: ProposalRow["brief"]): SolutionProposalBrief {
  const text = (key: keyof SolutionProposalBrief, fallback = "") =>
    String(value[key] ?? fallback);
  return {
    ...emptySolutionProposalBrief,
    businessBackground: text("businessBackground"),
    currentProblem: String(value.currentProblem ?? value.currentProcess ?? ""),
    currentProcess: text("currentProcess"),
    projectGoal: String(value.projectGoal ?? value.businessGoal ?? ""),
    desiredOutcomes: text("desiredOutcomes"),
    targetUsers: text("targetUsers"),
    userRoles: text("userRoles"),
    requiredFeatures: text("requiredFeatures"),
    keyWorkflows: text("keyWorkflows"),
    adminRequirements: text("adminRequirements"),
    contentRequirements: text("contentRequirements"),
    designDirection: text("designDirection"),
    languages: text("languages"),
    deviceRequirements: text("deviceRequirements"),
    integrations: text("integrations"),
    securityRequirements: text("securityRequirements"),
    domainAndHosting: text("domainAndHosting"),
    timeline: text("timeline"),
    budgetConstraints: text("budgetConstraints"),
    trainingAndMaintenance: text("trainingAndMaintenance"),
    successMeasures: text("successMeasures"),
    existingAssets: text("existingAssets"),
    constraints: text("constraints"),
  };
}

function proposalToRow(proposal: DigitalSolutionProposal) {
  return {
    id: proposal.id,
    client_id: proposal.clientId,
    client_name: proposal.clientName,
    title: proposal.title,
    solution_type: proposal.solutionType,
    brief: proposal.brief,
    status: proposal.status,
    combined_analysis: proposal.evidenceAnalysis,
    analyst_review: proposal.solutionReview,
    proposal_content: proposal.proposalContent,
    commercial_inputs: proposal.commercialInputs,
    created_by: proposal.createdBy,
    created_at: proposal.createdAt,
    updated_at: proposal.updatedAt,
  };
}

function fileFromRow(row: FileRow): SolutionSourceFile {
  return {
    id: row.id,
    proposalId: row.proposal_id,
    originalName: row.original_name,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    sha256: row.sha256,
    status: row.parse_status,
    analysis: row.analysis_snapshot,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function proposalFromRow(
  row: ProposalRow,
  files: SolutionSourceFile[] = [],
): DigitalSolutionProposal {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    title: row.title,
    solutionType: row.solution_type ?? "Other",
    brief: normalizeBrief(row.brief ?? {}),
    status: normalizeStatus(row.status),
    files,
    evidenceAnalysis: row.combined_analysis,
    solutionReview: row.analyst_review,
    proposalContent: row.proposal_content,
    commercialInputs: normalizeSolutionCommercialInputs(
      row.commercial_inputs ?? emptySolutionCommercialInputs,
    ),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requireSupabase() {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is required for digital solution proposals.");
  return supabase;
}

export async function listSolutionProposals() {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("intelligent_system_proposals")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ProposalRow[]).map((row) => proposalFromRow(row));
}

export async function getSolutionProposal(id: string) {
  const supabase = requireSupabase();
  const [proposalResult, filesResult] = await Promise.all([
    supabase.from("intelligent_system_proposals").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("intelligent_system_files")
      .select("*")
      .eq("proposal_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (proposalResult.error) throw new Error(proposalResult.error.message);
  if (filesResult.error) throw new Error(filesResult.error.message);
  if (!proposalResult.data) return null;
  return proposalFromRow(
    proposalResult.data as ProposalRow,
    (filesResult.data as FileRow[]).map(fileFromRow),
  );
}

export async function saveSolutionProposal(proposal: DigitalSolutionProposal) {
  const supabase = requireSupabase();
  const updated = { ...proposal, updatedAt: new Date().toISOString() };
  const { data, error } = await supabase
    .from("intelligent_system_proposals")
    .upsert(proposalToRow(updated), { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return proposalFromRow(data as ProposalRow, proposal.files);
}

export async function deleteSolutionProposal(id: string) {
  const supabase = requireSupabase();
  const proposal = await getSolutionProposal(id);
  if (proposal?.files.length) {
    const { error: storageError } = await supabase.storage
      .from(SOLUTION_PROPOSAL_BUCKET)
      .remove(proposal.files.map((file) => file.storagePath));
    if (storageError) throw new Error(storageError.message);
  }
  const { error } = await supabase
    .from("intelligent_system_proposals")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createSourceFile(input: {
  proposalId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const supabase = requireSupabase();
  const id = crypto.randomUUID();
  const safeName = input.originalName.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const storagePath = `${input.proposalId}/${id}-${safeName}`;
  const now = new Date().toISOString();
  const row: FileRow = {
    id,
    proposal_id: input.proposalId,
    original_name: input.originalName,
    storage_path: storagePath,
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
    sha256: "",
    parse_status: "Uploaded",
    analysis_snapshot: null,
    error_message: "",
    created_at: now,
    updated_at: now,
  };
  const { error } = await supabase.from("intelligent_system_files").insert(row);
  if (error) throw new Error(error.message);
  const { data, error: tokenError } = await supabase.storage
    .from(SOLUTION_PROPOSAL_BUCKET)
    .createSignedUploadUrl(storagePath);
  if (tokenError) throw new Error(tokenError.message);
  return { file: fileFromRow(row), path: data.path, token: data.token };
}

export async function getSourceFile(proposalId: string, fileId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("intelligent_system_files")
    .select("*")
    .eq("proposal_id", proposalId)
    .eq("id", fileId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fileFromRow(data as FileRow) : null;
}

export async function saveSourceFile(file: SolutionSourceFile) {
  const supabase = requireSupabase();
  const row: FileRow = {
    id: file.id,
    proposal_id: file.proposalId,
    original_name: file.originalName,
    storage_path: file.storagePath,
    mime_type: file.mimeType,
    size_bytes: file.sizeBytes,
    sha256: file.sha256,
    parse_status: file.status,
    analysis_snapshot: file.analysis,
    error_message: file.errorMessage,
    created_at: file.createdAt,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("intelligent_system_files")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return fileFromRow(data as FileRow);
}

export async function downloadSourceFile(file: SolutionSourceFile) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.storage
    .from(SOLUTION_PROPOSAL_BUCKET)
    .download(file.storagePath);
  if (error) throw new Error(error.message);
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteSourceFile(proposalId: string, fileId: string) {
  const supabase = requireSupabase();
  const file = await getSourceFile(proposalId, fileId);
  if (!file) return;
  const { error: storageError } = await supabase.storage
    .from(SOLUTION_PROPOSAL_BUCKET)
    .remove([file.storagePath]);
  if (storageError) throw new Error(storageError.message);
  const { error } = await supabase
    .from("intelligent_system_files")
    .delete()
    .eq("id", fileId)
    .eq("proposal_id", proposalId);
  if (error) throw new Error(error.message);
}
