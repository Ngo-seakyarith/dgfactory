import { NextResponse } from "next/server";

import { exportTrainingPackage, type ExportFormat } from "@/lib/export-package";
import { buildPilotReport, calculatePilotMetrics } from "@/lib/pilot";
import { getPilotSnapshot } from "@/lib/pilot-storage";
import { calculatePricing, defaultPricingInputs } from "@/lib/pricing";
import { requireApproved } from "@/lib/route-guards";
import type { TrainingPackage } from "@/lib/training-packages";
import { emptyProposalBrief } from "@/lib/proposal-brief";

function pilotReportFilename(format: ExportFormat) {
  const date = new Date().toISOString().slice(0, 10);
  return `DGAcademy_Internal_Pilot_Report_${date}.${format}`;
}

export async function POST(request: Request) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const format = body.format as ExportFormat;

  if (format !== "docx") {
    return NextResponse.json(
      { error: "Pilot report export supports DOCX." },
      { status: 400 },
    );
  }

  const snapshot = await getPilotSnapshot();
  const metrics = await calculatePilotMetrics(snapshot);
  const report = buildPilotReport({ metrics });
  const now = new Date().toISOString();
  const packageForExport: TrainingPackage = {
    id: "pilot-report",
    title: "Internal Pilot Report",
    audience: "DG Academy internal team",
    duration: "30-day pilot",
    client: "DG Academy",
    promise: "Launch readiness review for DG Academy Capability Factory.",
    context: "Generated from pilot goals, issues, feedback, quality, and usage data.",
    tone: "Executive and practical",
    syllabus: "",
    proposal: report,
    proposalContent: null,
    proposalBrief: emptyProposalBrief,
    commercialProposal: "",
    deckOutline: "",
    workbook: "",
    followUpEmail: "",
    qualityChecklist: [],
    pricingInputs: defaultPricingInputs,
    pricingOutputs: calculatePricing(defaultPricingInputs),
    knowledgeUsed: [],
    createdAt: now,
    updatedAt: now,
  };
  const exported = await exportTrainingPackage(packageForExport, format, "proposal");

  return new NextResponse(new Uint8Array(exported.buffer), {
    headers: {
      "Content-Type": exported.contentType,
      "Content-Disposition": `attachment; filename="${pilotReportFilename(format)}"`,
    },
  });
}
