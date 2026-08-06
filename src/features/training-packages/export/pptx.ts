import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  BookOpenCheck,
  BriefcaseBusiness,
  ChartNoAxesColumnIncreasing,
  CircleCheck,
  Clock3,
  Lightbulb,
  MessageSquareText,
  Settings2,
  ShieldCheck,
  Star,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import PptxGenJS from "pptxgenjs";

import {
  parseSlideDeckPlan,
  type SlideDeckIconKey,
  type SlideDeckSlide,
  type SlideDeckVisualItem,
} from "./slide-deck-plan";
import {
  loadToolLogos,
  resolveToolLogoKey,
  toolLogoCatalog,
  type LoadedToolLogos,
} from "./tool-logo-catalog";

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

const VISUAL_ICONS: Record<SlideDeckIconKey, LucideIcon> = {
  target: Target,
  idea: Lightbulb,
  people: Users,
  chart: ChartNoAxesColumnIncreasing,
  shield: ShieldCheck,
  check: CircleCheck,
  clock: Clock3,
  message: MessageSquareText,
  business: BriefcaseBusiness,
  settings: Settings2,
  star: Star,
  learning: BookOpenCheck,
};

type LucideNode = [
  tag: string,
  attributes: Record<string, string | number>,
];

type LucideComponentWithNodes = {
  render: (
    props: Record<string, unknown>,
    ref: null,
  ) => { props: { iconNode: LucideNode[] } };
};

function svgAttributeName(name: string) {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function escapeSvgAttribute(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function serializeLucideNode([tag, attributes]: LucideNode) {
  const serialized = Object.entries(attributes)
    .filter(([name]) => name !== "key")
    .map(([name, value]) =>
      `${svgAttributeName(name)}="${escapeSvgAttribute(value)}"`
    )
    .join(" ");
  return `<${tag}${serialized ? ` ${serialized}` : ""} />`;
}

function iconData(icon: SlideDeckIconKey, color: string) {
  const Icon = VISUAL_ICONS[icon];
  const rendered = (Icon as unknown as LucideComponentWithNodes).render({}, null);
  const paths = rendered.props.iconNode.map(serializeLucideNode).join("");
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24"',
    ` fill="none" stroke="#${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">`,
    paths,
    "</svg>",
  ].join("");
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function addVisualIcon(
  slide: PptxGenJS.Slide,
  icon: SlideDeckIconKey,
  options: { x: number; y: number; size: number; color: string },
) {
  slide.addImage({
    data: iconData(icon, options.color),
    x: options.x,
    y: options.y,
    w: options.size,
    h: options.size,
    altText: `${icon} icon`,
  });
}

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
  const titleLength = title.replace(/\s+/g, " ").trim().length;
  const titleFontSize = titleLength > 92
    ? 25
    : titleLength > 68
      ? 28
      : titleLength > 46
        ? 31
        : 36;
  slide.addText(title, {
    x: 0.82,
    y: 0.94,
    w: 11.6,
    h: 0.88,
    margin: 0,
    fontFace: HEAD_FONT,
    fontSize: titleFontSize,
    bold: true,
    color: dark ? COLORS.paper : COLORS.ink,
    breakLine: false,
    fit: "shrink",
    valign: "top",
  });
}

function estimatedLineCount(text: string, charsPerLine: number) {
  return text.split(/\r?\n/).reduce(
    (total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)),
    0,
  );
}

