import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import {
  exportTrainingPackage,
  type ExportFormat,
  type ExportTarget,
} from "@/lib/export-package";
import { requireApproved } from "@/lib/route-guards";
import type { TrainingPackage } from "@/lib/training-packages";
import { getTrainerById } from "@/lib/trainers";

const formats: ExportFormat[] = ["docx", "pptx", "md"];
const targets: ExportTarget[] = [
  "full",
  "proposal",
  "syllabus",
  "workbook",
  "follow-up-email",
  "slides",
  "summary",
  "pricing",
];

export async function POST(request: Request) {
  const exportAuth = await requireApproved(request);

  if (!exportAuth.ok) {
    return exportAuth.response;
  }

  try {
    const body = (await request.json()) as {
      format?: ExportFormat;
      target?: ExportTarget;
      package?: TrainingPackage;
    };

    if (!body.format || !formats.includes(body.format)) {
      return NextResponse.json({ error: "Invalid export format." }, { status: 400 });
    }

    if (!body.package?.id || !body.package.title) {
      return NextResponse.json(
        { error: "A saved or generated training package is required." },
        { status: 400 },
      );
    }

    const target = body.target ?? "full";

    if (!targets.includes(target)) {
      return NextResponse.json({ error: "Invalid export target." }, { status: 400 });
    }

    if (body.format === "pptx" && target !== "slides") {
      return NextResponse.json(
        { error: "PPTX export is available for slide deck outlines only." },
        { status: 400 },
      );
    }

    if (
      body.format === "docx" &&
      target === "proposal" &&
      !getTrainerById(body.package.proposalBrief?.trainerId ?? "")
    ) {
      return NextResponse.json(
        { error: "Select a DG Academy trainer before exporting the proposal." },
        { status: 400 },
      );
    }

    const result = await exportTrainingPackage(body.package, body.format, target);

    await saveAuditLog({
      actor: exportAuth.user.actor,
      action: "package_export",
      entityType: "training_package",
      entityId: body.package.id,
      metadata: {
        title: body.package.title,
        format: body.format,
        target,
        filename: result.filename,
      },
    });

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Package export failed.",
      },
      { status: 500 },
    );
  }
}
