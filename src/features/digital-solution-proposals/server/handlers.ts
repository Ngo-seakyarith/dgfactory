import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import type { StartGenerationJob } from "@/features/generation-jobs/domain/types";
import { saveAuditLog } from "@/lib/audit";
import type { ClientProfileInput } from "@/lib/crm";
import { resolvePackageClient } from "@/lib/crm-storage";
import { requireApproved } from "@/lib/route-guards";

import { combineDatasetProfiles } from "../domain/analysis";
import { createSolutionProposal } from "../domain/proposal";
import type { DigitalSolutionProposal } from "../domain/types";
import { exportSolutionProposalDocx } from "../export/docx";
import {
  createSourceFile,
  deleteSolutionProposal,
  deleteSourceFile,
  downloadSourceFile,
  getSolutionProposal,
  getSourceFile,
  listSolutionProposals,
  saveSolutionProposal,
  saveSourceFile,
} from "../storage/solution-proposal-storage";
import {
  SYSTEM_FILE_LIMIT_BYTES,
  SYSTEM_PROJECT_FILE_LIMIT,
  SYSTEM_PROJECT_ROW_LIMIT,
  analyzeSourceFile,
} from "./analyze-file";

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Digital solution proposal request failed.";
}

function validateBrief(proposal: DigitalSolutionProposal) {
  const missing = [
    ["client", proposal.clientName],
    ["project title", proposal.title],
    ["current problem", proposal.brief.currentProblem],
    ["project goal", proposal.brief.projectGoal],
  ]
    .filter(([, value]) => !String(value ?? "").trim())
    .map(([label]) => label);
  if (missing.length) {
    throw new Error(`Missing required fields: ${missing.join(", ")}.`);
  }
}

function validateDraftIdentity(proposal: DigitalSolutionProposal) {
  const missing = [
    ["client", proposal.clientName],
    ["project title", proposal.title],
  ]
    .filter(([, value]) => !String(value ?? "").trim())
    .map(([label]) => label);
  if (missing.length) {
    throw new Error(`Add ${missing.join(" and ")} before saving this draft.`);
  }
}

function discoveryChanged(
  current: DigitalSolutionProposal | null,
  incoming: DigitalSolutionProposal,
) {
  if (!current) return false;
  return JSON.stringify({
    clientId: current.clientId,
    clientName: current.clientName,
    title: current.title,
    solutionType: current.solutionType,
    brief: current.brief,
  }) !== JSON.stringify({
    clientId: incoming.clientId,
    clientName: incoming.clientName,
    title: incoming.title,
    solutionType: incoming.solutionType,
    brief: incoming.brief,
  });
}

export async function listSolutionProposalsRequest(request: Request) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ proposals: await listSolutionProposals() });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