function fittedTextFontSize(
  text: string,
  width: number,
  height: number,
  baseFontSize: number,
  minimumFontSize: number,
) {
  const charsPerLine = Math.max(24, Math.floor(width * 10.8));
  const lines = estimatedLineCount(text, charsPerLine);
  const availablePointsPerLine = (height * 72) / Math.max(1, lines) / 1.18;
  return Math.max(
    minimumFontSize,
    Math.min(baseFontSize, availablePointsPerLine),
  );
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
  const textWidth = Math.max(1, options.w - 0.46);
  const charsPerLine = Math.max(24, Math.floor(textWidth * 9.4));
  const lineCounts = items.map((item) =>
    estimatedLineCount(item.text, charsPerLine),
  );
  const totalLines = lineCounts.reduce((sum, value) => sum + value, 0);
  const minimumGap = items.length > 1 ? 0.08 : 0;
  const reservedHeight = minimumGap * Math.max(0, items.length - 1) +
    items.length * 0.06;
  const availableLineHeight = Math.max(0.12, options.h - reservedHeight) /
    Math.max(1, totalLines);
  const fontSize = Math.max(
    12,
    Math.min(17.5, (availableLineHeight * 72) / 1.16),
  );
  const lineHeight = (fontSize * 1.16) / 72;
  const rawHeights = lineCounts.map((lines) => 0.06 + lines * lineHeight);
  const rawTotal = rawHeights.reduce((sum, value) => sum + value, 0);
  const availableItemHeight = Math.max(
    0.4,
    options.h - minimumGap * Math.max(0, items.length - 1),
  );
  const heightScale = Math.min(1, availableItemHeight / Math.max(rawTotal, 0.01));
  const estimatedHeights = rawHeights.map((height) => height * heightScale);
  const totalHeight = estimatedHeights.reduce((sum, value) => sum + value, 0);
  const gap = items.length > 1
    ? Math.max(
        minimumGap,
        Math.min(0.24, (options.h - totalHeight) / (items.length - 1)),
      )
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
      fontSize: item.kind === "paragraph" ? Math.min(18.5, fontSize) : fontSize,
      color: COLORS.ink,
      breakLine: false,
      fit: "shrink",
      valign: "top",
      paraSpaceAfter: 0,
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
  activityLabel = "PRACTICE",
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
  slide.addText(activityLabel, {
    x: 0.74,
    y: 0.72,
    w: 2.8,
    h: 0.28,
    margin: 0,
    fontFace: BODY_FONT,
    fontSize: 11,
    bold: true,
    color: "B9E2DD",
    charSpacing: 2,
    fit: "shrink",
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

function addDemoSlide(
  pptx: PptxGenJS,
  planned: SlideDeckSlide,
  sectionNumber: number,
  pkg: PptxTrainingPackage,
  slideNumber: number,
) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  addSlideTitle(slide, planned.title, sectionNumber);
  const badgeLabel = "LIVE DEMO";
  const badgeWidth = Math.min(2.25, Math.max(1.58, 0.75 + badgeLabel.length * 0.1));
  const badgeX = 12.3 - badgeWidth;

  slide.addShape("roundRect", {
    x: badgeX,
    y: 0.55,
    w: badgeWidth,
    h: 0.34,
    rectRadius: 0.06,
    fill: { color: "FFF0E7" },
    line: { color: COLORS.orange, width: 0.8 },
  });
  slide.addText(badgeLabel, {
    x: badgeX + 0.1,
    y: 0.64,
    w: badgeWidth - 0.2,
    h: 0.14,
    margin: 0,
    align: "center",
    fontFace: BODY_FONT,
    fontSize: 9,
    bold: true,
    color: COLORS.orangeDark,
    charSpacing: 1.2,
    fit: "shrink",
  });

  if (planned.intro) {
    slide.addText(planned.intro, {
      x: 0.92,
      y: 1.88,
      w: 11.35,
      h: 0.56,
      margin: 0,
      fontFace: BODY_FONT,
      fontSize: 16,
      color: COLORS.muted,
      fit: "shrink",
      valign: "top",
    });
  }

  const panelY = planned.intro ? 2.62 : 2.12;
  const panelH = planned.intro ? 3.72 : 4.22;
  slide.addShape("roundRect", {
    x: 0.9,
    y: panelY,
    w: 5.72,
    h: panelH,
    rectRadius: 0.06,
    fill: { color: "FFF8F3" },
    line: { color: "F4B38D", width: 1 },
  });
  slide.addShape("roundRect", {
    x: 6.82,
    y: panelY,
    w: 5.62,
    h: panelH,
    rectRadius: 0.06,
    fill: { color: COLORS.mint },
    line: { color: "8FC8C1", width: 1 },
  });

  slide.addText(planned.leftTitle || "Demonstration input", {
    x: 1.2,
    y: panelY + 0.28,
    w: 5.1,
    h: 0.26,
    margin: 0,
    fontFace: BODY_FONT,
    fontSize: 13,
    bold: true,
    color: COLORS.orangeDark,
  });
  slide.addText(planned.leftItems.join("\n\n"), {
    x: 1.2,
    y: panelY + 0.76,
    w: 5.08,
    h: panelH - 1.02,
    margin: 0,
    fontFace: BODY_FONT,
    fontSize: fittedTextFontSize(
      planned.leftItems.join("\n\n"),
      5.08,
      panelH - 1.02,
      15.5,
      11,
    ),
    color: COLORS.ink,
    breakLine: false,
    fit: "shrink",
    valign: "top",
    paraSpaceAfter: 8,
  });

  slide.addText(planned.rightTitle || "Run, observe, verify", {
    x: 7.12,
    y: panelY + 0.28,
    w: 5.02,
    h: 0.26,
    margin: 0,
    fontFace: BODY_FONT,
    fontSize: 13,
    bold: true,
    color: COLORS.tealDark,
  });
  addBulletList(
    slide,
    planned.rightItems.map((text) => ({ kind: "bullet", text })),
    {
      x: 7.12,
      y: panelY + 0.76,
      w: 4.98,
      h: panelH - 1.02,
      accent: COLORS.teal,
    },
  );

  addFooter(slide, slideNumber, pkg.client);
  slide.addNotes(
    planned.speakerNotes ||
      `Run the demonstration visibly, narrate the decisions, then verify the result before participants practice ${planned.title}.`,
  );
}

function addCaseLabSlide(
  pptx: PptxGenJS,
  planned: SlideDeckSlide,
  sectionNumber: number,
  pkg: PptxTrainingPackage,
  slideNumber: number,
) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.workspace };
  addSlideTitle(slide, planned.title, sectionNumber);
  const badgeLabel = "CASE LAB";
  const badgeWidth = Math.min(2.25, Math.max(1.58, 0.75 + badgeLabel.length * 0.1));
  const badgeX = 12.3 - badgeWidth;

  slide.addShape("roundRect", {
    x: badgeX,
    y: 0.55,
    w: badgeWidth,
    h: 0.34,
    rectRadius: 0.06,
    fill: { color: COLORS.mint },
    line: { color: COLORS.teal, width: 0.8 },
  });
  slide.addText(badgeLabel, {
    x: badgeX + 0.1,
    y: 0.64,
    w: badgeWidth - 0.2,
    h: 0.14,
    margin: 0,
    align: "center",
    fontFace: BODY_FONT,
    fontSize: 9,
    bold: true,
    color: COLORS.tealDark,
    charSpacing: 1.2,
    fit: "shrink",
  });

  slide.addShape("roundRect", {
    x: 0.9,
    y: 1.82,
    w: 11.54,
    h: 0.86,
    rectRadius: 0.05,
    fill: { color: "F7F9F7" },
    line: { color: COLORS.line, width: 0.8 },
  });
  slide.addText(planned.intro, {
    x: 1.16,
    y: 2.02,
    w: 11.02,
    h: 0.46,
    margin: 0,
    fontFace: BODY_FONT,
    fontSize: 15,
    color: COLORS.ink,
    fit: "shrink",
    valign: "middle",
  });

  const panelY = 2.92;
  const panelH = 3.4;
  slide.addShape("roundRect", {
    x: 0.9,
    y: panelY,
    w: 5.6,
    h: panelH,
    rectRadius: 0.06,
    fill: { color: COLORS.paper },
    line: { color: "CAD7D4", width: 0.9 },
  });
  slide.addShape("roundRect", {
    x: 6.72,
    y: panelY,
    w: 5.72,
    h: panelH,
    rectRadius: 0.06,
    fill: { color: COLORS.mint },
    line: { color: "8FC8C1", width: 0.9 },
  });

  slide.addText(planned.leftTitle || "Available evidence", {
    x: 1.18,
    y: panelY + 0.24,
    w: 5.04,
    h: 0.28,
    margin: 0,
    fontFace: HEAD_FONT,
    fontSize: 14,
    bold: true,
    color: COLORS.ink,
  });
  addBulletList(
    slide,
    planned.leftItems.map((text) => ({ kind: "bullet", text })),
    {
      x: 1.18,
      y: panelY + 0.68,
      w: 5,
      h: panelH - 0.9,
      accent: COLORS.orange,
    },
  );

  slide.addText(planned.rightTitle || "Task and required output", {
    x: 7.02,
    y: panelY + 0.24,
    w: 5.08,
    h: 0.28,
    margin: 0,
    fontFace: HEAD_FONT,
    fontSize: 14,
    bold: true,
    color: COLORS.tealDark,
  });
  const taskY = panelY + 0.68;
  const taskHeight = panelH - 0.9;
  const taskRowHeight = taskHeight / Math.max(1, planned.rightItems.length);
  planned.rightItems.forEach((text, index) => {
    const rowY = taskY + index * taskRowHeight;
    slide.addShape("ellipse", {
      x: 7.02,
      y: rowY + 0.07,
      w: 0.28,
      h: 0.28,
      fill: { color: COLORS.teal },
      line: { color: COLORS.teal, transparency: 100 },
    });
    slide.addText(String(index + 1), {
      x: 7.02,
      y: rowY + 0.13,
      w: 0.28,
      h: 0.1,
      margin: 0,
      align: "center",
      fontFace: BODY_FONT,
      fontSize: 7.5,
      bold: true,
      color: COLORS.paper,
    });
    slide.addText(text, {
      x: 7.46,
      y: rowY,
      w: 4.6,
      h: Math.max(0.38, taskRowHeight - 0.06),
      margin: 0,
      fontFace: BODY_FONT,
      fontSize: 13.2,
      color: COLORS.ink,
      fit: "shrink",
      valign: "middle",
    });
  });

  addFooter(slide, slideNumber, pkg.client);
  slide.addNotes(
    planned.speakerNotes ||
      `Brief the case, let participants work from the supplied evidence, then review their deliverable against the stated criteria.`,
  );
}

