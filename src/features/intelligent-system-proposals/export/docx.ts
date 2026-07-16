import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import type { IntelligentSystemProposal } from "../domain/types";
import {
  calculateSystemCommercialTotal,
  formatSystemCommercialSummary,
} from "../domain/proposal";

function text(value: string, options: { bold?: boolean; color?: string; size?: number } = {}) {
  return new TextRun({
    text: value,
    bold: options.bold,
    color: options.color,
    size: options.size ?? 22,
    font: "Arial",
  });
}

function paragraph(value: string, after = 140) {
  return new Paragraph({ children: [text(value)], spacing: { after } });
}

function bullet(value: string) {
  return new Paragraph({
    children: [text(value)],
    bullet: { level: 0 },
    spacing: { after: 90 },
  });
}

function heading(value: string) {
  return new Paragraph({
    children: [text(value, { bold: true, color: "000000", size: 30 })],
    heading: HeadingLevel.HEADING_1,
    keepNext: true,
    spacing: { before: 260, after: 160 },
  });
}

function footer() {
  const footerText = (value: string, color = "595959") =>
    new TextRun({ text: value, color, font: "Calibri Light", size: 22 });
  const footerSymbol = (value: string, color: string, font = "Segoe UI Symbol") =>
    new TextRun({ text: value, color, font, size: 24, position: "-1pt" });
  const footerLink = (value: string) =>
    new TextRun({
      text: value,
      color: "0070C0",
      font: "Calibri Light",
      size: 22,
      underline: {},
    });
  const noBorder = { style: BorderStyle.NIL, size: 0, color: "FFFFFF" };
  const contactCell = (children: TextRun[], alignment: (typeof AlignmentType)[keyof typeof AlignmentType]) =>
    new TableCell({
      children: [new Paragraph({ children, alignment, spacing: { after: 0 } })],
      borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
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
        border: { top: { style: BorderStyle.SINGLE, color: "4472C4", size: 8, space: 8 } },
        indent: { left: -600, right: -600 },
        spacing: { after: 100 },
      }),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3120, 3120, 3120],
        borders: {
          top: noBorder,
          bottom: noBorder,
          left: noBorder,
          right: noBorder,
          insideHorizontal: noBorder,
          insideVertical: noBorder,
        },
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

function section(title: string, items: string[], number: number) {
  return [heading(`${number}. ${title}`), ...items.filter(Boolean).map(bullet)];
}

function safeFilename(value: string) {
  return value
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .toLowerCase();
}

export async function exportSystemProposalDocx(proposal: IntelligentSystemProposal) {
  const content = proposal.proposalContent;
  if (!content) throw new Error("Generate the intelligent system proposal before exporting.");
  const [logoData, signatureData] = await Promise.all([
    readFile(join(process.cwd(), "public", "app-logo.png")),
    readFile(join(process.cwd(), "public", "signature-hin-sopheap.png")).catch(() => null),
  ]);
  const children: Array<Paragraph> = [
    new Paragraph({
      children: [
        new ImageRun({
          type: "png",
          data: logoData,
          transformation: { width: 132, height: 132 },
          altText: { title: "DG Academy", description: "DG Academy logo", name: "DG Academy" },
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 520 },
    }),
    new Paragraph({
      children: [text(content.coverHeading, { size: 30 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
    new Paragraph({
      children: [text("On", { size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
    }),
    new Paragraph({
      children: [text(`\u201C${content.solutionTitle}\u201D`, { bold: true, color: "0070C0", size: 58 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 520, line: 760 },
    }),
    new Paragraph({
      children: [text("for", { bold: true, color: "0070C0", size: 34 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 280 },
    }),
    new Paragraph({
      children: [text(content.client, { bold: true, color: "0070C0", size: 44 })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
  let number = 1;
  children.push(...section("Executive Summary", content.executiveSummary, number++));
  children.push(...section("Client Situation", content.clientSituation, number++));
  children.push(...section("Evidence from the Supplied Data", content.evidenceFindings, number++));
  children.push(...section("Project Objectives", content.objectives, number++));
  children.push(...section("Recommended Intelligent System", content.recommendedSystem, number++));
  children.push(heading(`${number++}. Proposed System Modules`));
  content.modules.forEach((module, index) => {
    children.push(
      new Paragraph({
        children: [text(`${index + 1}. ${module.name}`, { bold: true, color: "0070C0", size: 25 })],
        keepNext: true,
        spacing: { before: 160, after: 100 },
      }),
      paragraph(module.purpose),
      ...module.inputs.map((item) => bullet(`Input: ${item}`)),
      ...module.outputs.map((item) => bullet(`Output: ${item}`)),
      paragraph(`User value: ${module.userValue}`),
    );
  });
  children.push(...section("User Workflows", content.userWorkflows, number++));
  children.push(...section("Dashboards and AI Capabilities", content.dashboardsAndAi, number++));
  children.push(...section("Data Flow and Integrations", content.dataFlowAndIntegrations, number++));
  children.push(...section("Security and Governance", content.securityAndGovernance, number++));
  children.push(heading(`${number++}. Implementation Approach`));
  content.implementationPhases.forEach((phase, index) => {
    children.push(
      new Paragraph({
        children: [text(`Phase ${index + 1}: ${phase.name}`, { bold: true, color: "0070C0", size: 25 })],
        keepNext: true,
        spacing: { before: 160, after: 100 },
      }),
      paragraph(`Duration: ${phase.duration}`),
      ...phase.activities.map((item) => bullet(item)),
      ...phase.deliverables.map((item) => bullet(`Deliverable: ${item}`)),
    );
  });
  children.push(...section("Project Deliverables", content.deliverables, number++));
  children.push(...section("Client Responsibilities", content.clientResponsibilities, number++));
  children.push(...section("Assumptions", content.assumptions, number++));
  children.push(...section("Risks and Items to Validate", content.risks, number++));

  if (calculateSystemCommercialTotal(proposal.commercialInputs) > 0) {
    children.push(
      heading(`${number++}. Professional Fee`),
      ...formatSystemCommercialSummary(proposal.commercialInputs)
        .split("\n")
        .filter(Boolean)
        .map(bullet),
    );
  }
  children.push(...section("Recommended Next Steps", content.nextSteps, number++));
  children.push(
    heading(`${number}. Authorized by DG Academy`),
    paragraph("Mr. Hin Sopheap"),
    paragraph("Executive Director"),
  );
  if (signatureData) {
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            type: "png",
            data: signatureData,
            transformation: { width: 150, height: 70 },
            altText: {
              title: "Hin Sopheap signature",
              description: "Authorized DG Academy signatory",
              name: "Hin Sopheap signature",
            },
          }),
        ],
        spacing: { before: 100 },
      }),
    );
  }

  const document = new Document({
    styles: {
      default: {
        document: { run: { font: "Arial", size: 22 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 900, bottom: 1180, left: 900 },
          },
        },
        footers: { default: footer() },
        children,
      },
    ],
  });

  return {
    buffer: await Packer.toBuffer(document),
    filename: `${safeFilename(content.client)}-${safeFilename(content.solutionTitle)}-proposal.docx`,
  };
}

