import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LineRuleType,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
  type ParagraphChild,
} from "docx";
import type { InlineNode, ParagraphNode } from "@tanstack/markdown";

import {
  dgAcademyFooters,
  dgAcademyLogoParagraph,
  dgAcademyPageProperties,
  loadDgAcademyLogo,
} from "@/lib/documents/dg-academy-docx";
import { wrapText } from "@/features/training-packages/export/content";
import { markdownInlineText } from "@/lib/markdown";
import { markdownInlineRuns, markdownToDocx } from "@/lib/documents/markdown-docx";

export type PostTrainingReportDocument = {
  title: string;
  client: string;
  reportMarkdown: string;
  updatedAt: string;
  participantCount: number;
  trainingDate: string;
  trainingTime: string;
  venue: string;
  trainerName: string;
};

function reportRun(
  text: string,
  options: {
    bold?: boolean;
    color?: string;
    size?: number;
    italics?: boolean;
  } = {},
) {
  return new TextRun({
    text,
    bold: options.bold,
    italics: options.italics,
    color: options.color ?? "252525",
    font: "Arial",
    size: options.size ?? 22,
  });
}

function reportHeading(text: string, level: 1 | 2 | 3, nodes?: InlineNode[]) {
  const size = level === 1 ? 32 : level === 2 ? 27 : 24;
  const color = level === 1 ? "0070C0" : level === 2 ? "1F4E79" : "252525";

  return new Paragraph({
    children: nodes ? markdownInlineRuns(nodes, { bold: true, color, size }) : [reportRun(text, { bold: true, color, size })],
    heading:
      level === 1
        ? HeadingLevel.HEADING_1
        : level === 2
          ? HeadingLevel.HEADING_2
          : HeadingLevel.HEADING_3,
    keepNext: true,
    border:
      level === 1
        ? {
            bottom: {
              style: BorderStyle.SINGLE,
              color: "B7D7EC",
              size: 8,
              space: 5,
            },
          }
        : undefined,
    spacing: {
      before: level === 1 ? 320 : level === 2 ? 240 : 180,
      after: level === 1 ? 150 : 100,
    },
  });
}

function reportBodyParagraph(node: ParagraphNode, runs: ParagraphChild[]) {
  const first = node.children[0];
  const label = first?.type === "text" ? first.value.match(/^([^:]{2,42}:\s+)(.*)$/) : null;

  return new Paragraph({
    children: label
      ? [
          reportRun(label[1], { bold: true, color: "1F4E79" }),
          ...markdownInlineRuns([{ type: "text", value: label[2] }, ...node.children.slice(1)]),
        ]
      : runs,
    spacing: { after: 120, line: 276, lineRule: LineRuleType.AUTO },
  });
}

function reportResultCallout(nodes: InlineNode[]) {
  return new Paragraph({
    children: markdownInlineRuns(nodes, {
      bold: true,
      color: "1F4E79",
      size: 23,
    }),
    shading: { fill: "EAF4FB" },
    border: {
      left: {
        style: BorderStyle.SINGLE,
        color: "E4C36A",
        size: 20,
        space: 10,
      },
    },
    indent: { left: 180, right: 180 },
    spacing: { before: 80, after: 160, line: 290, lineRule: LineRuleType.AUTO },
  });
}

function reportMetadataCell(
  label: string,
  value: string,
  labelWidth: number,
  valueWidth: number,
) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "D9E2F0" };
  const margins = { top: 100, bottom: 100, left: 120, right: 120 };

  return [
    new TableCell({
      width: { size: labelWidth, type: WidthType.DXA },
      shading: { fill: "DCEAF5" },
      borders: { top: border, bottom: border, left: border, right: border },
      margins,
      children: [
        new Paragraph({
          children: [
            reportRun(label.toUpperCase(), {
              bold: true,
              color: "1F4E79",
              size: 18,
            }),
          ],
          spacing: { after: 0 },
        }),
      ],
    }),
    new TableCell({
      width: { size: valueWidth, type: WidthType.DXA },
      borders: { top: border, bottom: border, left: border, right: border },
      margins,
      children: [
        new Paragraph({
          children: [reportRun(value || "Not recorded", { size: 20 })],
          spacing: { after: 0 },
        }),
      ],
    }),
  ];
}