async function upsertSolutionProposalRequest(request: Request, expectedId?: string) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const body = (await request.json()) as {
      proposal?: DigitalSolutionProposal;
      client?: ClientProfileInput;
    };
    const proposal = body.proposal ?? createSolutionProposal({}, auth.user.userId ?? null);
    if (expectedId && proposal.id !== expectedId) {
      throw new Error("The proposal ID does not match this route.");
    }
    validateDraftIdentity(proposal);

    const current = expectedId ? await getSolutionProposal(expectedId) : null;
    const resetReview = discoveryChanged(current, proposal);
    const clientInput = body.client ?? {
      id: proposal.clientId ?? undefined,
      name: proposal.clientName,
    };
    const clientResult = await resolvePackageClient(clientInput, proposal.clientName);
    const saved = await saveSolutionProposal({
      ...proposal,
      clientId: clientResult.client.id,
      clientName: clientResult.client.name,
      status: resetReview ? "Draft" : proposal.status,
      solutionReview: resetReview ? null : proposal.solutionReview,
      proposalContent: resetReview ? null : proposal.proposalContent,
      createdBy: proposal.createdBy ?? auth.user.userId ?? null,
    });

    await Promise.all(
      proposal.files.map((file) =>
        saveSourceFile({ ...file, proposalId: saved.id }),
      ),
    );
    await saveAuditLog({
      actor: auth.user.actor,
      action: "digital_solution_proposal_saved",
      entityType: "digital_solution_proposal",
      entityId: saved.id,
      metadata: {
        title: saved.title,
        client: saved.clientName,
        solutionType: saved.solutionType,
      },
    });
    return NextResponse.json({
      proposal: await getSolutionProposal(saved.id),
      client: clientResult.client,
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
}

export async function createSolutionProposalRequest(request: Request) {
  return upsertSolutionProposalRequest(request);
}

export async function updateSolutionProposalRequest(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return upsertSolutionProposalRequest(request, id);
}

export async function getSolutionProposalRequest(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    const proposal = await getSolutionProposal(id);
    return proposal
      ? NextResponse.json({ proposal })
      : NextResponse.json(
          { error: "Digital solution proposal was not found." },
          { status: 404 },
        );
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function deleteSolutionProposalRequest(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    await deleteSolutionProposal(id);
    await saveAuditLog({
      actor: auth.user.actor,
      action: "digital_solution_proposal_deleted",
      entityType: "digital_solution_proposal",
      entityId: id,
      metadata: {},
    });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function createSolutionUploadTokenRequest(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    const proposal = await getSolutionProposal(id);
    if (!proposal) {
      return NextResponse.json(
        { error: "Digital solution proposal was not found." },
        { status: 404 },
      );
    }
    if (proposal.files.length >= SYSTEM_PROJECT_FILE_LIMIT) {
      return NextResponse.json(
        { error: "A project can contain up to five supporting data files." },
        { status: 400 },
      );
    }
    const body = (await request.json()) as {
      name?: string;
      mimeType?: string;
      sizeBytes?: number;
    };
    const name = String(body.name ?? "").trim();
    const extension = name.toLowerCase().split(".").pop();
    if (!name || !["xlsx", "csv"].includes(extension ?? "")) {
      return NextResponse.json(
        { error: "Supporting data must be an .xlsx or .csv file." },
        { status: 400 },
      );
    }
    const sizeBytes = Number(body.sizeBytes ?? 0);
    if (sizeBytes <= 0 || sizeBytes > SYSTEM_FILE_LIMIT_BYTES) {
      return NextResponse.json(
        { error: "Each supporting file must be 10 MB or smaller." },
        { status: 400 },
      );
    }
    const upload = await createSourceFile({
      proposalId: id,
      originalName: name,
      mimeType: String(
        body.mimeType ||
          (extension === "csv"
            ? "text/csv"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
      ),
      sizeBytes,
    });
    return NextResponse.json(upload);
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function analyzeSolutionFileRequest(
  request: Request,
  context: { params: Promise<{ id: string; fileId: string }> },
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  const { id, fileId } = await context.params;
  const file = await getSourceFile(id, fileId);
  if (!file) {
    return NextResponse.json({ error: "Supporting file was not found." }, { status: 404 });
  }
  try {
    await saveSourceFile({ ...file, status: "Analyzing", errorMessage: "" });
    const proposal = await getSolutionProposal(id);
    if (!proposal) throw new Error("Digital solution proposal was not found.");
    const alreadyAnalyzed = proposal.files
      .filter((item) => item.id !== fileId)
      .reduce((sum, item) => sum + (item.analysis?.analyzedRows ?? 0), 0);
    const buffer = await downloadSourceFile(file);
    const checksum = createHash("sha256").update(buffer).digest("hex");
    if (proposal.files.some((item) => item.id !== fileId && item.sha256 === checksum)) {
      throw new Error("This supporting file is already included in the project.");
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
    const refreshed = await getSolutionProposal(id);
    if (!refreshed) throw new Error("Digital solution proposal was not found after analysis.");
    refreshed.evidenceAnalysis = combineDatasetProfiles(
      refreshed.files.flatMap((item) => (item.analysis ? [item.analysis] : [])),
    );
    refreshed.solutionReview = null;
    refreshed.proposalContent = null;
    refreshed.status = "Draft";
    await saveSolutionProposal(refreshed);
    await saveAuditLog({
      actor: auth.user.actor,
      action: "solution_evidence_analyzed",
      entityType: "digital_solution_proposal",
      entityId: id,
      metadata: {
        fileId,
        fileName: file.originalName,
        rows: analysis.totalRows,
        analyzedRows: analysis.analyzedRows,
        partial: analysis.partial,
      },
    });
    return NextResponse.json({ proposal: await getSolutionProposal(id) });
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

export async function runSolutionReviewRequest(
  request: Request,
  context: { params: Promise<{ id: string }> },
  startGenerationJob: StartGenerationJob,
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    const proposal = await getSolutionProposal(id);
    if (!proposal) {
      return NextResponse.json(
        { error: "Digital solution proposal was not found." },
        { status: 404 },
      );
    }
    validateBrief(proposal);
    proposal.status = "Reviewing";
    await saveSolutionProposal(proposal);
    const job = await startGenerationJob({
      jobType: "solution_review",
      resourceType: "digital_solution_proposal",
      resourceId: id,
      createdBy: auth.user.userId ?? null,
      createdByActor: auth.user.actor,
    });
    return NextResponse.json({ job }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
}

export async function generateSolutionProposalRequest(
  request: Request,
  context: { params: Promise<{ id: string }> },
  startGenerationJob: StartGenerationJob,
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      proposal?: DigitalSolutionProposal;
      client?: ClientProfileInput;
    };
    let proposal = body.proposal ?? (await getSolutionProposal(id));
    if (!proposal) {
      return NextResponse.json(
        { error: "Digital solution proposal was not found." },
        { status: 404 },
      );
    }
    validateBrief(proposal);
    if (!proposal.solutionReview) {
      return NextResponse.json(
        { error: "Complete the solution review first." },
        { status: 400 },
      );
    }
    proposal = await saveSolutionProposal(proposal);
    const job = await startGenerationJob({
      jobType: "solution_proposal",
      resourceType: "digital_solution_proposal",
      resourceId: id,
      createdBy: auth.user.userId ?? null,
      createdByActor: auth.user.actor,
    });
    return NextResponse.json({ job }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
}

export async function exportSolutionProposalRequest(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    const proposal = await getSolutionProposal(id);
    if (!proposal) {
      return NextResponse.json(
        { error: "Digital solution proposal was not found." },
        { status: 404 },
      );
    }
    const result = await exportSolutionProposalDocx(proposal);
    await saveAuditLog({
      actor: auth.user.actor,
      action: "digital_solution_proposal_exported",
      entityType: "digital_solution_proposal",
      entityId: id,
      metadata: { filename: result.filename },
    });
    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function deleteSolutionFileRequest(
  request: Request,
  context: { params: Promise<{ id: string; fileId: string }> },
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const { id, fileId } = await context.params;
    await deleteSourceFile(id, fileId);
    const proposal = await getSolutionProposal(id);
    if (proposal) {
      const profiles = proposal.files.flatMap((file) =>
        file.analysis ? [file.analysis] : [],
      );
      proposal.evidenceAnalysis = profiles.length
        ? combineDatasetProfiles(profiles)
        : null;
      proposal.solutionReview = null;
      proposal.proposalContent = null;
      proposal.status = "Draft";
      await saveSolutionProposal(proposal);
    }
    await saveAuditLog({
      actor: auth.user.actor,
      action: "solution_evidence_deleted",
      entityType: "digital_solution_proposal",
      entityId: id,
      metadata: { fileId },
    });
    return NextResponse.json({ proposal: await getSolutionProposal(id) });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