function addIconCardsSlide(
  pptx: PptxGenJS,
  planned: SlideDeckSlide,
  sectionNumber: number,
  pkg: PptxTrainingPackage,
  slideNumber: number,
  logos: LoadedToolLogos,
) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  addSlideTitle(slide, planned.title, sectionNumber);

  const items = planned.visualItems.slice(0, 4);
  const toolItems = items.map((item) => {
    const key = resolveToolLogoKey(item.label);
    return key ? { item, key, entry: toolLogoCatalog[key], logo: logos[key] } : null;
  });
  const sources = new Set<string>();

  if (items.length >= 2 && toolItems.every(Boolean)) {
    const startX = 0.86;
    const startY = 2.16;
    const totalWidth = 11.62;
    const headerHeight = 0.38;
    const rowHeight = 0.96;
    const columns = [2.18, 1.42, 4.18, 3.84];
    const headings = ["TOOL", "MAKER", "WHAT IT IS", "KNOWN FOR"];
    let headingX = startX;

    headings.forEach((heading, index) => {
      slide.addText(heading, {
        x: headingX + 0.12,
        y: startY,
        w: columns[index] - 0.24,
        h: headerHeight,
        margin: 0,
        fontFace: BODY_FONT,
        fontSize: 9.5,
        bold: true,
        color: COLORS.muted,
        charSpacing: 0.7,
        valign: "middle",
      });
      headingX += columns[index];
    });

    toolItems.forEach((tool, index) => {
      if (!tool) return;
      const rowY = startY + headerHeight + index * rowHeight;
      slide.addShape("roundRect", {
        x: startX,
        y: rowY,
        w: totalWidth,
        h: rowHeight - 0.08,
        rectRadius: 0.04,
        fill: { color: index % 2 === 0 ? "F2F7F6" : "FAF8F5" },
        line: { color: index % 2 === 0 ? COLORS.line : "E8D9CE", width: 0.65 },
      });

      if (tool.logo) {
        sources.add(tool.logo.source);
        slide.addImage({
          data: tool.logo.data,
          x: startX + 0.18,
          y: rowY + 0.2,
          w: 0.46,
          h: 0.46,
          altText: `${tool.logo.name} logo`,
        });
      }
      sources.add(tool.entry.informationSource);
      slide.addText(tool.entry.name, {
        x: startX + 0.76,
        y: rowY + 0.17,
        w: columns[0] - 0.88,
        h: 0.5,
        margin: 0,
        fontFace: HEAD_FONT,
        fontSize: 15.5,
        bold: true,
        color: COLORS.ink,
        fit: "shrink",
        valign: "middle",
      });
      slide.addText(tool.entry.provider, {
        x: startX + columns[0] + 0.12,
        y: rowY + 0.17,
        w: columns[1] - 0.24,
        h: 0.5,
        margin: 0,
        fontFace: BODY_FONT,
        fontSize: 12.5,
        bold: true,
        color: COLORS.muted,
        fit: "shrink",
        valign: "middle",
      });
      slide.addText(tool.entry.description, {
        x: startX + columns[0] + columns[1] + 0.12,
        y: rowY + 0.12,
        w: columns[2] - 0.24,
        h: 0.62,
        margin: 0,
        fontFace: BODY_FONT,
        fontSize: 11.5,
        color: COLORS.ink,
        fit: "shrink",
        valign: "middle",
      });
      slide.addText(tool.entry.knownFor, {
        x: startX + columns[0] + columns[1] + columns[2] + 0.12,
        y: rowY + 0.12,
        w: columns[3] - 0.24,
        h: 0.62,
        margin: 0,
        fontFace: BODY_FONT,
        fontSize: 11.5,
        color: COLORS.tealDark,
        fit: "shrink",
        valign: "middle",
      });
    });

    addFooter(slide, slideNumber, pkg.client);
    const sourceNotes = Array.from(sources).map((source) => `- ${source}`);
    slide.addNotes([
      planned.speakerNotes || `Explain where each named tool may fit, then ask participants to evaluate it against their actual work requirements.`,
      "",
      "[Sources]",
      ...sourceNotes,
    ].join("\n"));
    return;
  }

  const gap = 0.28;
  const x = 0.9;
  const y = 2.22;
  const totalWidth = 11.52;
  const columnWidth = (totalWidth - gap * Math.max(0, items.length - 1)) /
    Math.max(1, items.length);

  items.forEach((item, index) => {
    const itemX = x + index * (columnWidth + gap);
    const key = resolveToolLogoKey(item.label);
    const logo = key ? logos[key] : null;
    const catalogEntry = key ? toolLogoCatalog[key] : null;
    const description = catalogEntry
      ? `${catalogEntry.description}\nKnown for: ${catalogEntry.knownFor}`
      : item.description;
    if (index > 0) {
      slide.addShape("line", {
        x: itemX - gap / 2,
        y: y,
        w: 0,
        h: 4.12,
        line: { color: COLORS.line, width: 0.8 },
      });
    }
    slide.addShape("ellipse", {
      x: itemX + 0.04,
      y,
      w: 0.82,
      h: 0.82,
      fill: { color: index % 2 === 0 ? COLORS.mint : "FFF0E7" },
      line: { color: index % 2 === 0 ? COLORS.teal : COLORS.orange, width: 1 },
    });
    if (logo) {
      sources.add(logo.source);
      slide.addImage({
        data: logo.data,
        x: itemX + 0.24,
        y: y + 0.2,
        w: 0.42,
        h: 0.42,
        altText: `${logo.name} logo`,
      });
    } else {
      addVisualIcon(slide, item.icon, {
        x: itemX + 0.24,
        y: y + 0.2,
        size: 0.42,
        color: index % 2 === 0 ? COLORS.tealDark : COLORS.orangeDark,
      });
    }
    if (catalogEntry) sources.add(catalogEntry.informationSource);
    slide.addText(item.label, {
      x: itemX + 0.04,
      y: y + 1.12,
      w: columnWidth - 0.08,
      h: 0.72,
      margin: 0,
      fontFace: HEAD_FONT,
      fontSize: 22,
      bold: true,
      color: COLORS.ink,
      fit: "shrink",
      valign: "top",
    });
    slide.addText(description, {
      x: itemX + 0.04,
      y: y + 2,
      w: columnWidth - 0.08,
      h: 2.1,
      margin: 0,
      fontFace: BODY_FONT,
      fontSize: 15.5,
      color: COLORS.muted,
      fit: "shrink",
      valign: "top",
      breakLine: false,
    });
  });

  addFooter(slide, slideNumber, pkg.client);
  const sourceNotes = Array.from(sources).map((source) => `- ${source}`);
  slide.addNotes([
    planned.speakerNotes || `Explain how the concepts on ${planned.title} work together.`,
    ...(sourceNotes.length ? ["", "[Sources]", ...sourceNotes] : []),
  ].join("\n"));
}

