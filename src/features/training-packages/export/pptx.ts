import { readFile } from "node:fs/promises";
import { join } from "node:path";

import PptxGenJS from "pptxgenjs";

import {
  parseSlideDeckPlan,
  type SlideDeckSlide,
} from "./slide-deck-plan";

export type PptxTrainingPackage = {
  title: string;
  client: string;
  audience: string;
  duration: string;
  promise: string;
  deckOutline: string;
};

type DeckItem = {
  kind: "bullet" | "number" | "paragraph";
  text: string;
};

type DeckSection = {
  title: string;
  items: DeckItem[];
  intro?: string;
  sectionNumber?: number;
};

const COLORS = {
  graphite: "151A17",
  graphiteSoft: "27302B",
  orange: "F4772E",
  orangeDark: "A94B18",
  teal: "20867D",
  tealDark: "176A63",
  paper: "FFFFFF",
  workspace: "F2F4F1",
  mint: "E8F1EE",
  ink: "1D2521",
  muted: "5E6963",
  line: "D5DDD8",
} as const;

const HEAD_FONT = "Aptos Display";
const BODY_FONT = "Aptos";
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

function cleanMarkdown(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[>*_\s]+|[*_\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSlideTitle(value: string) {
  return cleanMarkdown(value)
    .replace(/^slide\s+\d+\s*[:.)\-\u2013\u2014]\s*/i, "")
    .replace(/^\d+\s*[:.)\-\u2013\u2014]\s*/, "")
    .trim();
}

function itemFromLine(line: string): DeckItem | null {
  const bullet = line.match(/^[-*\u2022]\s+(.+)/);
  if (bullet) {
    return { kind: "bullet", text: cleanMarkdown(bullet[1]) };
  }

  const numbered = line.match(/^\d+[.)]\s+(.+)/);
  if (numbered) {
    return { kind: "number", text: cleanMarkdown(numbered[1]) };
  }

  const text = cleanMarkdown(line);
  return text ? { kind: "paragraph", text } : null;
}

