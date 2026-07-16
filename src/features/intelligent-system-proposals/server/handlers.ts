import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import { routeBrainTask } from "@/lib/brain/routing/router";
import { resolvePackageClient } from "@/lib/crm-storage";
import type { ClientProfileInput } from "@/lib/crm";
import { requireApproved } from "@/lib/route-guards";

import { combineDatasetProfiles } from "../domain/analysis";
import {
  createSystemProposal,
  formatSystemCommercialSummary,
  normalizeAnalystReview,
  safeAnalysisForBrain,
} from "../domain/proposal";
import type {
  DataDiscoveryBrainOutput,
  IntelligentSystemProposal,
  SystemProposalBrainOutput,
} from "../domain/types";
import { exportSystemProposalDocx } from "../export/docx";
import {
  SYSTEM_FILE_LIMIT_BYTES,
  SYSTEM_PROJECT_FILE_LIMIT,
  SYSTEM_PROJECT_ROW_LIMIT,
  analyzeSourceFile,
} from "./analyze-file";
import {
  createSourceFile,
  deleteSourceFile,
  deleteSystemProposal,
  downloadSourceFile,
  getSourceFile,
  getSystemProposal,
  listSystemProposals,
  saveSourceFile,
  saveSystemProposal,
} from "../storage/system-proposal-storage";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "System proposal request failed.";
}

function validateBrief(proposal: IntelligentSystemProposal) {
  const missing = [
    ["client", proposal.brief.clientName],
    ["project title", proposal.brief.projectTitle],
    ["business goal", proposal.brief.businessGoal],
  ]
    .filter(([, value]) => !String(value ?? "").trim())
    .map(([label]) => label);
  if (missing.length) throw new Error(`Missing required fields: ${missing.join(", ")}.`);
}

export async function listSystemProposalsRequest(request: Request) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ proposals: await listSystemProposals() });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

async function upsertSystemProposalRequest(request: Request, expectedId?: string) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const body = (await request.json()) as {
      proposal?: IntelligentSystemProposal;
      client?: ClientProfileInput;
      brief?: IntelligentSystemProposal["brief"];
    };
    const proposal = body.proposal ?? createSystemProposal(body.brief, auth.user.userId ?? null);
    if (expectedId && proposal.id !== expectedId) {
      throw new Error("The proposal ID does not match this route.");
    }
    validateBrief(proposal);
    const clientInput = body.client ?? {
      id: proposal.brief.clientId ?? undefined,
      name: proposal.brief.clientName,
    };
    const clientResult = await resolvePackageClient(clientInput, proposal.brief.clientName);
    const saved = await saveSystemProposal({
      ...proposal,
      brief: {
        ...proposal.brief,
        clientId: clientResult.client.id,
        clientName: clientResult.client.name,
      },
      createdBy: proposal.createdBy ?? auth.user.userId ?? null,
    });
    await Promise.all(
      proposal.files.map((file) =>
        saveSourceFile({ ...file, proposalId: saved.id }),
      ),
    );
    await saveAuditLog({
      actor: auth.user.actor,
      action: "system_proposal_saved",
      entityType: "intelligent_system_proposal",
      entityId: saved.id,
      metadata: { title: saved.brief.projectTitle, client: saved.brief.clientName },
    });
    return NextResponse.json({ proposal: await getSystemProposal(saved.id), client: clientResult.client });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
}

export async function createSystemProposalRequest(request: Request) {
  return upsertSystemProposalRequest(request);
}

export async function updateSystemProposalRequest(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return upsertSystemProposalRequest(request, id);
}