function addProcessSlide(
  pptx: PptxGenJS,
  planned: SlideDeckSlide,
  sectionNumber: number,
  pkg: PptxTrainingPackage,
  slideNumber: number,
) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.workspace };
  addSlideTitle(slide, planned.title, sectionNumber);

  const items = planned.visualItems.slice(0, 5);
  const gap = 0.42;
  const startX = 0.86;
  const totalWidth = 11.62;
  const nodeWidth = (totalWidth - gap * Math.max(0, items.length - 1)) /
    Math.max(1, items.length);
  const nodeY = 2.68;
  const nodeH = 2.74;

  for (let index = 0; index < items.length - 1; index += 1) {
    const connectorX = startX + nodeWidth + index * (nodeWidth + gap);
    slide.addShape("line", {
      x: connectorX + 0.06,
      y: nodeY + nodeH / 2,
      w: gap - 0.12,
      h: 0,
      line: {
        color: COLORS.orange,
        width: 1.8,
        endArrowType: "triangle",
      },
    });
  }

  items.forEach((item, index) => {
    const itemX = startX + index * (nodeWidth + gap);
    slide.addShape("roundRect", {
      x: itemX,
      y: nodeY,
      w: nodeWidth,
      h: nodeH,
      rectRadius: 0.08,
      fill: { color: COLORS.paper },
      line: { color: index % 2 === 0 ? COLORS.teal : COLORS.orange, width: 1.2 },
    });
    slide.addText(String(index + 1).padStart(2, "0"), {
      x: itemX + 0.18,
      y: nodeY + 0.2,
      w: 0.42,
      h: 0.26,
      margin: 0,
      fontFace: BODY_FONT,
      fontSize: 10,
      bold: true,
      color: COLORS.orangeDark,
    });
    addVisualIcon(slide, item.icon, {
      x: itemX + nodeWidth - 0.66,
      y: nodeY + 0.18,
      size: 0.4,
      color: COLORS.tealDark,
    });
    slide.addText(item.label, {
      x: itemX + 0.18,
      y: nodeY + 0.76,
      w: nodeWidth - 0.36,
      h: 0.68,
      margin: 0,
      fontFace: HEAD_FONT,
      fontSize: 20,
      bold: true,
      color: COLORS.ink,
      fit: "shrink",
      valign: "middle",
    });
    slide.addText(item.description, {
      x: itemX + 0.18,
      y: nodeY + 1.58,
      w: nodeWidth - 0.36,
      h: 0.9,
      margin: 0,
      fontFace: BODY_FONT,
      fontSize: 13.5,
      color: COLORS.muted,
      fit: "shrink",
      valign: "top",
    });
  });

  addFooter(slide, slideNumber, pkg.client);
  slide.addNotes(planned.speakerNotes || `Walk through each stage of ${planned.title} in order.`);
}