function parseDeckSections(deckOutline: string): DeckSection[] {
  const lines = deckOutline.split(/\r?\n/).map((line) => line.trim());
  const sections: DeckSection[] = [];
  let current: DeckSection | null = null;

  for (const line of lines) {
    if (!line) continue;

    const markdownHeading = line.match(/^#{2,4}\s+(.+)/)?.[1];
    const explicitSlide = line.match(
      /^slide\s+\d+\s*[:.)\-\u2013\u2014]\s*(.+)/i,
    )?.[1];
    const firstHeading = line.match(/^#\s+(.+)/)?.[1];
    const heading = markdownHeading ?? explicitSlide;

    if (heading) {
      current = { title: cleanSlideTitle(heading), items: [] };
      sections.push(current);
      continue;
    }

    if (firstHeading && sections.length === 0) {
      continue;
    }

    const item = itemFromLine(line);
    if (!item) continue;

    if (!current) {
      current = { title: "Training Overview", items: [] };
      sections.push(current);
    }
    current.items.push(item);
  }

  const usefulSections = sections.filter(
    (section) =>
      section.title &&
      !/^(title|title slide|cover|cover slide|agenda)$/i.test(section.title),
  );

  if (usefulSections.length) {
    return usefulSections.slice(0, 24);
  }

  const fallbackItems = lines
    .map(itemFromLine)
    .filter((item): item is DeckItem => Boolean(item));
  return [{ title: "Training Overview", items: fallbackItems }];
}

function chunkSection(section: DeckSection, sectionNumber: number) {
  if (!section.items.length) return [{ ...section, sectionNumber }];

  const chunks: DeckSection[] = [];
  let current: DeckItem[] = [];
  let characterCount = 0;

  for (const item of section.items) {
    const nextCount = characterCount + item.text.length;
    if (current.length && (current.length >= 6 || nextCount > 720)) {
      chunks.push({
        title: chunks.length ? `${section.title} (continued)` : section.title,
        items: current,
        sectionNumber,
      });
      current = [];
      characterCount = 0;
    }

    current.push(item);
    characterCount += item.text.length;
  }

  if (current.length) {
    chunks.push({
      title: chunks.length ? `${section.title} (continued)` : section.title,
      items: current,
      sectionNumber,
    });
  }

  return chunks;
}

function isPracticeSlide(title: string) {
  return /exercise|activity|practice|workshop|lab|action plan|reflection|discussion/i.test(
    title,
  );
}

function isStatementSlide(section: DeckSection) {
  return (
    section.items.length <= 2 &&
    section.items.every((item) => item.kind === "paragraph") &&
    section.items.reduce((total, item) => total + item.text.length, 0) <= 360
  );
}

function addLogo(
  slide: PptxGenJS.Slide,
  logoData: string | null,
  options: { x: number; y: number; size: number },
) {
  if (!logoData) return;
  slide.addImage({
    data: logoData,
    x: options.x,
    y: options.y,
    w: options.size,
    h: options.size,
    altText: "DG Academy logo",
  });
}

function addFooter(
  slide: PptxGenJS.Slide,
  slideNumber: number,
  client: string,
  dark = false,
) {
  const textColor = dark ? "C7D0CB" : COLORS.muted;
  const lineColor = dark ? "3B4841" : COLORS.line;

  slide.addShape("line", {
    x: 0.82,
    y: 7.04,
    w: 11.7,
    h: 0,
    line: { color: lineColor, width: 0.7 },
  });
  slide.addText(`DG Academy  |  ${client || "Training Delivery"}`, {
    x: 0.82,
    y: 7.12,
    w: 8.6,
    h: 0.18,
    margin: 0,
    fontFace: BODY_FONT,
    fontSize: 8,
    color: textColor,
  });
  slide.addText(String(slideNumber).padStart(2, "0"), {
    x: 11.92,
    y: 7.08,
    w: 0.6,
    h: 0.22,
    margin: 0,
    align: "right",
    fontFace: BODY_FONT,
    fontSize: 9,
    bold: true,
    color: dark ? COLORS.orange : COLORS.orangeDark,
  });
}

function addSlideTitle(
  slide: PptxGenJS.Slide,
  title: string,
  sectionNumber: number | "AGENDA",
  dark = false,
) {
  const sectionLabel = typeof sectionNumber === "number"
    ? String(sectionNumber).padStart(2, "0")
    : sectionNumber;
  const labelWidth = typeof sectionNumber === "number" ? 0.55 : 0.78;
  slide.addText(sectionLabel, {
    x: 0.82,
    y: 0.56,
    w: labelWidth,
    h: 0.28,
    margin: 0,
    fontFace: BODY_FONT,
    fontSize: 11,
    bold: true,
    color: COLORS.orange,
  });
  slide.addShape("line", {
    x: typeof sectionNumber === "number" ? 1.48 : 1.72,
    y: 0.69,
    w: 0.58,
    h: 0,
    line: { color: dark ? "5E6A64" : COLORS.line, width: 1.2 },
  });
  slide.addText(title, {
    x: 0.82,
    y: 0.94,
    w: 11.6,
    h: 0.88,
    margin: 0,
    fontFace: HEAD_FONT,
    fontSize: 36,
    bold: true,
    color: dark ? COLORS.paper : COLORS.ink,
    breakLine: false,
    fit: "shrink",
    valign: "top",
  });
}

function estimatedItemHeight(text: string, charsPerLine: number) {
  const lines = Math.max(1, Math.min(4, Math.ceil(text.length / charsPerLine)));
  return 0.28 + lines * 0.28;
}

function addBulletList(
  slide: PptxGenJS.Slide,
  items: DeckItem[],
  options: {
    x: number;
    y: number;
    w: number;
    h: number;
    accent?: string;
    numberStart?: number;
  },
) {
  const accent = options.accent ?? COLORS.orange;
  const charsPerLine = Math.max(34, Math.floor(options.w * 11));
  const estimatedHeights = items.map((item) =>
    estimatedItemHeight(item.text, charsPerLine),
  );
  const totalHeight = estimatedHeights.reduce((sum, value) => sum + value, 0);
  const gap = items.length > 1
    ? Math.max(0.12, Math.min(0.3, (options.h - totalHeight) / (items.length - 1)))
    : 0;
  let y = options.y;
  let numberIndex = options.numberStart ?? 1;

  items.forEach((item, index) => {
    const itemHeight = estimatedHeights[index];
    if (item.kind === "paragraph") {
      slide.addShape("line", {
        x: options.x,
        y: y + 0.12,
        w: 0.34,
        h: 0,
        line: { color: accent, width: 2.2 },
      });
    } else {
      slide.addShape(item.kind === "number" ? "ellipse" : "rect", {
        x: options.x,
        y: y + 0.05,
        w: item.kind === "number" ? 0.28 : 0.12,
        h: item.kind === "number" ? 0.28 : 0.12,
        fill: { color: accent },
        line: { color: accent, transparency: 100 },
      });
      if (item.kind === "number") {
        slide.addText(String(numberIndex), {
          x: options.x,
          y: y + 0.075,
          w: 0.28,
          h: 0.18,
          margin: 0,
          align: "center",
          fontFace: BODY_FONT,
          fontSize: 8,
          bold: true,
          color: COLORS.paper,
        });
        numberIndex += 1;
      }
    }

    slide.addText(item.text, {
      x: options.x + 0.46,
      y,
      w: options.w - 0.46,
      h: itemHeight,
      margin: 0,
      fontFace: BODY_FONT,
      fontSize: item.kind === "paragraph" ? 18.5 : 17.5,
      color: COLORS.ink,
      breakLine: false,
      fit: "shrink",
      valign: "top",
      paraSpaceAfter: 5,
    });
    y += itemHeight + gap;
  });
}

function addCoverSlide(
  pptx: PptxGenJS,
  pkg: PptxTrainingPackage,
  logoData: string | null,
) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 0.42,
    h: SLIDE_H,
    fill: { color: COLORS.orange },
    line: { color: COLORS.orange, transparency: 100 },
  });
  addLogo(slide, logoData, { x: 11.15, y: 0.62, size: 1.28 });
  slide.addText("DG ACADEMY TRAINING", {
    x: 0.92,
    y: 0.76,
    w: 5.5,
    h: 0.3,
    margin: 0,
    fontFace: BODY_FONT,
    fontSize: 11,
    bold: true,
    color: COLORS.orange,
    charSpacing: 2.1,
  });
  slide.addText(pkg.title, {
    x: 0.92,
    y: 1.58,
    w: 10.7,
    h: 1.7,
    margin: 0,
    fontFace: HEAD_FONT,
    fontSize: 50,
    bold: true,
    color: COLORS.ink,
    fit: "shrink",
    valign: "middle",
  });
  slide.addShape("line", {
    x: 0.92,
    y: 3.62,
    w: 1.15,
    h: 0,
    line: { color: COLORS.orange, width: 3 },
  });
  slide.addText(pkg.promise, {
    x: 0.92,
    y: 3.92,
    w: 8.9,
    h: 1.05,
    margin: 0,
    fontFace: BODY_FONT,
    fontSize: 22,
    color: COLORS.muted,
    fit: "shrink",
    valign: "top",
  });
  slide.addText(pkg.client || "Client", {
    x: 0.92,
    y: 6.14,
    w: 5.2,
    h: 0.32,
    margin: 0,
    fontFace: BODY_FONT,
    fontSize: 15,
    bold: true,
    color: COLORS.ink,
  });
  slide.addText(`${pkg.audience}  |  ${pkg.duration}`, {
    x: 0.92,
    y: 6.56,
    w: 8.6,
    h: 0.26,
    margin: 0,
    fontFace: BODY_FONT,
    fontSize: 11,
    color: COLORS.muted,
  });
  slide.addNotes(
    `Open by connecting the training promise to ${pkg.client || "the client"}'s operating context.`,
  );
}

