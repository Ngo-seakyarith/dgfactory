import type { SourceDocumentBlock } from "../domain/types";
import {
  assertReadableSyllabusBlocks,
  safeDocumentText,
  sourceDocumentContentLength,
  SYLLABUS_FILE_LIMIT_BYTES,
} from "./document-parser-utils";

type PdfTextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL?: boolean;
};

type PdfLine = {
  text: string;
  fontSize: number;
};

function isPdfTextItem(value: unknown): value is PdfTextItem {
  return Boolean(
    value &&
      typeof value === "object" &&
      "str" in value &&
      typeof (value as PdfTextItem).str === "string" &&
      Array.isArray((value as PdfTextItem).transform),
  );
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function pageLines(items: PdfTextItem[]) {
  const lines: PdfLine[] = [];
  let parts: string[] = [];
  let currentY: number | null = null;
  let previousRight = 0;
  let sizes: number[] = [];

  function finishLine() {
    const text = safeDocumentText(parts.join(""));
    if (text) lines.push({ text, fontSize: median(sizes) });
    parts = [];
    sizes = [];
    currentY = null;
    previousRight = 0;
  }

  for (const item of items) {
    const text = item.str.replace(/\u00a0/g, " ");
    if (!text.trim() && !item.hasEOL) continue;
    const x = Number(item.transform[4] ?? 0);
    const y = Number(item.transform[5] ?? 0);
    const fontSize = Math.max(
      Math.abs(Number(item.transform[0] ?? 0)),
      Math.abs(Number(item.transform[3] ?? 0)),
      Number(item.height ?? 0),
      1,
    );
    const lineChanged =
      currentY !== null &&
      (Math.abs(y - currentY) > Math.max(2, fontSize * 0.3) || x < previousRight - 4);
    if (lineChanged) finishLine();
    if (currentY === null) currentY = y;

    const gap = x - previousRight;
    if (parts.length && gap > Math.max(1.5, fontSize * 0.18)) parts.push(" ");
    parts.push(text);
    sizes.push(fontSize);
    previousRight = x + Number(item.width ?? 0);
    if (item.hasEOL) finishLine();
  }
  finishLine();
  return lines;
}

function blocksFromLines(lines: PdfLine[], pageNumber: number) {
  const blocks: SourceDocumentBlock[] = [];
  const bodyFontSize = median(lines.map((line) => line.fontSize).filter(Boolean));
  const location = `Page ${pageNumber}`;
  let listItems: string[] = [];
  let ordered = false;

  function finishList() {
    if (listItems.length) {
      blocks.push({ type: "list", ordered, items: listItems, location });
    }
    listItems = [];
    ordered = false;
  }

  for (const line of lines) {
    const bullet = line.text.match(/^[\u2022\u25cf\u25aa\u25e6*-]\s*(.+)$/);
    const numbered = line.text.match(/^\d+[.)]\s+(.+)$/);
    if (bullet || numbered) {
      const nextOrdered = Boolean(numbered);
      if (listItems.length && ordered !== nextOrdered) finishList();
      ordered = nextOrdered;
      listItems.push((numbered?.[1] ?? bullet?.[1] ?? line.text).trim());
      continue;
    }
    finishList();

    const heading =
      bodyFontSize > 0 &&
      line.fontSize >= bodyFontSize * 1.22 &&
      line.text.length <= 160;
    blocks.push(
      heading
        ? { type: "heading", level: 2, text: line.text, location }
        : { type: "paragraph", text: line.text, location },
    );
  }
  finishList();
  return blocks;
}

export async function parseSyllabusPdf(buffer: Buffer) {
  if (!buffer.length || buffer.length > SYLLABUS_FILE_LIMIT_BYTES) {
    throw new Error("The syllabus is empty or exceeds the 10 MB limit.");
  }
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("The file is not a valid PDF document.");
  }

  let loadingTask: { destroy: () => Promise<void> } | null = null;
  try {
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const task = getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
    });
    loadingTask = task;
    const document = await task.promise;
    const blocks: SourceDocumentBlock[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items.filter(isPdfTextItem) as PdfTextItem[];
      blocks.push(...blocksFromLines(pageLines(items), pageNumber));
    }

    assertReadableSyllabusBlocks(
      blocks,
      "No readable syllabus text was found in the PDF. Scanned or image-only PDFs are not supported.",
    );
    if (sourceDocumentContentLength(blocks) < 80) {
      throw new Error(
        "The PDF contains too little readable text. Scanned or image-only PDFs are not supported.",
      );
    }
    return blocks;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/password|encrypted/i.test(message)) {
      throw new Error("Encrypted or password-protected PDFs are not supported.");
    }
    if (/No readable|too little|not a valid|not supported|too much content/i.test(message)) {
      throw error;
    }
    throw new Error("The PDF is corrupted or could not be read.");
  } finally {
    await loadingTask?.destroy().catch(() => undefined);
  }
}