function cyclePositions(count: number) {
  const centerX = 6.66;
  const centerY = 4.28;
  const radiusX = count <= 3 ? 3.25 : 3.95;
  const radiusY = 1.84;
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    return {
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY,
    };
  });
}

function addDirectionalConnector(
  slide: PptxGenJS.Slide,
  start: { x: number; y: number },
  end: { x: number; y: number },
  color: string,
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const forward = dx >= 0;
  slide.addShape(dx * dy < 0 ? "lineInv" : "line", {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    w: Math.abs(dx),
    h: Math.abs(dy),
    line: {
      color,
      width: 1.5,
      transparency: 14,
      beginArrowType: forward ? "none" : "triangle",
      endArrowType: forward ? "triangle" : "none",
    },
  });
}

function rectangleEdgePoint(
  center: { x: number; y: number },
  toward: { x: number; y: number },
  width: number,
  height: number,
) {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  const scale = 1 / Math.max(
    Math.abs(dx) / (width / 2),
    Math.abs(dy) / (height / 2),
  );
  return {
    x: center.x + dx * scale,
    y: center.y + dy * scale,
  };
}

function addCycleSlide(
  pptx: PptxGenJS,
  planned: SlideDeckSlide,
  sectionNumber: number,
  pkg: PptxTrainingPackage,
  slideNumber: number,
) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  addSlideTitle(slide, planned.title, sectionNumber);

  const items = planned.visualItems.slice(0, 5);
  const positions = cyclePositions(items.length);
  const nodeW = items.length >= 5 ? 2.16 : 2.45;
  const nodeH = 1.04;

  positions.forEach((position, index) => {
    const next = positions[(index + 1) % positions.length];
    const start = rectangleEdgePoint(position, next, nodeW, nodeH);
    const end = rectangleEdgePoint(next, position, nodeW, nodeH);
    addDirectionalConnector(
      slide,
      start,
      end,
      index % 2 === 0 ? COLORS.teal : COLORS.orange,
    );
  });

  slide.addShape("ellipse", {
    x: 5.64,
    y: 3.34,
    w: 2.04,
    h: 1.88,
    fill: { color: COLORS.graphite },
    line: { color: COLORS.graphite, transparency: 100 },
  });
  slide.addText(planned.visualCenter || planned.title, {
    x: 5.86,
    y: 3.78,
    w: 1.6,
    h: 1,
    margin: 0,
    align: "center",
    fontFace: HEAD_FONT,
    fontSize: 17,
    bold: true,
    color: COLORS.paper,
    fit: "shrink",
    valign: "middle",
  });

  items.forEach((item, index) => {
    const position = positions[index];
    const nodeX = position.x - nodeW / 2;
    const nodeY = position.y - nodeH / 2;
    slide.addShape("roundRect", {
      x: nodeX,
      y: nodeY,
      w: nodeW,
      h: nodeH,
      rectRadius: 0.06,
      fill: { color: index % 2 === 0 ? COLORS.mint : "FFF0E7" },
      line: { color: index % 2 === 0 ? COLORS.teal : COLORS.orange, width: 1 },
    });
    slide.addText(item.label, {
      x: nodeX + 0.12,
      y: nodeY + 0.1,
      w: nodeW - 0.24,
      h: 0.34,
      margin: 0,
      align: "center",
      fontFace: HEAD_FONT,
      fontSize: 16,
      bold: true,
      color: COLORS.ink,
      fit: "shrink",
    });
    slide.addText(item.description, {
      x: nodeX + 0.14,
      y: nodeY + 0.48,
      w: nodeW - 0.28,
      h: 0.42,
      margin: 0,
      align: "center",
      fontFace: BODY_FONT,
      fontSize: 10.5,
      color: COLORS.muted,
      fit: "shrink",
    });
  });

  addFooter(slide, slideNumber, pkg.client);
  slide.addNotes(planned.speakerNotes || `Explain why ${planned.title} repeats rather than ending after one pass.`);
}