function addAgendaSlide(
  pptx: PptxGenJS,
  sections: DeckSection[],
  pkg: PptxTrainingPackage,
  slideNumber: number,
) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.workspace };
  addSlideTitle(slide, "Today's learning journey", "AGENDA");

  const visible = sections.slice(0, 10);
  const columns = visible.length > 5 ? [visible.slice(0, 5), visible.slice(5)] : [visible];

  columns.forEach((column, columnIndex) => {
    const x = columnIndex === 0 ? 0.9 : 6.8;
    column.forEach((section, rowIndex) => {
      const index = columnIndex * 5 + rowIndex;
      const y = 2.05 + rowIndex * 0.88;
      slide.addText(String(index + 1).padStart(2, "0"), {
        x,
        y,
        w: 0.52,
        h: 0.26,
        margin: 0,
        fontFace: BODY_FONT,
        fontSize: 12,
        bold: true,
        color: COLORS.orangeDark,
      });
      slide.addShape("line", {
        x: x + 0.62,
        y: y + 0.14,
        w: 0.46,
        h: 0,
        line: { color: COLORS.teal, width: 1.4 },
      });
      slide.addText(section.title, {
        x: x + 1.24,
        y: y - 0.04,
        w: 4.85,
        h: 0.48,
        margin: 0,
        fontFace: BODY_FONT,
        fontSize: 18,
        bold: true,
        color: COLORS.ink,
        fit: "shrink",
      });
    });
  });

  addFooter(slide, slideNumber, pkg.client);
  slide.addNotes("Set expectations for the sequence and connect each section to the program outcome.");
}

