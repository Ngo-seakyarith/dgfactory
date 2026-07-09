import { NextResponse } from "next/server";

import {
  exportTrainingPackage,
  type ExportFormat,
} from "@/features/training-packages/export/export-package";
import { defaultPricingInputs } from "@/features/training-packages";
import { buildProductBriefMarkdown } from "@/lib/productization";
import type { TrainingPackage } from "@/features/training-packages";
import { emptyProposalBrief } from "@/features/training-packages";

const formats: ExportFormat[] = ["docx", "md"];

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
      format?: ExportFormat;
  };
  const format = body.format ?? "docx";

  if (!formats.includes(format)) {
    return NextResponse.json(
      { error: "Product brief export supports DOCX or Markdown." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const productBriefPackage: TrainingPackage = {
    id: "dg-capability-factory-product-brief",
    title: "DG Capability Factory",
    audience: "Executives, HR leaders, L&D teams, training providers",
    duration: "Implementation package",
    client: "DG Academy",
    promise:
      "Turn capability needs into proposals, training assets, delivery plans, and measurable improvement loops.",
    context: "Productization package for client demonstration and implementation.",
    tone: "Executive and commercially practical",
    syllabus: "",
    proposal: buildProductBriefMarkdown(),
    proposalContent: null,
    proposalBrief: emptyProposalBrief,
    commercialProposal: "",
    deckOutline: "",
    workbook: "",
    followUpEmail: "",
    qualityChecklist: [],
    pricingInputs: defaultPricingInputs,
    pricingOutputs: {
      trainerCost: 0,
      participantVariableCost: 0,
      totalDirectCost: 0,
      targetProfit: 0,
      subtotalBeforeDiscount: 0,
      discountAmount: 0,
      subtotalAfterDiscount: 0,
      taxAmount: 0,
      finalPrice: 0,
      pricePerParticipant: 0,
      estimatedProfit: 0,
      estimatedProfitMargin: 0,
      warnings: [],
    },
    knowledgeUsed: [],
    createdAt: now,
    updatedAt: now,
  };
  const result = await exportTrainingPackage(productBriefPackage, format, "proposal");

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