function addComparisonSlide(
  pptx: PptxGenJS,
  planned: SlideDeckSlide,
  sectionNumber: number,
  pkg: PptxTrainingPackage,
  slideNumber: number,
) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  addSlideTitle(slide, planned.title, sectionNumber);

  const panels = [
    {
      x: 0.86,
      title: planned.leftTitle || "Current approach",
      items: planned.leftItems,
      accent: COLORS.orange,
      fill: "FFF5EE",
    },
    {
      x: 6.86,
      title: planned.rightTitle || "Better approach",
      items: planned.rightItems,
      accent: COLORS.teal,
      fill: "EDF6F3",
    },
  ];

  panels.forEach((panel) => {
    slide.addShape("roundRect", {
      x: panel.x,
      y: 2.14,
      w: 5.6,
      h: 4.34,
      rectRadius: 0.06,
      fill: { color: panel.fill },
      line: { color: panel.accent, width: 1.1 },
    });
    slide.addShape("rect", {
      x: panel.x,
      y: 2.14,
      w: 0.14,
      h: 4.34,
      fill: { color: panel.accent },
      line: { color: panel.accent, transparency: 100 },
    });
    slide.addText(panel.title, {
      x: panel.x + 0.34,
      y: 2.42,
      w: 4.9,
      h: 0.48,
      margin: 0,
      fontFace: HEAD_FONT,
      fontSize: 24,
      bold: true,
      color: COLORS.ink,
      fit: "shrink",
    });
    addBulletList(
      slide,
      panel.items.map((text) => ({ kind: "bullet" as const, text })),
      {
        x: panel.x + 0.36,
        y: 3.18,
        w: 4.86,
        h: 2.84,
        accent: panel.accent,
      },
    );
  });

  addFooter(slide, slideNumber, pkg.client);
  slide.addNotes(planned.speakerNotes || `Compare both sides of ${planned.title} and make the practical distinction explicit.`);
}

function addMatrixSlide(
  pptx: PptxGenJS,
  planned: SlideDeckSlide,
  sectionNumber: number,
  pkg: PptxTrainingPackage,
  slideNumber: number,
) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.workspace };
  addSlideTitle(slide, planned.title, sectionNumber);

  const items = planned.visualItems.slice(0, 4);
  const x = 1.62;
  const y = 2.14;
  const w = 10.22;
  const h = 3.92;
  const quadrantW = w / 2;
  const quadrantH = h / 2;
  const fills = ["EDF6F3", "FFF5EE", "F6F7F5", "EAF1EE"];

  slide.addShape("line", {
    x: x + quadrantW,
    y,
    w: 0,
    h,
    line: { color: COLORS.graphiteSoft, width: 1.5 },
  });
  slide.addShape("line", {
    x,
    y: y + quadrantH,
    w,
    h: 0,
    line: { color: COLORS.graphiteSoft, width: 1.5 },
  });

  items.forEach((item, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const itemX = x + column * quadrantW;
    const itemY = y + row * quadrantH;
    slide.addShape("rect", {
      x: itemX,
      y: itemY,
      w: quadrantW,
      h: quadrantH,
      fill: { color: fills[index] },
      line: { color: COLORS.line, width: 0.5 },
    });
    slide.addText(item.label, {
      x: itemX + 0.3,
      y: itemY + 0.28,
      w: quadrantW - 0.6,
      h: 0.46,
      margin: 0,
      fontFace: HEAD_FONT,
      fontSize: 20,
      bold: true,
      color: index === 0 || index === 3 ? COLORS.tealDark : COLORS.orangeDark,
      fit: "shrink",
    });
    slide.addText(item.description, {
      x: itemX + 0.3,
      y: itemY + 0.88,
      w: quadrantW - 0.6,
      h: 0.74,
      margin: 0,
      fontFace: BODY_FONT,
      fontSize: 14,
      color: COLORS.muted,
      fit: "shrink",
      valign: "top",
    });
  });

  slide.addText(`↑ ${planned.visualYAxis || "Higher"}`, {
    x: 0.64,
    y: 3.64,
    w: 0.76,
    h: 0.9,
    margin: 0,
    fontFace: BODY_FONT,
    fontSize: 11,
    bold: true,
    color: COLORS.muted,
    fit: "shrink",
    align: "center",
  });
  slide.addText(`${planned.visualXAxis || "Higher"} →`, {
    x: 4.62,
    y: 6.28,
    w: 4.2,
    h: 0.26,
    margin: 0,
    fontFace: BODY_FONT,
    fontSize: 11,
    bold: true,
    color: COLORS.muted,
    align: "center",
  });

  addFooter(slide, slideNumber, pkg.client);
  slide.addNotes(planned.speakerNotes || `Use both axes to explain the four choices in ${planned.title}.`);
}