function addDividerSlide(
  pptx: PptxGenJS,
  section: DeckSection,
  sectionNumber: number,
  pkg: PptxTrainingPackage,
  slideNumber: number,
  speakerNotes?: string,
) {
  const slide = pptx.addSlide();
  const hasOverview = Boolean(section.intro || section.items.length);
  slide.background = { color: COLORS.workspace };
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 0.42,
    h: SLIDE_H,
    fill: { color: COLORS.orange },
    line: { color: COLORS.orange, transparency: 100 },
  });
  slide.addText(String(sectionNumber).padStart(2, "0"), {
    x: 0.98,
    y: hasOverview ? 0.7 : 1.4,
    w: 1.1,
    h: 0.46,
    margin: 0,
    fontFace: BODY_FONT,
    fontSize: 22,
    bold: true,
    color: COLORS.orangeDark,
  });
  slide.addText(section.title, {
    x: 0.98,
    y: hasOverview ? 1.18 : 2.12,
    w: 10.6,
    h: hasOverview ? 0.95 : 1.65,
    margin: 0,
    fontFace: HEAD_FONT,
    fontSize: hasOverview ? 42 : 46,
    bold: true,
    color: COLORS.ink,
    fit: "shrink",
    valign: "middle",
  });
  if (hasOverview) {
    if (section.intro) {
      slide.addText(section.intro, {
        x: 0.98,
        y: 2.32,
        w: 10.7,
        h: 0.82,
        margin: 0,
        fontFace: BODY_FONT,
        fontSize: 19,
        color: COLORS.muted,
        fit: "shrink",
        valign: "top",
      });
    }
    addBulletList(slide, section.items, {
      x: 1,
      y: section.intro ? 3.42 : 2.58,
      w: 10.8,
      h: section.intro ? 2.7 : 3.55,
      accent: COLORS.teal,
    });
  }
  addFooter(slide, slideNumber, pkg.client);
  slide.addNotes(
    speakerNotes ||
      `Introduce ${section.title} and explain why it matters to the training outcome.`,
  );
}

