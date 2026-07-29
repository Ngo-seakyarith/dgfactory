import { load, type Cheerio, type CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import JSZip from "jszip";
import mammoth from "mammoth";

import type { SourceDocumentBlock } from "../domain/types";

export const SYLLABUS_FILE_LIMIT_BYTES = 10 * 1024 * 1024;
export const SYLLABUS_CONTENT_LIMIT = 120_000;
export const SYLLABUS_BLOCK_LIMIT = 2_000;

const docxMime =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function normalizeText(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
}

function maskSensitiveText(value: string) {
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

function safeText(value: string) {
  return maskSensitiveText(normalizeText(value));
}

function appendHtmlBlock(
  $: CheerioAPI,
  element: Cheerio<AnyNode>,
  blocks: SourceDocumentBlock[],
) {
  const node = element.get(0);
  if (!node || node.type !== "tag") return;
  const tag = node.name.toLowerCase();

  if (/^h[1-6]$/.test(tag)) {
    const text = safeText(element.text());
    if (text) blocks.push({ type: "heading", level: Number(tag[1]), text });
    return;
  }

  if (tag === "p") {
    const text = safeText(element.text());
    if (text) blocks.push({ type: "paragraph", text });
    return;
  }

  if (tag === "ul" || tag === "ol") {
    const items = element
      .children("li")
      .map((_, item) => safeText($(item).clone().children("ul,ol").remove().end().text()))
      .get()
      .filter(Boolean);
    if (items.length) blocks.push({ type: "list", ordered: tag === "ol", items });
    element.children("li").children("ul,ol").each((_, child) => {
      appendHtmlBlock($, $(child), blocks);
    });
    return;
  }

  if (tag === "table") {
    const rows: string[][] = [];
    element.find("tr").each((_, row) => {
      const cells = $(row)
        .children("th,td")
        .map((__, cell) => safeText($(cell).text()))
        .get();
      if (cells.some(Boolean)) rows.push(cells);
    });
    if (rows.length) blocks.push({ type: "table", rows });
    return;
  }

  element.children().each((_, child) => appendHtmlBlock($, $(child), blocks));
}

async function headerFooterBlocks(zip: JSZip) {
  const names = Object.keys(zip.files)
    .filter((name) => /^word\/(header|footer)\d*\.xml$/i.test(name))
    .sort();
  const blocks: SourceDocumentBlock[] = [];

  for (const name of names) {
    const xml = await zip.file(name)?.async("string");
    if (!xml) continue;
    const $ = load(xml, { xmlMode: true }, false);
    const text = safeText(
      $("w\\:t")
        .map((_, node) => $(node).text())
        .get()
        .join(" "),
    );
    if (text) {
      blocks.push({
        type: name.toLowerCase().includes("header") ? "header" : "footer",
        text,
      });
    }
  }

  return blocks;
}

function contentLength(blocks: SourceDocumentBlock[]) {
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

export function validateSyllabusUpload({
  name,
  mimeType,
  sizeBytes,
}: {
  name: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const extension = name.toLowerCase().split(".").pop();
  if (extension !== "docx") {
    throw new Error("Only .docx syllabus files are supported.");
  }
  if (sizeBytes <= 0 || sizeBytes > SYLLABUS_FILE_LIMIT_BYTES) {
    throw new Error("The syllabus must be a non-empty DOCX file no larger than 10 MB.");
  }
  if (mimeType && ![docxMime, "application/octet-stream"].includes(mimeType)) {
    throw new Error("The selected file is not a valid DOCX document.");
  }
}

export async function parseSyllabusDocx(buffer: Buffer) {
  if (!buffer.length || buffer.length > SYLLABUS_FILE_LIMIT_BYTES) {
    throw new Error("The syllabus is empty or exceeds the 10 MB limit.");
  }
  if (!buffer.subarray(0, 2).equals(Buffer.from("PK"))) {
    throw new Error("The DOCX is encrypted, corrupted, or uses an unsupported format.");
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error("The DOCX is corrupted or could not be opened.");
  }
  if (!zip.file("word/document.xml")) {
    throw new Error("The file is not a valid Microsoft Word DOCX document.");
  }

  let converted: Awaited<ReturnType<typeof mammoth.convertToHtml>>;
  try {
    converted = await mammoth.convertToHtml(
      { buffer },
      {
        externalFileAccess: false,
        includeEmbeddedStyleMap: false,
        convertImage: mammoth.images.imgElement(() => Promise.resolve({ src: "" })),
        styleMap: [
          "p[style-name='Title'] => h1:fresh",
          "p[style-name='Subtitle'] => h2:fresh",
          "p[style-name='Section Title'] => h2:fresh",
        ],
      },
    );
  } catch {
    throw new Error("The DOCX is encrypted, corrupted, or could not be read.");
  }
  const conversionError = converted.messages.find((message) => message.type === "error");
  if (conversionError) throw new Error(`The DOCX could not be read: ${conversionError.message}`);

  const $ = load(converted.value, null, false);
  const blocks = await headerFooterBlocks(zip);
  $.root()
    .children()
    .each((_, child) => appendHtmlBlock($, $(child), blocks));

  if (blocks.length === 0) {
    throw new Error("No readable syllabus text or tables were found in the DOCX.");
  }
  if (blocks.length > SYLLABUS_BLOCK_LIMIT || contentLength(blocks) > SYLLABUS_CONTENT_LIMIT) {
    throw new Error(
      "The syllabus contains too much content to process safely. Reduce it to the relevant training sections and try again.",
    );
  }

  return blocks;
}
