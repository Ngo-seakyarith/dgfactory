import { posix } from "node:path";

import { load, type CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import JSZip from "jszip";

import type { SourceDocumentBlock } from "../domain/types";
import {
  assertReadableSyllabusBlocks,
  safeDocumentText,
  SYLLABUS_FILE_LIMIT_BYTES,
} from "./document-parser-utils";

type SlideReference = {
  path: string;
  relationshipPath: string;
};

function resolvePackagePath(basePath: string, target: string) {
  const normalizedTarget = target.replace(/\\/g, "/");
  return posix.normalize(posix.join(posix.dirname(basePath), normalizedTarget));
}

function relationshipTargets(xml: string) {
  const $ = load(xml, { xmlMode: true }, false);
  const targets = new Map<string, string>();
  $("Relationship").each((_, node) => {
    const relation = $(node);
    const id = relation.attr("Id");
    const target = relation.attr("Target");
    if (id && target) targets.set(id, target);
  });
  return targets;
}

async function orderedSlides(zip: JSZip): Promise<SlideReference[]> {
  const presentationXml = await zip.file("ppt/presentation.xml")?.async("string");
  const relationshipsXml = await zip
    .file("ppt/_rels/presentation.xml.rels")
    ?.async("string");

  if (!presentationXml || !relationshipsXml) {
    throw new Error("The PPTX does not contain a readable PowerPoint presentation.");
  }

  const relationships = relationshipTargets(relationshipsXml);
  const $ = load(presentationXml, { xmlMode: true }, false);
  const slides: SlideReference[] = [];
  $("p\\:sldId").each((_, node) => {
    const relationshipId = $(node).attr("r:id");
    const target = relationshipId ? relationships.get(relationshipId) : undefined;
    if (!target) return;
    const path = resolvePackagePath("ppt/presentation.xml", target);
    slides.push({
      path,
      relationshipPath: posix.join(
        posix.dirname(path),
        "_rels",
        `${posix.basename(path)}.rels`,
      ),
    });
  });

  if (slides.length) return slides;

  return Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((left, right) => {
      const leftNumber = Number(left.match(/slide(\d+)\.xml/i)?.[1] ?? 0);
      const rightNumber = Number(right.match(/slide(\d+)\.xml/i)?.[1] ?? 0);
      return leftNumber - rightNumber;
    })
    .map((path) => ({
      path,
      relationshipPath: posix.join(
        posix.dirname(path),
        "_rels",
        `${posix.basename(path)}.rels`,
      ),
    }));
}

function paragraphValues($: CheerioAPI, node: AnyNode) {
  return $(node)
    .find("a\\:p")
    .map((_, paragraph) => {
      const element = $(paragraph);
      const text = safeDocumentText(
        element
          .find("a\\:t")
          .map((__, textNode) => $(textNode).text())
          .get()
          .join(" "),
      );
      return {
        text,
        fontSize: Math.max(
          ...element
            .find("a\\:rPr, a\\:defRPr")
            .map((__, style) => Number($(style).attr("sz") ?? 0) / 100)
            .get(),
          0,
        ),
        ordered: element.find("a\\:buAutoNum").length > 0,
        bulleted:
          element.find("a\\:buChar, a\\:buAutoNum, a\\:buBlip").length > 0,
      };
    })
    .get()
    .filter((value) => value.text);
}

function appendShapeBlocks(
  $: CheerioAPI,
  node: AnyNode,
  blocks: SourceDocumentBlock[],
  location: string,
) {
  const element = $(node);
  const tag = (node.type === "tag" ? node.name : "").toLowerCase();

  if (tag === "p:grpsp") {
    element.children().each((_, child) =>
      appendShapeBlocks($, child, blocks, location),
    );
    return;
  }

  if (tag === "p:graphicframe") {
    const rows: string[][] = [];
    element.find("a\\:tbl > a\\:tr").each((_, row) => {
      const cells = $(row)
        .children("a\\:tc")
        .map((__, cell) =>
          safeDocumentText(
            $(cell)
              .find("a\\:t")
              .map((___, textNode) => $(textNode).text())
              .get()
              .join(" "),
          ),
        )
        .get();
      if (cells.some(Boolean)) rows.push(cells);
    });
    if (rows.length) blocks.push({ type: "table", rows, location });
    return;
  }

  if (tag !== "p:sp") return;
  const placeholderType = element.find("p\\:nvPr p\\:ph").attr("type") ?? "";
  if (["dt", "ftr", "hdr", "sldNum", "sldImg"].includes(placeholderType)) return;

  const paragraphs = paragraphValues($, node);
  if (!paragraphs.length) return;
  const largestFontSize = Math.max(
    ...paragraphs.map((paragraph) => paragraph.fontSize),
    0,
  );
  if (
    largestFontSize > 0 &&
    largestFontSize <= 9 &&
    paragraphs.every((paragraph) => paragraph.text.length < 180)
  ) {
    return;
  }
  if (["title", "ctrTitle", "subTitle"].includes(placeholderType)) {
    blocks.push({
      type: "heading",
      level: placeholderType === "subTitle" ? 2 : 1,
      text: paragraphs.map((paragraph) => paragraph.text).join(" "),
      location,
    });
    return;
  }

  if (!placeholderType && paragraphs.length === 1 && largestFontSize >= 24) {
    blocks.push({
      type: "heading",
      level: largestFontSize >= 32 ? 1 : 2,
      text: paragraphs[0].text,
      location,
    });
    return;
  }

  const isList =
    paragraphs.some((paragraph) => paragraph.bulleted || paragraph.ordered) ||
    (placeholderType === "body" && paragraphs.length > 1);
  if (isList) {
    blocks.push({
      type: "list",
      ordered: paragraphs.every((paragraph) => paragraph.ordered),
      items: paragraphs.map((paragraph) => paragraph.text),
      location,
    });
    return;
  }

  paragraphs.forEach((paragraph) => {
    blocks.push({ type: "paragraph", text: paragraph.text, location });
  });
}

function slideBlocks(xml: string, slideNumber: number) {
  const $ = load(xml, { xmlMode: true }, false);
  const blocks: SourceDocumentBlock[] = [];
  const location = `Slide ${slideNumber}`;
  $("p\\:spTree")
    .first()
    .children()
    .each((_, node) => appendShapeBlocks($, node, blocks, location));
  return blocks;
}

async function notesBlocks(
  zip: JSZip,
  slide: SlideReference,
  slideNumber: number,
) {
  const relationshipXml = await zip.file(slide.relationshipPath)?.async("string");
  if (!relationshipXml) return [];
  const relationships = relationshipTargets(relationshipXml);
  const relationship = Array.from(relationships.values()).find((target) =>
    /notesSlides\/notesSlide\d+\.xml$/i.test(target.replace(/\\/g, "/")),
  );
  if (!relationship) return [];
  const notesPath = resolvePackagePath(slide.path, relationship);
  const notesXml = await zip.file(notesPath)?.async("string");
  if (!notesXml) return [];

  const $ = load(notesXml, { xmlMode: true }, false);
  const blocks: SourceDocumentBlock[] = [];
  $("p\\:sp").each((_, node) => {
    const element = $(node);
    const placeholderType = element.find("p\\:nvPr p\\:ph").attr("type") ?? "";
    if (placeholderType && placeholderType !== "body") return;
    paragraphValues($, node).forEach((paragraph) => {
      blocks.push({
        type: "paragraph",
        text: paragraph.text,
        location: `Slide ${slideNumber} notes`,
      });
    });
  });
  return blocks;
}

export async function parseSyllabusPptx(buffer: Buffer) {
  if (!buffer.length || buffer.length > SYLLABUS_FILE_LIMIT_BYTES) {
    throw new Error("The syllabus is empty or exceeds the 10 MB limit.");
  }
  if (!buffer.subarray(0, 2).equals(Buffer.from("PK"))) {
    throw new Error("The PPTX is encrypted, corrupted, or uses an unsupported format.");
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error("The PPTX is corrupted or could not be opened.");
  }
  const contentTypes = await zip.file("[Content_Types].xml")?.async("string");
  if (
    !contentTypes?.includes("presentationml.presentation.main+xml") ||
    !zip.file("ppt/presentation.xml")
  ) {
    throw new Error("The file is not a valid Microsoft PowerPoint PPTX document.");
  }

  const slides = await orderedSlides(zip);
  const blocks: SourceDocumentBlock[] = [];
  for (const [index, slide] of slides.entries()) {
    const xml = await zip.file(slide.path)?.async("string");
    if (!xml) continue;
    blocks.push(...slideBlocks(xml, index + 1));
    blocks.push(...(await notesBlocks(zip, slide, index + 1)));
  }

  assertReadableSyllabusBlocks(
    blocks,
    "No readable syllabus text, tables, or speaker notes were found in the PPTX.",
  );
  return blocks;
}