function addStatementSlide(
  pptx: PptxGenJS,
  section: DeckSection,
  sectionNumber: number,
  pkg: PptxTrainingPackage,
  slideNumber: number,
  speakerNotes?: string,
) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  addSlideTitle(slide, section.title, sectionNumber);
  slide.addShape("rect", {
    x: 0.82,
    y: 2.2,
    w: 0.16,
    h: 3.42,
    fill: { color: COLORS.orange },
    line: { color: COLORS.orange, transparency: 100 },
  });
  slide.addText(section.items.map((item) => item.text).join("\n\n"), {
    x: 1.34,
    y: 2.2,
    w: 10.6,
    h: 3.42,
    margin: 0,
    fontFace: HEAD_FONT,
    fontSize: 24,
    bold: false,
    color: COLORS.ink,
    fit: "shrink",
    breakLine: false,
    valign: "middle",
  });
  addFooter(slide, slideNumber, pkg.client);
  slide.addNotes(
    speakerNotes ||
      `Pause on the central message of ${section.title} and invite one practical example.`,
  );
}

function addPracticeSlide(
  pptx: PptxGenJS,
  section: DeckSection,
  sectionNumber: number,
  pkg: PptxTrainingPackage,
  slideNumber: number,
  speakerNotes?: string,
) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.workspace };
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 4.2,
    h: SLIDE_H,
    fill: { color: COLORS.tealDark },
    line: { color: COLORS.tealDark, transparency: 100 },
  });
  slide.addText("PRACTICE", {
    x: 0.74,
    y: 0.72,
    w: 1.8,
    h: 0.28,
    margin: 0,
    fontFace: BODY_FONT,
    fontSize: 11,
    bold: true,
    color: "B9E2DD",
    charSpacing: 2,
  });
  slide.addText(section.title, {
    x: 0.74,
    y: 1.32,
    w: 2.85,
    h: 2.45,
    margin: 0,
    fontFace: HEAD_FONT,
    fontSize: 31,
    bold: true,
    color: COLORS.paper,
    fit: "shrink",
    valign: "middle",
  });
  slide.addText(String(sectionNumber).padStart(2, "0"), {
    x: 0.74,
    y: 6.22,
    w: 0.6,
    h: 0.3,
    margin: 0,
    fontFace: BODY_FONT,
    fontSize: 12,
    bold: true,
    color: COLORS.orange,
  });

  if (section.intro) {
    slide.addText(section.intro, {
      x: 4.86,
      y: 0.72,
      w: 7.45,
      h: 0.72,
      margin: 0,
      fontFace: BODY_FONT,
      fontSize: 16,
      color: COLORS.muted,
      fit: "shrink",
      valign: "top",
    });
  }
  addBulletList(slide, section.items, {
    x: 4.86,
    y: section.intro ? 1.62 : 1.25,
    w: 7.45,
    h: section.intro ? 4.78 : 5.15,
    accent: COLORS.orange,
  });
  addFooter(slide, slideNumber, pkg.client, true);
  slide.addNotes(
    speakerNotes ||
      `Explain the task, confirm the expected output, and debrief ${section.title}.`,
  );
}

