import {
  syllabusMimeTypes,
  syllabusSourceFormatFromName,
  type SyllabusSourceFormat,
} from "../domain/file-types";
import type { SourceDocumentBlock } from "../domain/types";
import { SYLLABUS_FILE_LIMIT_BYTES } from "./document-parser-utils";
import { parseSyllabusDocx } from "./parse-docx";
import { parseSyllabusPdf } from "./parse-pdf";
import { parseSyllabusPptx } from "./parse-pptx";

const allowedMimeTypes = new Set([
  ...Object.values(syllabusMimeTypes),
  "application/octet-stream",
]);

export function validateSyllabusUpload({
  name,
  mimeType,
  sizeBytes,
}: {
  name: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const format = syllabusSourceFormatFromName(name);
  if (!format) {
    throw new Error("Choose a DOCX, PPTX, or text-based PDF syllabus file.");
  }
  if (sizeBytes <= 0 || sizeBytes > SYLLABUS_FILE_LIMIT_BYTES) {
    throw new Error(
      "The syllabus must be a non-empty DOCX, PPTX, or PDF file no larger than 10 MB.",
    );
  }
  if (mimeType && !allowedMimeTypes.has(mimeType)) {
    throw new Error(`The selected file is not a valid ${format.toUpperCase()} document.`);
  }
}

const parsers: Record<
  SyllabusSourceFormat,
  (buffer: Buffer) => Promise<SourceDocumentBlock[]>
> = {
  docx: parseSyllabusDocx,
  pptx: parseSyllabusPptx,
  pdf: parseSyllabusPdf,
};

export async function parseSyllabusDocument({
  buffer,
  name,
  mimeType,
}: {
  buffer: Buffer;
  name: string;
  mimeType: string;
}) {
  const format = syllabusSourceFormatFromName(name);
  if (!format) {
    throw new Error("Choose a DOCX, PPTX, or text-based PDF syllabus file.");
  }
  validateSyllabusUpload({ name, mimeType, sizeBytes: buffer.length });
  return parsers[format](buffer);
}
