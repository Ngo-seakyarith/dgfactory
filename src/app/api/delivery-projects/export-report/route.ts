import { NextResponse } from "next/server";

import {
  exportTrainingPackage,
  type ExportFormat,
} from "@/lib/export-package";
import { defaultPricingInputs, calculatePricing } from "@/lib/pricing";
import { normalizeDeliveryProject, type DeliveryProject } from "@/lib/delivery";
import type { TrainingPackage } from "@/lib/training-packages";

const formats: ExportFormat[] = ["docx", "pdf"];

function filePart(value: string) {
  return (
    value
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 72) || "DeliveryReport"
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      format?: ExportFormat;
      project?: Partial<DeliveryProject>;
      clientName?: string;
      packageTitle?: string;
    };

    if (!body.format || !formats.includes(body.format)) {
      return NextResponse.json(
        { error: "Post-training report export supports DOCX and PDF." },
        { status: 400 },
      );
    }

    const project = normalizeDeliveryProject(body.project ?? {});

    if (!project.title || !project.postTrainingReport) {
      return NextResponse.json(
        { error: "A delivery project with a report draft is required." },
        { status: 400 },
      );
    }

    const pricingOutputs = calculatePricing(defaultPricingInputs);
    const reportPackage: TrainingPackage = {
      id: project.id,
      title: body.packageTitle || project.title,
      audience: "Training participants",
      duration: project.trainingDate || "Completed training",
      client: body.clientName || "Client",
      promise: "Post-training reporting and follow-up recommendations",
      context: project.notes,
      tone: "Professional, clear, executive-friendly",
      syllabus: "",
      proposal: project.postTrainingReport,
      proposalContent: null,
      commercialProposal: "",
      deckOutline: "",
      workbook: "",
      followUpEmail: "",
      qualityChecklist: [],
      pricingInputs: defaultPricingInputs,
      pricingOutputs,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      generationMode: "openai",
    };
    const result = await exportTrainingPackage(reportPackage, body.format, "proposal");
    const filename = `DGAcademy_${filePart(reportPackage.title)}_${filePart(reportPackage.client)}_PostTrainingReport.${body.format}`;

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Post-training report export failed.",
      },
      { status: 500 },
    );
  }
}