function addContentSlide(
  pptx: PptxGenJS,
  section: DeckSection,
  sectionNumber: number,
  pkg: PptxTrainingPackage,
  slideNumber: number,
  speakerNotes?: string,
) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  addSlideTitle(slide, section.title, sectionNumber);
  const contentY = section.intro ? 2.66 : 2.06;
  const contentH = section.intro ? 3.74 : 4.35;

  if (section.intro) {
    slide.addText(section.intro, {
      x: 0.92,
      y: 1.88,
      w: 11.35,
      h: 0.58,
      margin: 0,
      fontFace: BODY_FONT,
      fontSize: 16,
      color: COLORS.muted,
      fit: "shrink",
      valign: "top",
    });
  }

  if (section.items.length >= 5) {
    const splitAt = Math.ceil(section.items.length / 2);
    const left = section.items.slice(0, splitAt);
    const right = section.items.slice(splitAt);
    slide.addShape("line", {
      x: 6.66,
      y: contentY,
      w: 0,
      h: contentH,
      line: { color: COLORS.line, width: 1 },
    });
    addBulletList(slide, left, {
      x: 0.9,
      y: contentY,
      w: 5.45,
      h: contentH,
    });
    addBulletList(slide, right, {
      x: 6.96,
      y: contentY,
      w: 5.45,
      h: contentH,
      accent: COLORS.teal,
      numberStart: left.filter((item) => item.kind === "number").length + 1,
    });
  } else {
    slide.addShape("rect", {
      x: 10.92,
      y: contentY,
      w: 1.58,
      h: contentH,
      fill: { color: COLORS.mint },
      line: { color: COLORS.mint, transparency: 100 },
    });
    slide.addShape("rect", {
      x: 11.28,
      y: contentY + 0.38,
      w: 0.88,
      h: 0.12,
      fill: { color: COLORS.teal },
      line: { color: COLORS.teal, transparency: 100 },
    });
    slide.addText("APPLY", {
      x: 11.14,
      y: contentY + 0.7,
      w: 1.16,
      h: 0.26,
      margin: 0,
      align: "center",
      fontFace: BODY_FONT,
      fontSize: 9,
      bold: true,
      color: COLORS.tealDark,
      charSpacing: 1.5,
    });
    addBulletList(slide, section.items, {
      x: 0.92,
      y: contentY,
      w: 9.42,
      h: contentH,
    });
  }

  addFooter(slide, slideNumber, pkg.client);
  slide.addNotes(
    speakerNotes ||
      `Connect ${section.title} to a client example, then check understanding before moving on.`,
  );
}

function addTwoColumnSlide(
  pptx: PptxGenJS,
  planned: SlideDeckSlide,
  sectionNumber: number,
  pkg: PptxTrainingPackage,
  slideNumber: number,
) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  addSlideTitle(slide, planned.title, sectionNumber);
  const columnHeaderY = planned.intro ? 2.52 : 2.04;
  const listY = planned.intro ? 3.02 : 2.62;
  const listH = planned.intro ? 3.2 : 3.62;

  if (planned.intro) {
    slide.addText(planned.intro, {
      x: 0.92,
      y: 1.88,
      w: 11.35,
      h: 0.5,
      margin: 0,
      fontFace: BODY_FONT,
      fontSize: 16,
      color: COLORS.muted,
      fit: "shrink",
      valign: "top",
    });
  }
  slide.addShape("line", {
    x: 6.66,
    y: columnHeaderY,
    w: 0,
    h: 6.24 - columnHeaderY,
    line: { color: COLORS.line, width: 1 },
  });
  slide.addText(planned.leftTitle || "Key points", {
    x: 0.92,
    y: columnHeaderY,
    w: 5.35,
    h: 0.3,
    margin: 0,
    fontFace: BODY_FONT,
    fontSize: 14,
    bold: true,
    color: COLORS.orangeDark,
  });
  slide.addText(planned.rightTitle || "Application", {
    x: 6.96,
    y: columnHeaderY,
    w: 5.35,
    h: 0.3,
    margin: 0,
    fontFace: BODY_FONT,
    fontSize: 14,
    bold: true,
    color: COLORS.tealDark,
  });
  addBulletList(
    slide,
    planned.leftItems.map((text) => ({ kind: "bullet", text })),
    { x: 0.92, y: listY, w: 5.32, h: listH },
  );
  addBulletList(
    slide,
    planned.rightItems.map((text) => ({ kind: "bullet", text })),
    { x: 6.96, y: listY, w: 5.32, h: listH, accent: COLORS.teal },
  );
  addFooter(slide, slideNumber, pkg.client);
  slide.addNotes(
    planned.speakerNotes ||
      `Compare both sides of ${planned.title} and connect them to the training outcome.`,
  );
}

function agendaSectionsFromPlan(slides: SlideDeckSlide[]): DeckSection[] {
  const sectionSlides = slides.filter((slide) => slide.layout === "section");
  const source = sectionSlides.length >= 2
    ? sectionSlides
    : slides.filter((slide) => slide.layout !== "closing").slice(0, 10);
  return source.map((slide) => ({ title: slide.title, items: [] }));
}

