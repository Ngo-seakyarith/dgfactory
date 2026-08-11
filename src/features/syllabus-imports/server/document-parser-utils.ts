import type { SourceDocumentBlock } from "../domain/types";

export const SYLLABUS_FILE_LIMIT_BYTES = 10 * 1024 * 1024;
export const SYLLABUS_CONTENT_LIMIT = 120_000;
export const SYLLABUS_BLOCK_LIMIT = 2_000;

export function normalizeDocumentText(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
}

export function maskSensitiveText(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED EMAIL]")
    .replace(/(?:\+?\d[\s().-]?){8,16}/g, (match) => {
      const candidate = match.trim();
      if (
        /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(candidate) ||
        /^\d{4}[./-]\d{1,2}[./-]\d{1,2}$/.test(candidate)
      ) {
        return match;
      }
      const digits = match.replace(/\D/g, "");
      return digits.length >= 8 ? "[REDACTED NUMBER]" : match;
    })
    .replace(/\b\d{10,20}\b/g, "[REDACTED NUMBER]");
}

export function safeDocumentText(value: string) {
  return maskSensitiveText(normalizeDocumentText(value));
}

export function sourceDocumentContentLength(blocks: SourceDocumentBlock[]) {
  return blocks.reduce((total, block) => {
    if ("text" in block) return total + block.text.length;
    if (block.type === "list") {
      return total + block.items.reduce((sum, item) => sum + item.length, 0);
    }
    return (
      total +
      block.rows.reduce(
        (sum, row) => sum + row.reduce((rowSum, cell) => rowSum + cell.length, 0),
        0,
      )
    );
  }, 0);
}

export function assertReadableSyllabusBlocks(
  blocks: SourceDocumentBlock[],
  emptyMessage: string,
) {
  if (!blocks.length || sourceDocumentContentLength(blocks) < 20) {
    throw new Error(emptyMessage);
  }
  if (
    blocks.length > SYLLABUS_BLOCK_LIMIT ||
    sourceDocumentContentLength(blocks) > SYLLABUS_CONTENT_LIMIT
  ) {
    throw new Error(
      "The syllabus contains too much content to process safely. Reduce it to the relevant training sections and try again.",
    );
  }
}