export async function getSystemProposalRequest(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    const proposal = await getSystemProposal(id);
    return proposal
      ? NextResponse.json({ proposal })
      : NextResponse.json({ error: "System proposal was not found." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function deleteSystemProposalRequest(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    await deleteSystemProposal(id);
    await saveAuditLog({
      actor: auth.user.actor,
      action: "system_proposal_deleted",
      entityType: "intelligent_system_proposal",
      entityId: id,
      metadata: {},
    });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function createSystemUploadTokenRequest(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    const proposal = await getSystemProposal(id);
    if (!proposal) return NextResponse.json({ error: "System proposal was not found." }, { status: 404 });
    if (proposal.files.length >= SYSTEM_PROJECT_FILE_LIMIT) {
      return NextResponse.json({ error: "A project can contain up to five source files." }, { status: 400 });
    }
    const body = (await request.json()) as {
      name?: string;
      mimeType?: string;
      sizeBytes?: number;
    };
    const name = String(body.name ?? "").trim();
    const extension = name.toLowerCase().split(".").pop();
    if (!name || !["xlsx", "csv"].includes(extension ?? "")) {
      return NextResponse.json({ error: "Only .xlsx and .csv files are supported." }, { status: 400 });
    }
    const sizeBytes = Number(body.sizeBytes ?? 0);
    if (sizeBytes <= 0 || sizeBytes > SYSTEM_FILE_LIMIT_BYTES) {
      return NextResponse.json({ error: "Each source file must be 10 MB or smaller." }, { status: 400 });
    }
    const upload = await createSourceFile({
      proposalId: id,
      originalName: name,
      mimeType: String(body.mimeType || (extension === "csv" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")),
      sizeBytes,
    });
    await saveAuditLog({
      actor: auth.user.actor,
      action: "system_source_upload_created",
      entityType: "intelligent_system_proposal",
      entityId: id,
      metadata: { fileId: upload.file.id, fileName: name, sizeBytes },
    });
    return NextResponse.json(upload);
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function analyzeSystemFileRequest(
  request: Request,
  context: { params: Promise<{ id: string; fileId: string }> },
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  const { id, fileId } = await context.params;
  const file = await getSourceFile(id, fileId);
  if (!file) return NextResponse.json({ error: "Source file was not found." }, { status: 404 });
  try {
    await saveSourceFile({ ...file, status: "Analyzing", errorMessage: "" });
    const proposal = await getSystemProposal(id);
    if (!proposal) throw new Error("System proposal was not found.");
    const alreadyAnalyzed = proposal.files
      .filter((item) => item.id !== fileId)
      .reduce((sum, item) => sum + (item.analysis?.analyzedRows ?? 0), 0);
    const buffer = await downloadSourceFile(file);
    const checksum = createHash("sha256").update(buffer).digest("hex");
    if (proposal.files.some((item) => item.id !== fileId && item.sha256 === checksum)) {
      throw new Error("This source file is already included in the project.");
    }
    const analysis = await analyzeSourceFile({
      fileId,
      fileName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: buffer.length,
      buffer,
      maxRows: Math.max(0, SYSTEM_PROJECT_ROW_LIMIT - alreadyAnalyzed),
    });
    await saveSourceFile({
      ...file,
      sizeBytes: buffer.length,
      sha256: checksum,
      status: "Ready",
      analysis,
      errorMessage: "",
    });
    const refreshed = await getSystemProposal(id);
    if (!refreshed) throw new Error("System proposal was not found after analysis.");
    refreshed.combinedAnalysis = combineDatasetProfiles(
      refreshed.files.flatMap((item) => (item.analysis ? [item.analysis] : [])),
    );
    refreshed.analystReview = null;
    refreshed.proposalContent = null;
    refreshed.status = "Analysis Ready";
    await saveSystemProposal(refreshed);
    await saveAuditLog({
      actor: auth.user.actor,
      action: "system_source_analyzed",
      entityType: "intelligent_system_proposal",
      entityId: id,
      metadata: {
        fileId,
        fileName: file.originalName,
        rows: analysis.totalRows,
        analyzedRows: analysis.analyzedRows,
        partial: analysis.partial,
      },
    });
    return NextResponse.json({ proposal: await getSystemProposal(id) });
  } catch (error) {
    await saveSourceFile({
      ...file,
      status: "Failed",
      analysis: null,
      errorMessage: errorMessage(error),
    });
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
}

export async function runSystemDiscoveryRequest(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    const proposal = await getSystemProposal(id);
    if (!proposal?.combinedAnalysis || !proposal.files.some((file) => file.status === "Ready")) {
      return NextResponse.json({ error: "Analyze at least one source file first." }, { status: 400 });
    }
    proposal.combinedAnalysis = combineDatasetProfiles(
      proposal.files.flatMap((file) => (file.analysis ? [file.analysis] : [])),
    );
    proposal.status = "Analyzing";
    await saveSystemProposal(proposal);
    const result = await routeBrainTask<
      { brief: IntelligentSystemProposal["brief"]; analysis: ReturnType<typeof safeAnalysisForBrain> },
      DataDiscoveryBrainOutput
    >({
      taskType: "data_discovery",
      input: {
        brief: proposal.brief,
        analysis: safeAnalysisForBrain(proposal.combinedAnalysis),
      },
      retries: 1,
    });
    proposal.analystReview = normalizeAnalystReview(result.output.analystReview);
    proposal.status = "Analysis Ready";
    await saveSystemProposal(proposal);
    await saveAuditLog({
      actor: auth.user.actor,
      action: "system_data_discovery_generated",
      entityType: "intelligent_system_proposal",
      entityId: id,
      metadata: { model: result.model, files: proposal.files.length },
    });
    return NextResponse.json({ proposal: await getSystemProposal(id), model: result.model });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function generateSystemProposalRequest(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      proposal?: IntelligentSystemProposal;
    };
    let proposal = body.proposal ?? (await getSystemProposal(id));
    if (!proposal) return NextResponse.json({ error: "System proposal was not found." }, { status: 404 });
    validateBrief(proposal);
    if (!proposal.combinedAnalysis || !proposal.analystReview) {
      return NextResponse.json({ error: "Complete and review the data analysis first." }, { status: 400 });
    }
    proposal = await saveSystemProposal(proposal);
    const combinedAnalysis = proposal.combinedAnalysis;
    const analystReview = proposal.analystReview;
    if (!combinedAnalysis || !analystReview) {
      return NextResponse.json({ error: "The reviewed analysis could not be saved." }, { status: 500 });
    }
    const commercialSummary = formatSystemCommercialSummary(proposal.commercialInputs);
    const result = await routeBrainTask<
      {
        brief: IntelligentSystemProposal["brief"];
        analysis: ReturnType<typeof safeAnalysisForBrain>;
        analystReview: NonNullable<IntelligentSystemProposal["analystReview"]>;
        commercialSummary: string;
      },
      SystemProposalBrainOutput
    >({
      taskType: "intelligent_system_proposal",
      input: {
        brief: proposal.brief,
        analysis: safeAnalysisForBrain(combinedAnalysis),
        analystReview,
        commercialSummary,
      },
      retries: 1,
    });
    proposal.proposalContent = {
      ...result.output.proposalContent,
      coverHeading: "Intelligent System Proposal",
      solutionTitle: proposal.brief.projectTitle,
      client: proposal.brief.clientName,
    };
    proposal.status = "Generated";
    await saveSystemProposal(proposal);
    await saveAuditLog({
      actor: auth.user.actor,
      action: "system_proposal_generated",
      entityType: "intelligent_system_proposal",
      entityId: id,
      metadata: { model: result.model, title: proposal.brief.projectTitle },
    });
    return NextResponse.json({ proposal: await getSystemProposal(id), model: result.model });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function exportSystemProposalRequest(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    const proposal = await getSystemProposal(id);
    if (!proposal) return NextResponse.json({ error: "System proposal was not found." }, { status: 404 });
    const result = await exportSystemProposalDocx(proposal);
    await saveAuditLog({
      actor: auth.user.actor,
      action: "system_proposal_exported",
      entityType: "intelligent_system_proposal",
      entityId: id,
      metadata: { filename: result.filename },
    });
    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function deleteSystemFileRequest(
  request: Request,
  context: { params: Promise<{ id: string; fileId: string }> },
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const { id, fileId } = await context.params;
    await deleteSourceFile(id, fileId);
    const proposal = await getSystemProposal(id);
    if (proposal) {
      proposal.combinedAnalysis = proposal.files.length
        ? combineDatasetProfiles(proposal.files.flatMap((file) => (file.analysis ? [file.analysis] : [])))
        : null;
      proposal.analystReview = null;
      proposal.proposalContent = null;
      proposal.status = proposal.files.length ? "Analysis Ready" : "Draft";
      await saveSystemProposal(proposal);
    }
    await saveAuditLog({
      actor: auth.user.actor,
      action: "system_source_deleted",
      entityType: "intelligent_system_proposal",
      entityId: id,
      metadata: { fileId },
    });
    return NextResponse.json({ proposal: await getSystemProposal(id) });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
