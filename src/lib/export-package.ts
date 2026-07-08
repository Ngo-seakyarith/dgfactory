import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  LineRuleType,
  Packer,
  PageBreak,
  Paragraph,
  Tab,
  TabStopType,
  TextRun,
} from "docx";

import {
  fullPackageToMarkdown,
  qualityChecklistToMarkdown,
  type TrainingPackage,
} from "@/lib/training-packages";
import {
  formatMoney,
  pricingSummaryToMarkdown,
} from "@/lib/pricing";
import {
  normalizeProposalContent,
  type ProposalContent,
} from "@/lib/proposal-content";
import { isTrustedTrainerImageUrl } from "@/lib/trainers";

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

type ExportResult = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};

type DocumentSection = {
  title: string;
  body: string;
};

let logoDataPromise: Promise<Buffer | null> | null = null;
let signatureImageDataPromise: Promise<Buffer | null> | null = null;
const trainerImagePromises = new Map<string, Promise<TrainerImageData>>();

type TrainerImageData = {
  data: Buffer;
  type: "jpg" | "png";
  width: number;
  height: number;
};

function loadLogoData() {
  if (!logoDataPromise) {
    logoDataPromise = readFile(join(process.cwd(), "public", "app-logo.png")).catch(
      () => null,
    );
  }

  return logoDataPromise;
}

function imageDimensions(data: Buffer, type: "jpg" | "png") {
  if (type === "png" && data.length >= 24) {
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  }

  if (type === "jpg") {
    let offset = 2;
    while (offset + 8 < data.length) {
      if (data[offset] !== 0xff) {
        offset += 1;
        continue;
      }

      const marker = data[offset + 1];
      const segmentLength = data.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return {
          width: data.readUInt16BE(offset + 7),
          height: data.readUInt16BE(offset + 5),
        };
      }
      if (segmentLength < 2) break;
      offset += segmentLength + 2;
    }
  }

  return { width: 128, height: 139 };
}

