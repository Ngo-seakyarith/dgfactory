import { getSupabaseServerClient } from "@/lib/supabase/server";

import type {
  AnalystReview,
  CombinedDatasetAnalysis,
  DatasetProfile,
  IntelligentSystemProposal,
  IntelligentSystemProposalContent,
  SourceFileStatus,
  SystemCommercialInputs,
  SystemProposalBrief,
  SystemProposalStatus,
  SystemSourceFile,
} from "../domain/types";

export const SYSTEM_PROPOSAL_BUCKET = "system-proposal-inputs";

type ProposalRow = {
  id: string;
  client_id: string | null;
  client_name: string;
  title: string;
  brief: SystemProposalBrief;
  status: SystemProposalStatus;
  combined_analysis: CombinedDatasetAnalysis | null;
  analyst_review: AnalystReview | null;
  proposal_content: IntelligentSystemProposalContent | null;
  commercial_inputs: SystemCommercialInputs;
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

function proposalToRow(proposal: IntelligentSystemProposal) {
  return {
    id: proposal.id,
    client_id: proposal.brief.clientId,
    client_name: proposal.brief.clientName,
    title: proposal.brief.projectTitle,
    brief: proposal.brief,
    status: proposal.status,
    combined_analysis: proposal.combinedAnalysis,
    analyst_review: proposal.analystReview,
    proposal_content: proposal.proposalContent,
    commercial_inputs: proposal.commercialInputs,
    created_by: proposal.createdBy,
    created_at: proposal.createdAt,
    updated_at: proposal.updatedAt,
  };
}

function fileFromRow(row: FileRow): SystemSourceFile {
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

function proposalFromRow(row: ProposalRow, files: SystemSourceFile[] = []): IntelligentSystemProposal {
  return {
    id: row.id,
    brief: {
      clientId: row.client_id,
      clientName: row.client_name,
      projectTitle: row.title,
      businessGoal: row.brief?.businessGoal ?? "",
      currentProcess: row.brief?.currentProcess ?? "",
      desiredOutcomes: row.brief?.desiredOutcomes ?? "",
      constraints: row.brief?.constraints ?? "",
      integrations: row.brief?.integrations ?? "",
    },
    status: row.status,
    files,
    combinedAnalysis: row.combined_analysis,
    analystReview: row.analyst_review,
    proposalContent: row.proposal_content,
    commercialInputs: row.commercial_inputs,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requireSupabase() {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is required for system proposals.");
  return supabase;
}

export async function listSystemProposals() {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("intelligent_system_proposals")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ProposalRow[]).map((row) => proposalFromRow(row));
}

export async function getSystemProposal(id: string) {
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

export async function saveSystemProposal(proposal: IntelligentSystemProposal) {
  const supabase = requireSupabase();
  const value = { ...proposal, updatedAt: new Date().toISOString() };
  const { data, error } = await supabase
    .from("intelligent_system_proposals")
    .upsert(proposalToRow(value), { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return proposalFromRow(data as ProposalRow, proposal.files);
}

export async function deleteSystemProposal(id: string) {
  const supabase = requireSupabase();
  const { data: files, error: filesError } = await supabase
    .from("intelligent_system_files")
    .select("storage_path")
    .eq("proposal_id", id);
  if (filesError) throw new Error(filesError.message);
  const paths = (files as Array<{ storage_path: string }>).map((file) => file.storage_path);
  if (paths.length) {
    const removal = await supabase.storage.from(SYSTEM_PROPOSAL_BUCKET).remove(paths);
    if (removal.error) throw new Error(removal.error.message);
  }
  const { error } = await supabase
    .from("intelligent_system_proposals")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createSourceFile({
  proposalId,
  originalName,
  mimeType,
  sizeBytes,
}: {
  proposalId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const supabase = requireSupabase();
  const id = crypto.randomUUID();
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120);
  const storagePath = `${proposalId}/${id}/${safeName}`;
  const now = new Date().toISOString();
  const row: FileRow = {
    id,
    proposal_id: proposalId,
    original_name: originalName,
    storage_path: storagePath,
    mime_type: mimeType,
    size_bytes: sizeBytes,
    sha256: "",
    parse_status: "Uploaded",
    analysis_snapshot: null,
    error_message: "",
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await supabase
    .from("intelligent_system_files")
    .insert(row)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const signed = await supabase.storage
    .from(SYSTEM_PROPOSAL_BUCKET)
    .createSignedUploadUrl(storagePath);
  if (signed.error || !signed.data) {
    await supabase.from("intelligent_system_files").delete().eq("id", id);
    throw new Error(signed.error?.message ?? "Unable to create upload token.");
  }
  return {
    file: fileFromRow(data as FileRow),
    path: signed.data.path,
    token: signed.data.token,
  };
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

export async function saveSourceFile(file: SystemSourceFile) {
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

export async function downloadSourceFile(file: SystemSourceFile) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.storage
    .from(SYSTEM_PROPOSAL_BUCKET)
    .download(file.storagePath);
  if (error || !data) throw new Error(error?.message ?? "Unable to download source file.");
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteSourceFile(proposalId: string, fileId: string) {
  const supabase = requireSupabase();
  const file = await getSourceFile(proposalId, fileId);
  if (!file) return;
  const removal = await supabase.storage
    .from(SYSTEM_PROPOSAL_BUCKET)
    .remove([file.storagePath]);
  if (removal.error) throw new Error(removal.error.message);
  const { error } = await supabase
    .from("intelligent_system_files")
    .delete()
    .eq("proposal_id", proposalId)
    .eq("id", fileId);
  if (error) throw new Error(error.message);
}

