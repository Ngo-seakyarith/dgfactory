import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import {
  exportTrainingPackage,
  type ExportFormat,
  type ExportTarget,
} from "@/lib/export-package";
import { requirePermission } from "@/lib/route-guards";
import { roleHasPermission } from "@/lib/auth";
import { validateClientExportSafety } from "@/lib/security/exportSafety";
import type { TrainingPackage } from "@/lib/training-packages";

const formats: ExportFormat[] = ["docx", "pptx", "pdf", "txt"];
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
  const exportAuth = await requirePermission(request, "client_exports");

  if (!exportAuth.ok) {
    return exportAuth.response;
  }

  try {
    const body = (await request.json()) as {
      format?: ExportFormat;
      target?: ExportTarget;
      package?: TrainingPackage;
      includeInternalNotes?: boolean;
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

    if (body.includeInternalNotes) {
      const internalAuth = await requirePermission(request, "view_internal_notes");

      if (!internalAuth.ok) {
        return internalAuth.response;
      }
    }

    const safety = validateClientExportSafety({
      pkg: body.package,
      target,
      includeInternalNotes: Boolean(body.includeInternalNotes),
      actorCanApproveInternal: roleHasPermission(
        exportAuth.user.role,
        "view_internal_notes",
      ),
    });

    if (!safety.allowed) {
      await saveAuditLog({
        actor: exportAuth.user.actor,
        action: "export_blocked_security",
        entityType: "training_package",
        entityId: body.package.id,
        metadata: {
          title: body.package.title,
          format: body.format,
          target,
          issues: safety.issues,
        },
      });

      return NextResponse.json(
        {
          error:
            "Export blocked by security validator. Internal margin or notes may be present.",
          issues: safety.issues,
          recommendation: safety.recommendation,
        },
        { status: 409 },
      );
    }

    const result = exportTrainingPackage(body.package, body.format, target, {
      includeInternalNotes: Boolean(body.includeInternalNotes),
    });

    await saveAuditLog({
      actor: exportAuth.user.actor,
      action: "package_export",
      entityType: "training_package",
      entityId: body.package.id,
      metadata: {
        title: body.package.title,
        format: body.format,
        target,
        includeInternalNotes: Boolean(body.includeInternalNotes),
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