function addTimelineSlide(
  pptx: PptxGenJS,
  planned: SlideDeckSlide,
  sectionNumber: number,
  pkg: PptxTrainingPackage,
  slideNumber: number,
) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  addSlideTitle(slide, planned.title, sectionNumber);

  const items = planned.visualItems.slice(0, 6);
  const startX = 1.02;
  const endX = 12.26;
  const lineY = 3.92;
  const step = items.length > 1 ? (endX - startX) / (items.length - 1) : 0;

  slide.addShape("line", {
    x: startX,
    y: lineY,
    w: endX - startX,
    h: 0,
    line: { color: COLORS.graphiteSoft, width: 2 },
  });

  items.forEach((item, index) => {
    const pointX = startX + index * step;
    const above = index % 2 === 0;
    slide.addShape("line", {
      x: pointX,
      y: above ? lineY - 0.74 : lineY,
      w: 0,
      h: 0.74,
      line: { color: index % 2 === 0 ? COLORS.orange : COLORS.teal, width: 1.2 },
    });
    slide.addShape("ellipse", {
      x: pointX - 0.18,
      y: lineY - 0.18,
      w: 0.36,
      h: 0.36,
      fill: { color: index % 2 === 0 ? COLORS.orange : COLORS.teal },
      line: { color: COLORS.paper, width: 1.4 },
    });
    slide.addText(String(index + 1).padStart(2, "0"), {
      x: pointX - 0.28,
      y: above ? 2.1 : 5.78,
      w: 0.56,
      h: 0.24,
      margin: 0,
      align: "center",
      fontFace: BODY_FONT,
      fontSize: 9,
      bold: true,
      color: index % 2 === 0 ? COLORS.orangeDark : COLORS.tealDark,
    });
    slide.addText(item.label, {
      x: pointX - 0.9,
      y: above ? 2.4 : 4.48,
      w: 1.8,
      h: 0.46,
      margin: 0,
      align: "center",
      fontFace: HEAD_FONT,
      fontSize: 16,
      bold: true,
      color: COLORS.ink,
      fit: "shrink",
    });
    slide.addText(item.description, {
      x: pointX - 0.94,
      y: above ? 2.88 : 4.96,
      w: 1.88,
      h: 0.66,
      margin: 0,
      align: "center",
      fontFace: BODY_FONT,
      fontSize: 10.5,
      color: COLORS.muted,
      fit: "shrink",
      valign: "top",
    });
  });

  addFooter(slide, slideNumber, pkg.client);
  slide.addNotes(planned.speakerNotes || `Move through the milestones in ${planned.title} from left to right.`);
}

function addFunnelSlide(
  pptx: PptxGenJS,
  planned: SlideDeckSlide,
  sectionNumber: number,
  pkg: PptxTrainingPackage,
  slideNumber: number,
) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.workspace };
  addSlideTitle(slide, planned.title, sectionNumber);

  const items = planned.visualItems.slice(0, 5);
  const topY = 2.02;
  const availableH = 4.52;
  const gap = 0.08;
  const stageH = (availableH - gap * Math.max(0, items.length - 1)) /
    Math.max(1, items.length);
  const widths = items.map((_, index) => 10.6 - index * (5.1 / Math.max(1, items.length - 1)));

  items.forEach((item, index) => {
    const width = widths[index];
    const x = (SLIDE_W - width) / 2;
    const y = topY + index * (stageH + gap);
    const fill = index % 2 === 0 ? COLORS.tealDark : COLORS.orangeDark;
    slide.addShape("trapezoid", {
      x,
      y,
      w: width,
      h: stageH,
      fill: { color: fill },
      line: { color: COLORS.paper, width: 0.8, transparency: 24 },
    });
    slide.addText(`${item.label}${item.description ? `  —  ${item.description}` : ""}`, {
      x: x + 0.44,
      y: y + 0.14,
      w: width - 0.88,
      h: stageH - 0.24,
      margin: 0,
      align: "center",
      fontFace: BODY_FONT,
      fontSize: 14.5,
      bold: true,
      color: COLORS.paper,
      fit: "shrink",
      valign: "middle",
    });
  });

  addFooter(slide, slideNumber, pkg.client);
  slide.addNotes(planned.speakerNotes || `Explain what narrows or becomes more focused through ${planned.title}.`);
}

