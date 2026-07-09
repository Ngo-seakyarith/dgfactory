import { contentForTarget, exportFilename } from "./content";
import { createDocx } from "./docx";
import { createPptx } from "./pptx";
import type { ExportFormat, ExportResult, ExportTarget } from "./types";
import type { TrainingPackage } from "@/features/training-packages/domain/training-package";

export type { ExportFormat, ExportTarget } from "./types";

export async function exportTrainingPackage(
  pkg: TrainingPackage,
  format: ExportFormat,
  target: ExportTarget = "full",
): Promise<ExportResult> {
  if (format === "md") {
    return {
      buffer: Buffer.from(contentForTarget(pkg, target), "utf8"),
      contentType: "text/markdown; charset=utf-8",
      filename: exportFilename(pkg, target, "md"),
    };
  }

  if (format === "docx") {
    return {
      buffer: await createDocx(pkg, target),
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      filename: exportFilename(pkg, target, "docx"),
    };
  }

  if (format === "pptx") {
    return {
      buffer: createPptx(pkg),
      contentType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      filename: exportFilename(pkg, "slides", "pptx"),
    };
  }

  throw new Error("Unsupported export format.");
}