async function fetchTrainerImage(imageUrl: string): Promise<TrainerImageData> {
  if (!isTrustedTrainerImageUrl(imageUrl)) {
    throw new Error("The selected trainer photo URL is not an approved ImageKit asset.");
  }

  const response = await fetch(imageUrl, {
    headers: { Accept: "image/png,image/jpeg" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Unable to load the selected trainer photo (${response.status}).`);
  }

  const data = Buffer.from(await response.arrayBuffer());
  if (data.length === 0 || data.length > 10 * 1024 * 1024) {
    throw new Error("The selected trainer photo is empty or too large.");
  }
  const isPng =
    data.length >= 8 && data.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  const isJpeg = data.length >= 2 && data[0] === 0xff && data[1] === 0xd8;
  const type = isPng ? "png" : isJpeg ? "jpg" : null;
  if (!type) {
    throw new Error("The selected trainer photo returned invalid image data.");
  }

  return { data, type, ...imageDimensions(data, type) };
}

function loadTrainerImageData(imageUrl: string) {
  const existing = trainerImagePromises.get(imageUrl);
  if (existing) return existing;

  const pending = fetchTrainerImage(imageUrl).catch((error) => {
    trainerImagePromises.delete(imageUrl);
    throw error;
  });
  trainerImagePromises.set(imageUrl, pending);
  return pending;
}

function fitImage(
  image: Pick<TrainerImageData, "width" | "height">,
  maxWidth: number,
  maxHeight: number,
) {
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  return {
    width: Math.max(1, Math.round(image.width * scale)),
    height: Math.max(1, Math.round(image.height * scale)),
  };
}

function loadSignatureImageData() {
  if (!signatureImageDataPromise) {
    signatureImageDataPromise = readFile(
      join(process.cwd(), "public", "signature-hin-sopheap.png"),
    ).catch(() => null);
  }
  return signatureImageDataPromise;
}

function filePart(value: string) {
  return (
    value
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 72) || "TrainingPackage"
  );
}

function exportLabel(target: ExportTarget) {
  const labels: Record<ExportTarget, string> = {
    full: "FullPackage",
    proposal: "Proposal",
    syllabus: "Syllabus",
    workbook: "Workbook",
    "follow-up-email": "FollowUpEmail",
    slides: "Slides",
    summary: "Summary",
    pricing: "Pricing",
  };

  return labels[target];
}

function exportFilename(
  pkg: TrainingPackage,
  target: ExportTarget,
  extension: ExportFormat,
) {
  return `DGAcademy_${filePart(pkg.title)}_${filePart(pkg.client)}_${exportLabel(target)}.${extension}`;
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(value: string, maxLength = 92) {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    if (!word) {
      return;
    }

    if (`${current} ${word}`.trim().length > maxLength) {
      if (current) {
        lines.push(current);
      }
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  });

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
}

function markdownToLines(value: string) {
  return value.split(/\r?\n/);
}

function contentForTarget(
  pkg: TrainingPackage,
  target: ExportTarget,
) {
  const pricingSummary = pricingSummaryToMarkdown(pkg.pricingInputs, pkg.pricingOutputs);
  const summary = [
    `# ${pkg.title}`,
    "",
    `Client: ${pkg.client}`,
    `Audience: ${pkg.audience}`,
    `Duration: ${pkg.duration}`,
    `Promise: ${pkg.promise}`,
    "",
    "## Included Assets",
    "- Client proposal",
    "- Full syllabus",
    "- Participant workbook",
    "- Slide deck outline",
    "- Follow-up email",
    "- Quality checklist",
    "",
    "## Pricing Summary",
    pricingSummary,
    "",
    "## Quality Checklist",
    qualityChecklistToMarkdown(pkg.qualityChecklist),
  ].join("\n");

  const content: Record<ExportTarget, string> = {
    full: fullPackageToMarkdown(pkg),
    proposal: [pkg.proposal, pkg.commercialProposal].filter(Boolean).join("\n\n"),
    syllabus: pkg.syllabus,
    workbook: pkg.workbook,
    "follow-up-email": pkg.followUpEmail,
    slides: pkg.deckOutline,
    summary,
    pricing: [
      pricingSummary,
      "",
      "## Client-Facing Commercial Proposal",
      pkg.commercialProposal,
    ]
      .filter(Boolean)
      .join("\n"),
  };

  return content[target] ?? content.full;
}

function docTitle(target: ExportTarget) {
  const titles: Record<ExportTarget, string> = {
    full: "Full Training Package",
    proposal: "Client Proposal",
    syllabus: "Full Syllabus",
    workbook: "Participant Workbook",
    "follow-up-email": "Follow-Up Email",
    slides: "Slide Deck Outline",
    summary: "Package Summary",
    pricing: "Pricing Summary",
  };

  return titles[target];
}

const crcTable = new Uint32Array(256).map((_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const time =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const day =
    ((date.getFullYear() - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();

  return { time, day };
}

function createZip(files: Array<{ name: string; content: string | Buffer }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  const { time, day } = dosDateTime();

  files.forEach((file) => {
    const name = Buffer.from(file.name, "utf8");
    const content = Buffer.isBuffer(file.content)
      ? file.content
      : Buffer.from(file.content, "utf8");
    const crc = crc32(content);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(content.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, content);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(content.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + content.length;
  });

  const centralSize = centralParts.reduce((size, part) => size + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, end]);
}

function docxHeading(text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel]) {
  return new Paragraph({
    children: [
      docxText(text, {
        bold: true,
        color: "000000",
        size: level === HeadingLevel.HEADING_1 ? 30 : 26,
      }),
    ],
    heading: level,
    keepNext: true,
    spacing: { before: 240, after: 120 },
  });
}

function docxText(
  text: string,
  options: { bold?: boolean; color?: string; size?: number } = {},
) {
  return new TextRun({
    text,
    bold: options.bold,
    color: options.color,
    font: "Arial",
    size: options.size ?? 22,
  });
}

function docxParagraph(text: string) {
  return new Paragraph({
    children: [docxText(text)],
    spacing: { after: 120 },
  });
}

function docxBullet(text: string) {
  return new Paragraph({
    children: [docxText(text)],
    bullet: { level: 0 },
    spacing: { after: 80 },
  });
}

function docxLabeledBullet(label: string, value: string) {
  return new Paragraph({
    children: [docxText(`${label}: `, { bold: true }), docxText(value)],
    bullet: { level: 0 },
    spacing: { after: 100 },
  });
}

function docxLabeledParagraph(label: string, value: string) {
  return new Paragraph({
    children: [docxText(`${label}: `, { bold: true }), docxText(value)],
    spacing: { after: 100 },
  });
}

function emptyParagraph() {
  return new Paragraph({ text: "", spacing: { after: 120 } });
}

function pageBreakParagraph() {
  return new Paragraph({ children: [new PageBreak()] });
}

function logoParagraph(
  logoData: Buffer | null,
  size: number,
  spacing: { before?: number; after?: number },
) {
  return logoData
    ? new Paragraph({
        children: [
          new ImageRun({
            type: "png",
            data: logoData,
            transformation: { width: size, height: size },
            altText: {
              title: "DG Academy",
              description: "DG Academy logo",
              name: "DG Academy logo",
            },
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing,
      })
    : new Paragraph({
        children: [docxText("DG Academy", { bold: true, size: 28 })],
        alignment: AlignmentType.CENTER,
        spacing,
      });
}

function exportFooter() {
  const footerText = (text: string, color = "595959") =>
    new TextRun({ text, color, font: "Calibri Light", size: 22 });
  const footerSymbol = (
    text: string,
    color: string,
    font = "Segoe UI Symbol",
  ) => new TextRun({ text, color, font, size: 30, position: "-1pt" });
  const footerLink = (text: string) =>
    new TextRun({
      text,
      color: "0070C0",
      font: "Calibri Light",
      size: 22,
      underline: {},
    });
  const footerTab = () => new TextRun({ children: [new Tab()] });

  return new Footer({
    children: [
      new Paragraph({
        children: [
          footerText(
            "Address: 9th Floor, PPIU Building Street 169, Sangkat Veal Vong, Khan 7 Makara, Phnom Penh, Cambodia.",
            "404040",
          ),
        ],
        alignment: AlignmentType.CENTER,
        border: {
          top: {
            style: BorderStyle.SINGLE,
            color: "4472C4",
            size: 8,
            space: 8,
          },
        },
        indent: { left: -600, right: -600 },
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          footerSymbol("\u260E", "E4C36A"),
          footerText(" 095 666 788"),
          footerTab(),
          footerSymbol("\u2709", "009FE3"),
          footerText(" "),
          footerLink("contact@dgdemy.org"),
          footerTab(),
          footerSymbol("\uD83C\uDF10", "009FE3", "Segoe UI Emoji"),
          footerText(" "),
          footerLink("www.dgdemy.org"),
        ],
        tabStops: [
          { type: TabStopType.LEFT, position: 3600 },
          { type: TabStopType.LEFT, position: 6900 },
        ],
        indent: { left: -600, right: -600 },
        spacing: { after: 0 },
      }),
    ],
  });
}

function sectionChildren(title: string, body: string | string[]) {
  if (Array.isArray(body)) {
    const items = body.map((item) => item.trim()).filter(Boolean);
    return items.length > 0
      ? [
          docxHeading(title, HeadingLevel.HEADING_1),
          ...items.map((item) => docxBullet(item)),
        ]
      : [];
  }

  const paragraphs = body
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  return paragraphs.length > 0
    ? [
        docxHeading(title, HeadingLevel.HEADING_1),
        ...paragraphs.map((item) => docxParagraph(item)),
      ]
    : [];
}

function wrapCoverText(text: string, maxCharacters: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];

  words.forEach((word) => {
    const current = lines.at(-1);
    if (!current || `${current} ${word}`.length > maxCharacters) {
      lines.push(word);
      return;
    }
    lines[lines.length - 1] = `${current} ${word}`;
  });

  return lines.length > 0 ? lines : [text];
}

function coverTextRuns(
  lines: string[],
  options: { bold?: boolean; color?: string; size: number },
) {
  return lines.flatMap((line, index) => [
    ...(index > 0 ? [new TextRun({ break: 1 })] : []),
    docxText(line, options),
  ]);
}

function proposalRun(
  text: string,
  options: {
    bold?: boolean;
    italics?: boolean;
    font?: string;
    size?: number;
  } = {},
) {
  return new TextRun({
    text,
    bold: options.bold,
    italics: options.italics,
    font: options.font ?? "Calibri",
    size: options.size ?? 24,
  });
}

function proposalHeading(text: string, before = 260, after = 260) {
  return new Paragraph({
    children: [proposalRun(text, { bold: true, font: "Arial", size: 28 })],
    spacing: { before, after },
    keepNext: true,
  });
}

function proposalParagraph(
  text: string,
  options: {
    bold?: boolean;
    italics?: boolean;
    font?: string;
    size?: number;
    before?: number;
    after?: number;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
  } = {},
) {
  return new Paragraph({
    children: [proposalRun(text, options)],
    alignment: options.alignment,
    spacing: {
      before: options.before ?? 0,
      after: options.after ?? 180,
      line: 336,
      lineRule: LineRuleType.AT_LEAST,
    },
  });
}

function proposalBullet(
  text: string,
  font = "Calibri",
  size = 24,
  after = 70,
) {
  return new Paragraph({
    children: [proposalRun(text, { font, size })],
    bullet: { level: 0 },
    indent: { left: 360, hanging: 360 },
    spacing: { after, line: 330, lineRule: LineRuleType.AT_LEAST },
  });
}

function proposalSessionChildren(item: string, index: number) {
  const [headingSource, detailSource] = item.includes("|")
    ? item.split(/\s*\|\s*/, 2)
    : [`Session ${index + 1}`, item.replace(/^Session\s+\d+\s*:\s*/i, "")];
  const heading = headingSource.trim() || `Session ${index + 1}`;
  const details = detailSource
    .split(/;\s*/)
    .map((detail) => detail.trim())
    .filter(Boolean);

  return [
    proposalParagraph(heading, {
      bold: true,
      font: "Calibri Light",
      size: 26,
      before: 160,
      after: 80,
    }),
    ...details.map((detail) => proposalBullet(detail)),
  ];
}

function proposalScheduleBullet(label: string, value: string) {
  return new Paragraph({
    children: [
      proposalRun(label),
      new TextRun({ children: [new Tab()] }),
      proposalRun(`: ${value}`),
    ],
    bullet: { level: 0 },
    indent: { left: 360, hanging: 360 },
    tabStops: [{ type: TabStopType.LEFT, position: 2880 }],
    spacing: { after: 100, line: 336, lineRule: LineRuleType.AT_LEAST },
  });
}

function markdownToDocxChildren(markdown: string) {
  const children: Paragraph[] = [];

  markdownToLines(markdown).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      children.push(emptyParagraph());
      return;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (heading) {
      children.push(
        docxHeading(
          heading[2],
          heading[1].length === 1
            ? HeadingLevel.HEADING_1
            : HeadingLevel.HEADING_2,
        ),
      );
      return;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)/);
    if (bullet) {
      children.push(docxBullet(bullet[1]));
      return;
    }

    children.push(docxParagraph(trimmed));
  });

  return children;
}

function proposalDocxChildren(
  content: ProposalContent,
  totalFee: string,
  participantCount: number,
  logoData: Buffer | null,
  trainerImageData: TrainerImageData | null,
  signatureImageData: Buffer | null,
) {
  const title = content.coverTitle || "Customized Training Proposal";
  const courseTitleLines = wrapCoverText(content.courseTitle, 18);
  courseTitleLines[0] = `\u201C${courseTitleLines[0]}`;
  courseTitleLines[courseTitleLines.length - 1] = `${courseTitleLines.at(-1)}\u201D`;
  const sessions = content.contentOutlines.flatMap((item, index) =>
    proposalSessionChildren(item, index),
  );
  const firstPageSessions = content.contentOutlines
    .slice(0, 3)
    .flatMap((item, index) => proposalSessionChildren(item, index));
  const secondPageSessions = content.contentOutlines
    .slice(3)
    .flatMap((item, index) => proposalSessionChildren(item, index + 3));
  const trainerImageSize = trainerImageData
    ? fitImage(trainerImageData, 150, 180)
    : null;
  const signatureTabs = [{ type: TabStopType.LEFT, position: 5760 }];
  const participantLabel =
    participantCount > 0 ? `${participantCount} Pax` : content.schedule.participants;

  return [
    logoParagraph(logoData, 120, { before: 0, after: 480 }),
    new Paragraph({
      children: [docxText(title, { size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 320 },
    }),
    new Paragraph({
      children: [docxText("On", { size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
    }),
    new Paragraph({
      children: coverTextRuns(courseTitleLines, {
        bold: true,
        color: "0070C0",
        size: 72,
      }),
      alignment: AlignmentType.CENTER,
      spacing: {
        after: 528,
        line: 1244,
        lineRule: LineRuleType.EXACT,
      },
    }),
    ...(content.coverSubtitle
      ? [
          new Paragraph({
            children: coverTextRuns(wrapCoverText(content.coverSubtitle, 40), {
              bold: true,
              color: "0070C0",
              size: 48,
            }),
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 944,
              line: 596,
              lineRule: LineRuleType.EXACT,
            },
          }),
        ]
      : []),
    ...(content.certificationLabel
      ? [
          new Paragraph({
            children: coverTextRuns(
              wrapCoverText(content.certificationLabel, 38),
              {
                bold: true,
                color: "0070C0",
                size: 48,
              },
            ),
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 374,
              line: 826,
              lineRule: LineRuleType.EXACT,
            },
          }),
        ]
      : []),
    new Paragraph({
      children: [docxText("for", { bold: true, color: "0070C0", size: 52 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 460 },
    }),
    new Paragraph({
      children: [
        docxText(content.client, { bold: true, color: "0070C0", size: 52 }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
    }),
    pageBreakParagraph(),
    proposalHeading("I. Course Overview", 0),
    ...content.courseOverview.map((item) => proposalParagraph(item)),
    proposalHeading("II. Course Objectives"),
    proposalParagraph(
      "Upon completion of this training program, participants will be able to:",
      { after: 140 },
    ),
    ...content.courseObjectives.map((item) => proposalBullet(item)),
    proposalHeading("III. Content Outlines"),
    ...firstPageSessions,
    pageBreakParagraph(),
    ...(secondPageSessions.length > 0 ? secondPageSessions : sessions.slice(6)),
    proposalHeading("IV. Training Methodology"),
    ...content.trainingMethodology.map((item) => proposalBullet(item)),
    proposalHeading("V. Schedule"),
    proposalScheduleBullet("Course Duration", content.schedule.duration),
    proposalScheduleBullet("Date", content.schedule.date),
    proposalScheduleBullet("Time", content.schedule.time),
    proposalScheduleBullet("Venue", content.schedule.venue),
    proposalScheduleBullet("Participants", participantLabel),
    pageBreakParagraph(),
    proposalHeading("Trainers", 0),
    ...(trainerImageData
      ? [
          new Paragraph({
            children: [
              new ImageRun({
                type: trainerImageData.type,
                data: trainerImageData.data,
                transformation: trainerImageSize ?? { width: 128, height: 139 },
                altText: {
                  title: content.trainer.name,
                  description: `${content.trainer.name}, DG Academy trainer`,
                  name: `${content.trainer.name} portrait`,
                },
              }),
            ],
            indent: { left: 300 },
            spacing: { before: 72, after: 180 },
          }),
        ]
      : []),
    proposalParagraph(content.trainer.name, {
        bold: true,
        font: "Arial",
        size: 24,
        after: 160,
    }),
    proposalParagraph(content.trainer.title, {
        bold: true,
        italics: true,
        font: "Arial",
        size: 24,
        after: 220,
    }),
    ...content.trainer.bio.map((item, index) =>
      proposalParagraph(item, {
        font: "Arial",
        size: 24,
        alignment: AlignmentType.JUSTIFIED,
        after: index === content.trainer.bio.length - 1 ? 0 : 180,
      }),
    ),
    ...(content.trainer.experience.length > 0
      ? [
          proposalHeading("Experience", 260, 120),
          ...content.trainer.experience.map((item) =>
            proposalBullet(item, "Arial", 22, 70),
          ),
        ]
      : []),
    ...(content.trainer.qualifications.length > 0
      ? [
          proposalHeading("Qualifications", 260, 120),
          ...content.trainer.qualifications.map((item) =>
            proposalBullet(item, "Arial", 22, 70),
          ),
        ]
      : []),
    pageBreakParagraph(),
    proposalHeading("VI. Professional Fee & Logistics", 0, 0),
    proposalParagraph("The training package includes:", {
      size: 22,
      after: 140,
    }),
    ...content.professionalFee.included.map((item) =>
      proposalBullet(item, "Calibri", 22, 40),
    ),
    proposalParagraph(totalFee, {
      bold: true,
      size: 22,
      before: 0,
      after: 120,
    }),
    proposalParagraph(`${content.client} will be responsible for the following:`, {
      size: 22,
      after: 140,
    }),
    ...content.professionalFee.clientResponsibilities.map((item) =>
      proposalBullet(item, "Calibri", 22, 40),
    ),
    new Paragraph({
      children: [
        proposalRun("Billing arrangements: ", { bold: true, size: 22 }),
        proposalRun(content.professionalFee.billingArrangement, { size: 22 }),
      ],
      spacing: { before: 620, after: 20, line: 320 },
    }),
    ...(content.professionalFee.paymentInstructions
      ? [proposalParagraph(content.professionalFee.paymentInstructions, { size: 22 })]
      : []),
    proposalParagraph("Acknowledgement and Acceptance", {
      font: "Calibri Light",
      size: 32,
      before: 20,
      after: 120,
    }),
    proposalParagraph(content.professionalFee.acceptanceText, {
      size: 22,
      after: 160,
    }),
    proposalParagraph(
      `${content.client} confirms engaging DG Academy to conduct the ${content.courseTitle} training described above.`,
      { size: 22, after: 0 },
    ),
    new Paragraph({
      children: [
        proposalRun("DG Academy", { bold: true, font: "Arial", size: 24 }),
        new TextRun({ children: [new Tab()] }),
        proposalRun(content.client, { bold: true, font: "Arial", size: 24 }),
      ],
      tabStops: signatureTabs,
      spacing: { before: 1400, after: 100 },
    }),
    ...(signatureImageData
      ? [
          new Paragraph({
            children: [
              new ImageRun({
                type: "png",
                data: signatureImageData,
                transformation: { width: 136, height: 102 },
                altText: {
                  title: "Hin Sopheap signature",
                  description: "Signature of Hin Sopheap",
                  name: "Hin Sopheap signature",
                },
              }),
            ],
            indent: { left: 360 },
            spacing: { after: 20 },
          }),
        ]
      : []),
    new Paragraph({
      children: [
        proposalRun(content.signatory.name, {
          bold: true,
          font: "Arial",
          size: 24,
        }),
        new TextRun({ children: [new Tab()] }),
        proposalRun("........................................", {
          bold: true,
          font: "Arial",
          size: 24,
        }),
      ],
      tabStops: signatureTabs,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        proposalRun(content.signatory.title, {
          bold: true,
          font: "Arial",
          size: 24,
        }),
        new TextRun({ children: [new Tab()] }),
        proposalRun("........................................", {
          bold: true,
          font: "Arial",
          size: 24,
        }),
      ],
      tabStops: signatureTabs,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        proposalRun(`Date ${content.signatory.date}`, {
          bold: true,
          font: "Arial",
          size: 24,
        }),
        new TextRun({ children: [new Tab()] }),
        proposalRun("Date:........./............./..........", {
          bold: true,
          font: "Arial",
          size: 24,
        }),
      ],
      tabStops: signatureTabs,
      spacing: { after: 0 },
    }),
  ];
}

async function createDocx(
  pkg: TrainingPackage,
  target: ExportTarget,
) {
  const body = contentForTarget(pkg, target);
  const proposalContent = normalizeProposalContent(pkg.proposalContent, body, {
    title: pkg.title,
    client: pkg.client,
    audience: pkg.audience,
    duration: pkg.duration,
    promise: pkg.promise,
    proposalBrief: pkg.proposalBrief,
  });
  const [logoData, trainerImageData, signatureImageData] = await Promise.all([
    loadLogoData(),
    target === "proposal" && proposalContent.trainer.imageUrl
      ? loadTrainerImageData(proposalContent.trainer.imageUrl)
      : Promise.resolve(null),
    loadSignatureImageData(),
  ]);
  const deterministicFee =
    pkg.pricingOutputs.finalPrice > 0
      ? `Total professional fee for ${pkg.duration.toLowerCase()} training (${pkg.pricingInputs.taxPercent > 0 ? "including VAT" : "excluding VAT"}): ${formatMoney(
          pkg.pricingOutputs.finalPrice,
          pkg.pricingInputs.currency,
        )}.`
      : proposalContent.professionalFee.totalFee;
  const children =
    target === "proposal" && pkg.proposalContent
      ? proposalDocxChildren(
          proposalContent,
          deterministicFee,
          pkg.pricingInputs.numberOfParticipants,
          logoData,
          trainerImageData,
          signatureImageData,
        )
      : [
          logoParagraph(logoData, 64, { after: 240 }),
          docxHeading(docTitle(target), HeadingLevel.HEADING_1),
          docxParagraph(`Course: ${pkg.title}`),
          docxParagraph(`Client: ${pkg.client}`),
          docxParagraph(`Date generated: ${new Date().toLocaleDateString("en-US")}`),
          pageBreakParagraph(),
          ...markdownToDocxChildren(body),
        ];

  const document = new Document({
    creator: "DG Academy",
    title: `${pkg.title} - ${docTitle(target)}`,
    sections: [
      {
        footers: {
          default: exportFooter(),
          first: exportFooter(),
          even: exportFooter(),
        },
        properties: {
          page: {
            size: {
              width: 12240,
              height: 15840,
            },
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1080,
              left: 1440,
              footer: 320,
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}

function parseDeckSections(deckOutline: string) {
  const lines = markdownToLines(deckOutline)
    .map((line) => line.trim())
    .filter(Boolean);
  const sections: DocumentSection[] = [];

  lines.forEach((line) => {
    const heading = line.match(/^#{1,3}\s+(.+)/)?.[1];
    const numbered = line.match(/^\d+[.)]\s+(.+)/)?.[1];

    if (heading || numbered) {
      sections.push({ title: heading ?? numbered ?? line, body: "" });
    } else if (sections.length > 0) {
      sections[sections.length - 1].body += `${sections[sections.length - 1].body ? "\n" : ""}${line}`;
    }
  });

  return sections.length > 0
    ? sections.slice(0, 18)
    : [{ title: "Slide Deck Outline", body: deckOutline }];
}

function shape(id: number, title: string, body: string, y = 457200) {
  const bodyLines = wrapText(body, 56).slice(0, 10);
  return `
<p:sp>
  <p:nvSpPr><p:cNvPr id="${id}" name="Content ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
  <p:spPr><a:xfrm><a:off x="685800" y="${y}"/><a:ext x="7772400" y="${id === 2 ? 548640 : 3962400}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
  <p:txBody><a:bodyPr/><a:lstStyle/>${title ? `<a:p><a:r><a:rPr lang="en-US" sz="${id === 2 ? 3300 : 2200}" b="1"/><a:t>${xmlEscape(title)}</a:t></a:r></a:p>` : ""}${bodyLines
    .map(
      (line) =>
        `<a:p><a:r><a:rPr lang="en-US" sz="1750"/><a:t>${xmlEscape(line)}</a:t></a:r></a:p>`,
    )
    .join("")}</p:txBody>
</p:sp>`;
}

function slideXml(title: string, body: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext x="0" y="0"/><a:chOff x="0" y="0"/><a:chExt x="0" y="0"/></a:xfrm></p:grpSpPr>
    ${shape(2, title, "", 420000)}
    ${shape(3, "", body, 1350000)}
  </p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
}

function notesXml(title: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext x="0" y="0"/><a:chOff x="0" y="0"/><a:chExt x="0" y="0"/></a:xfrm></p:grpSpPr>
    ${shape(2, "Speaker notes", `Facilitator cue: connect this slide to ${title}. Invite the client to name one operational implication.`, 685800)}
  </p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:notes>`;
}

function createPptx(pkg: TrainingPackage) {
  const sections = parseDeckSections(pkg.deckOutline);
  const slides: DocumentSection[] = [
    {
      title: pkg.title,
      body: `DG Academy\nClient: ${pkg.client}\nAudience: ${pkg.audience}\n${pkg.promise}`,
    },
    {
      title: "Agenda",
      body: sections.map((section, index) => `${index + 1}. ${section.title}`).join("\n"),
    },
    ...sections.map((section) => ({
      title: section.title,
      body: section.body || "Discussion, client example, and practical application.",
    })),
  ];

  const slideOverrides = slides
    .map(
      (_, index) =>
        `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/><Override PartName="/ppt/notesSlides/notesSlide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>`,
    )
    .join("");
  const slideIds = slides
    .map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`)
    .join("");
  const slideRels = slides
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`,
    )
    .join("");

  return createZip([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  ${slideOverrides}
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`,
    },
    {
      name: "ppt/presentation.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldIdLst>${slideIds}</p:sldIdLst>
  <p:sldSz cx="9144000" cy="5143500" type="screen16x9"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`,
    },
    {
      name: "ppt/_rels/presentation.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${slideRels}
</Relationships>`,
    },
    ...slides.flatMap((slide, index) => [
      {
        name: `ppt/slides/slide${index + 1}.xml`,
        content: slideXml(slide.title, slide.body),
      },
      {
        name: `ppt/slides/_rels/slide${index + 1}.xml.rels`,
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide${index + 1}.xml"/></Relationships>`,
      },
      {
        name: `ppt/notesSlides/notesSlide${index + 1}.xml`,
        content: notesXml(slide.title),
      },
    ]),
  ]);
}

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