function formatChartValue(value: number, unit: string) {
  const formatted = Number.isInteger(value)
    ? value.toLocaleString("en-US")
    : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return unit === "%" ? `${formatted}%` : unit ? `${formatted} ${unit}` : formatted;
}

function addChartSlide(
  pptx: PptxGenJS,
  planned: SlideDeckSlide,
  sectionNumber: number,
  pkg: PptxTrainingPackage,
  slideNumber: number,
) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  addSlideTitle(slide, planned.title, sectionNumber);

  const items = planned.visualItems.slice(0, 7);
  const values = items.map((item) => item.value);
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(0, ...values);
  const range = maximum - minimum || 1;
  const chartX = 3.34;
  const chartW = 8.38;
  const zeroX = chartX + ((0 - minimum) / range) * chartW;
  const topY = 2.14;
  const chartH = 4.24;
  const rowH = chartH / Math.max(1, items.length);

  slide.addShape("line", {
    x: zeroX,
    y: topY - 0.06,
    w: 0,
    h: chartH + 0.12,
    line: { color: COLORS.graphiteSoft, width: 1.1 },
  });

  items.forEach((item, index) => {
    const valueX = chartX + ((item.value - minimum) / range) * chartW;
    const barX = Math.min(zeroX, valueX);
    const barW = Math.max(0.06, Math.abs(valueX - zeroX));
    const barY = topY + index * rowH + rowH * 0.2;
    const barH = rowH * 0.56;
    const color = index % 2 === 0 ? COLORS.teal : COLORS.orange;

    slide.addText(item.label, {
      x: 0.9,
      y: barY - 0.02,
      w: 2.12,
      h: barH + 0.04,
      margin: 0,
      align: "right",
      fontFace: BODY_FONT,
      fontSize: 13.5,
      bold: true,
      color: COLORS.ink,
      fit: "shrink",
      valign: "middle",
    });
    slide.addShape("rect", {
      x: barX,
      y: barY,
      w: barW,
      h: barH,
      fill: { color },
      line: { color, transparency: 100 },
    });
    const valueLabelX = item.value >= 0
      ? Math.min(valueX + 0.12, 11.76)
      : Math.max(valueX - 1.14, chartX - 0.04);
    slide.addText(formatChartValue(item.value, planned.visualUnit), {
      x: valueLabelX,
      y: barY,
      w: 1.02,
      h: barH,
      margin: 0,
      align: item.value >= 0 ? "left" : "right",
      fontFace: BODY_FONT,
      fontSize: 11,
      bold: true,
      color: COLORS.muted,
      fit: "shrink",
      valign: "middle",
    });
  });

  if (planned.visualSource) {
    slide.addText(`Source: ${planned.visualSource}`, {
      x: 0.9,
      y: 6.58,
      w: 11.2,
      h: 0.18,
      margin: 0,
      fontFace: BODY_FONT,
      fontSize: 8.5,
      color: COLORS.muted,
      italic: true,
      fit: "shrink",
    });
  }

  addFooter(slide, slideNumber, pkg.client);
  slide.addNotes(planned.speakerNotes || `Explain what the supplied values show and why they matter for ${planned.title}.`);
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
  toolLogos: LoadedToolLogos,
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
      "PRACTICE",
    );
    return;
  }

  if (planned.layout === "demo") {
    addDemoSlide(pptx, planned, sectionNumber, pkg, slideNumber);
    return;
  }

  if (planned.layout === "case-lab") {
    addCaseLabSlide(pptx, planned, sectionNumber, pkg, slideNumber);
    return;
  }

  if (planned.layout === "two-column") {
    addTwoColumnSlide(pptx, planned, sectionNumber, pkg, slideNumber);
    return;
  }

  if (planned.layout === "icon-cards") {
    addIconCardsSlide(
      pptx,
      planned,
      sectionNumber,
      pkg,
      slideNumber,
      toolLogos,
    );
    return;
  }

  if (planned.layout === "process") {
    addProcessSlide(pptx, planned, sectionNumber, pkg, slideNumber);
    return;
  }

  if (planned.layout === "cycle") {
    addCycleSlide(pptx, planned, sectionNumber, pkg, slideNumber);
    return;
  }

  if (planned.layout === "comparison") {
    addComparisonSlide(pptx, planned, sectionNumber, pkg, slideNumber);
    return;
  }

  if (planned.layout === "matrix") {
    addMatrixSlide(pptx, planned, sectionNumber, pkg, slideNumber);
    return;
  }

  if (planned.layout === "timeline") {
    addTimelineSlide(pptx, planned, sectionNumber, pkg, slideNumber);
    return;
  }

  if (planned.layout === "funnel") {
    addFunnelSlide(pptx, planned, sectionNumber, pkg, slideNumber);
    return;
  }

  if (planned.layout === "chart") {
    addChartSlide(pptx, planned, sectionNumber, pkg, slideNumber);
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
    const toolLogos = await loadToolLogos(
      structuredPlan.slides
        .filter((slide) => slide.layout === "icon-cards")
        .flatMap((slide) => slide.visualItems.map((item) => item.label)),
    );
    addAgendaSlide(pptx, agendaSectionsFromPlan(structuredPlan.slides), pkg, 2);
    structuredPlan.slides.forEach((planned, index) => {
      addPlannedSlide(pptx, planned, index + 1, pkg, index + 3, toolLogos);
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
