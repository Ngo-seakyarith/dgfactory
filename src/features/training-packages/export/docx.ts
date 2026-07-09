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
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import {
  normalizePricingInputs,
  formatMoney,
} from "@/features/training-packages/domain/pricing";
import type { TrainingPackage } from "@/features/training-packages/domain/training-package";
import {
  normalizeProposalContent,
  type ProposalContent,
} from "@/features/training-packages/domain/proposal-content";
import { isTrustedTrainerImageUrl } from "@/features/training-packages/domain/trainers";
import { contentForTarget, docTitle, markdownToLines, wrapText } from "./content";
import type { ExportTarget } from "./types";

let logoDataPromise: Promise<Buffer | null> | null = null;
let signatureImageDataPromise: Promise<Buffer | null> | null = null;

type TrainerImageData = {
  data: Buffer;
  type: "jpg" | "png";
  width: number;
  height: number;
};

const trainerImagePromises = new Map<string, Promise<TrainerImageData>>();

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
  ) => new TextRun({ text, color, font, size: 24, position: "-1pt" });
  const footerLink = (text: string) =>
    new TextRun({
      text,
      color: "0070C0",
      font: "Calibri Light",
      size: 22,
      underline: {},
    });
  const emptyBorder = { style: BorderStyle.NIL, size: 0, color: "FFFFFF" };
  const contactCell = (
    children: TextRun[],
    alignment: (typeof AlignmentType)[keyof typeof AlignmentType],
  ) =>
    new TableCell({
      children: [
        new Paragraph({
          children,
          alignment,
          spacing: { before: 0, after: 0 },
        }),
      ],
      borders: {
        top: emptyBorder,
        bottom: emptyBorder,
        left: emptyBorder,
        right: emptyBorder,
      },
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

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
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3120, 3120, 3120],
        borders: {
          top: emptyBorder,
          bottom: emptyBorder,
          left: emptyBorder,
          right: emptyBorder,
          insideHorizontal: emptyBorder,
          insideVertical: emptyBorder,
        },
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        rows: [
          new TableRow({
            children: [
              contactCell(
                [footerSymbol("\u260E", "E4C36A"), footerText("095 666 788")],
                AlignmentType.LEFT,
              ),
              contactCell(
                [footerSymbol("\u2709", "009FE3"), footerLink("contact@dgdemy.org")],
                AlignmentType.CENTER,
              ),
              contactCell(
                [
                  footerSymbol("\uD83C\uDF10", "009FE3", "Segoe UI Emoji"),
                  footerLink("www.dgdemy.org"),
                ],
                AlignmentType.RIGHT,
              ),
            ],
          }),
        ],
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

function proposalContentOutlineChildren(items: string[]) {
  const looksLikeSessionPlan = items.some((item) =>
    /\||^Session\s+\d+\s*:/i.test(item),
  );

  if (!looksLikeSessionPlan) {
    return items.map((item) =>
      proposalParagraph(item, {
        font: "Calibri",
        size: 24,
        before: 0,
        after: 80,
      }),
    );
  }

  return items.flatMap((item, index) => proposalSessionChildren(item, index));
}

function numberedProposalSection(
  index: number,
  title: string,
  children: Paragraph[],
  before = 260,
) {
  return [
    proposalHeading(`${toRoman(index)}. ${title}`, before),
    ...children,
  ];
}

function toRoman(value: number) {
  const numerals: Array<[number, string]> = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let remaining = value;
  let result = "";

  numerals.forEach(([number, roman]) => {
    while (remaining >= number) {
      result += roman;
      remaining -= number;
    }
  });

  return result;
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
  const shouldShow = (items: string[]) => items.length > 0;
  let sectionNumber = 1;
  const nextSection = (title: string, children: Paragraph[], before = 260) =>
    numberedProposalSection(sectionNumber++, title, children, before);
  const contentOutlineChildren = proposalContentOutlineChildren(
    content.contentOutlines,
  );
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
    ...nextSection(
      "Course Overview",
      content.courseOverview.map((item) => proposalParagraph(item)),
      0,
    ),
    ...nextSection("Course Objectives", [
      proposalParagraph(
        "Upon completion of this training program, participants will be able to:",
        { after: 140 },
      ),
      ...content.courseObjectives.map((item) => proposalBullet(item)),
    ]),
    ...(shouldShow(content.expectedLearningOutcomes)
      ? nextSection(
          "Expected Learning Outcomes",
          content.expectedLearningOutcomes.map((item) => proposalBullet(item)),
        )
      : []),
    ...nextSection("Content Outlines", contentOutlineChildren),
    ...(shouldShow(content.whoShouldAttend)
      ? nextSection(
          "Who Should Attend",
          content.whoShouldAttend.map((item) => proposalBullet(item)),
        )
      : []),
    ...nextSection(
      "Training Methodology",
      content.trainingMethodology.map((item) => proposalBullet(item)),
    ),
    ...(shouldShow(content.trainingTools)
      ? nextSection(
          "Training and Coaching Tools",
          content.trainingTools.map((item) => proposalBullet(item)),
        )
      : []),
    ...(shouldShow(content.trainingEvaluation)
      ? nextSection(
          "Training Evaluation",
          content.trainingEvaluation.map((item) => proposalBullet(item)),
        )
      : []),
    ...nextSection("Schedule", [
      proposalScheduleBullet("Course Duration", content.schedule.duration),
      proposalScheduleBullet("Date", content.schedule.date),
      proposalScheduleBullet("Time", content.schedule.time),
      proposalScheduleBullet("Venue", content.schedule.venue),
      proposalScheduleBullet("Participants", participantLabel),
    ]),
    pageBreakParagraph(),
    proposalHeading(`${toRoman(sectionNumber++)}. Trainer`, 0),
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
    proposalHeading(`${toRoman(sectionNumber++)}. Professional Fee & Logistics`, 0, 0),
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

export async function createDocx(
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
  const pricingInputs = normalizePricingInputs(pkg.pricingInputs);
  const deterministicFee =
    pkg.pricingOutputs.finalPrice > 0
      ? `Total professional fee for ${pkg.duration.toLowerCase()} training (${pricingInputs.vatStatus.toLowerCase()}): ${formatMoney(
          pkg.pricingOutputs.finalPrice,
          pricingInputs.currency,
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