function reportMetadataTable(input: PostTrainingReportDocument) {
  const labelWidth = 1320;
  const valueWidth = 3360;
  const dateAndTime = [input.trainingDate, input.trainingTime]
    .filter(Boolean)
    .join(" | ");

  const row = (left: [string, string], right: [string, string]) =>
    new TableRow({
      cantSplit: true,
      children: [
        ...reportMetadataCell(left[0], left[1], labelWidth, valueWidth),
        ...reportMetadataCell(right[0], right[1], labelWidth, valueWidth),
      ],
    });

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    indent: { size: 120, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [labelWidth, valueWidth, labelWidth, valueWidth],
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    rows: [
      row(["Program", input.title], ["Client", input.client]),
      row(["Date / time", dateAndTime], ["Venue", input.venue]),
      row(
        ["Trainer", input.trainerName],
        [
          "Participants",
          input.participantCount > 0
            ? String(input.participantCount)
            : "Not recorded",
        ],
      ),
    ],
  });
}

function reportChildren(
  input: PostTrainingReportDocument,
  logoData: Buffer | null,
  markdownChildren: (Paragraph | Table)[],
) {
  const generatedDate = new Date(input.updatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const courseTitleLines = wrapText(input.title, 24);

  return [
    dgAcademyLogoParagraph(logoData, 104, { before: 0, after: 400 }),
    new Paragraph({
      children: [
        reportRun("POST-TRAINING REPORT", {
          bold: true,
          color: "0070C0",
          size: 25,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 260 },
    }),
    new Paragraph({
      children: courseTitleLines.flatMap((line, index) => [
        ...(index > 0 ? [new TextRun({ break: 1 })] : []),
        reportRun(line, { bold: true, color: "0070C0", size: 58 }),
      ]),
      alignment: AlignmentType.CENTER,
      spacing: { after: 420, line: 780, lineRule: LineRuleType.AT_LEAST },
    }),
    new Paragraph({
      children: [reportRun("Prepared for", { color: "595959", size: 22 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        reportRun(input.client, { bold: true, color: "1F4E79", size: 32 }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 760 },
    }),
    new Paragraph({
      children: [reportRun(generatedDate, { color: "595959", size: 20 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
    }),
    new Paragraph({ children: [new PageBreak()] }),
    reportHeading("Program at a Glance", 1),
    reportMetadataTable(input),
    new Paragraph({ text: "", spacing: { after: 100 } }),
    ...markdownChildren,
  ];
}

export async function createPostTrainingReportDocx(
  input: PostTrainingReportDocument,
) {
  const logoData = await loadDgAcademyLogo();
  const report = markdownToDocx(input.reportMarkdown, {
    heading(node) {
      const text = markdownInlineText(node.children);
      if (/post[- ]training report/i.test(text)) return null;
      return reportHeading(text, Math.min(node.depth, 3) as 1 | 2 | 3, node.children);
    },
    paragraph(node, runs) {
      const text = markdownInlineText(node.children);
      return /average (satisfaction|rating)|\bparticipants? attended\b|response count/i.test(text)
        ? reportResultCallout(node.children)
        : reportBodyParagraph(node, runs);
    },
  });
  const document = new Document({
    creator: "DG Academy",
    title: `${input.title} - Post-Training Report`,
    numbering: report.numbering,
    sections: [
      {
        footers: dgAcademyFooters(),
        properties: dgAcademyPageProperties(),
        children: reportChildren(input, logoData, report.children),
      },
    ],
  });

  return Packer.toBuffer(document);
}
