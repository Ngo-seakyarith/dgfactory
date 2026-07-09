import type { TrainingPackage } from "@/features/training-packages/domain/training-package";

export type ExportFormat = "docx" | "pptx" | "md";
export type ExportTarget =
  | "full"
  | "proposal"
  | "syllabus"
  | "workbook"
  | "follow-up-email"
  | "slides"
  | "summary"
  | "pricing";

export type ExportResult = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};

export type DocumentSection = {
  title: string;
  body: string;
};

export type ExportableTrainingPackage = TrainingPackage;
