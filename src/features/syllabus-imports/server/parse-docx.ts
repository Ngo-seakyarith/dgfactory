import { load, type Cheerio, type CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import JSZip from "jszip";
import mammoth from "mammoth";

import type { SourceDocumentBlock } from "../domain/types";
import {
  assertReadableSyllabusBlocks,
  safeDocumentText,
  SYLLABUS_FILE_LIMIT_BYTES,
} from "./document-parser-utils";

function appendHtmlBlock(
  $: CheerioAPI,
  element: Cheerio<AnyNode>,
  blocks: SourceDocumentBlock[],
) {
  const node = element.get(0);
  if (!node || node.type !== "tag") return;
  const tag = node.name.toLowerCase();

  if (/^h[1-6]$/.test(tag)) {
    const text = safeDocumentText(element.text());
    if (text) blocks.push({ type: "heading", level: Number(tag[1]), text });
    return;
  }

  if (tag === "p") {
    const text = safeDocumentText(element.text());
    if (text) blocks.push({ type: "paragraph", text });
    return;
  }

  if (tag === "ul" || tag === "ol") {
    const items = element
      .children("li")
      .map((_, item) => safeDocumentText($(item).clone().children("ul,ol").remove().end().text()))
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
        .map((__, cell) => safeDocumentText($(cell).text()))
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
    const text = safeDocumentText(
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

  assertReadableSyllabusBlocks(
    blocks,
    "No readable syllabus text or tables were found in the DOCX.",
  );

  return blocks;
}