function addPlannedSlide(
  pptx: PptxGenJS,
  planned: SlideDeckSlide,
  sectionNumber: number,
  pkg: PptxTrainingPackage,
  slideNumber: number,
) {
  if (planned.layout === "section") {
    addDividerSlide(
      pptx,
      {
        title: planned.title,
        intro: planned.intro,
        items: planned.bullets.map((text) => ({ kind: "bullet", text })),
      },
      sectionNumber,
      pkg,
      slideNumber,
      planned.speakerNotes,
    );
    return;
  }

  if (planned.layout === "statement" || planned.layout === "closing") {
    addStatementSlide(
      pptx,
      {
        title: planned.title,
        items: [{ kind: "paragraph", text: planned.statement }],
      },
      sectionNumber,
      pkg,
      slideNumber,
      planned.speakerNotes,
    );
    return;
  }

  if (planned.layout === "practice") {
    addPracticeSlide(
      pptx,
      {
        title: planned.title,
        intro: planned.intro,
        items: planned.bullets.map((text) => ({ kind: "number", text })),
      },
      sectionNumber,
      pkg,
      slideNumber,
      planned.speakerNotes,
    );
    return;
  }

  if (planned.layout === "two-column") {
    addTwoColumnSlide(pptx, planned, sectionNumber, pkg, slideNumber);
    return;
  }

  const kind: DeckItem["kind"] = planned.layout === "numbered"
    ? "number"
    : "bullet";
  addContentSlide(
    pptx,
    {
      title: planned.title,
      intro: planned.intro,
      items: planned.bullets.map((text) => ({ kind, text })),
    },
    sectionNumber,
    pkg,
    slideNumber,
    planned.speakerNotes,
  );
}

async function loadLogoData() {
  try {
    const data = await readFile(join(process.cwd(), "public", "app-logo.png"));
    return `data:image/png;base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function createPptx(pkg: PptxTrainingPackage) {
  const pptx = new PptxGenJS();
  const logoData = await loadLogoData();
  const structuredPlan = parseSlideDeckPlan(pkg.deckOutline);

  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "DG Academy";
  pptx.company = "DG Academy";
  pptx.subject = `Training slide deck for ${pkg.client}`;
  pptx.title = pkg.title;
  pptx.revision = "1";
  pptx.theme = {
    headFontFace: HEAD_FONT,
    bodyFontFace: BODY_FONT,
  };

  addCoverSlide(pptx, pkg, logoData);

  if (structuredPlan) {
    addAgendaSlide(pptx, agendaSectionsFromPlan(structuredPlan.slides), pkg, 2);
    structuredPlan.slides.forEach((planned, index) => {
      addPlannedSlide(pptx, planned, index + 1, pkg, index + 3);
    });
  } else {
    const parsedSections = parseDeckSections(pkg.deckOutline);
    const sections = parsedSections.flatMap((section, index) =>
      chunkSection(section, index + 1)
    );
    addAgendaSlide(pptx, parsedSections, pkg, 2);

    let slideNumber = 3;
    sections.forEach((section, index) => {
      const sectionNumber = section.sectionNumber ??
        Math.min(index + 1, parsedSections.length);
      if (!section.items.length) {
        addDividerSlide(pptx, section, sectionNumber, pkg, slideNumber);
      } else if (isPracticeSlide(section.title)) {
        addPracticeSlide(pptx, section, sectionNumber, pkg, slideNumber);
      } else if (isStatementSlide(section)) {
        addStatementSlide(pptx, section, sectionNumber, pkg, slideNumber);
      } else {
        addContentSlide(pptx, section, sectionNumber, pkg, slideNumber);
      }
      slideNumber += 1;
    });
  }

  const output = await pptx.write({ outputType: "nodebuffer", compression: true });
  if (Buffer.isBuffer(output)) return output;
  if (typeof output === "string") return Buffer.from(output, "binary");
  return Buffer.from(output as ArrayBuffer);
}
