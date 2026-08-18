import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
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

const root = process.cwd();

function run(
  text: string,
  options: { bold?: boolean; color?: string; size?: number } = {},
) {
  return new TextRun({
    text,
    bold: options.bold,
    color: options.color,
    size: options.size ?? 22,
    font: "Arial",
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
  const contactCell = (
    children: TextRun[],
    alignment: (typeof AlignmentType)[keyof typeof AlignmentType],
  ) =>
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
                [footerSymbol("\u260E", "E4C36A"), footerText("099 200 805")],
                AlignmentType.LEFT,
              ),
              contactCell(
                [footerSymbol("\u2709", "009FE3"), footerLink("contact@dgdemy.org")],
                AlignmentType.CENTER,
              ),
              contactCell(
                [
                  footerSymbol("\uD83C\uDF10", "009FE3", "Segoe UI Emoji"),
                  footerLink("www.thedgacademy.org"),
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

async function main() {
  const [logoData, signatureData] = await Promise.all([
    readFile(join(root, "public", "app-logo.png")),
    readFile(join(root, "public", "signature-hin-sopheap.png")),
  ]);
  const document = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [
      {
        properties: {
          page: { margin: { top: 720, right: 900, bottom: 1180, left: 900 } },
        },
        footers: { default: footer() },
        children: [
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
            children: [run("{{cover_heading}}", { size: 30 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [run("On", { size: 28 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 180 },
          }),
          new Paragraph({
            children: [run("{{solution_title}}", { bold: true, color: "0070C0", size: 58 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 520, line: 760 },
          }),
          new Paragraph({
            children: [run("for", { bold: true, color: "0070C0", size: 34 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 280 },
          }),
          new Paragraph({
            children: [run("{{client_name}}", { bold: true, color: "0070C0", size: 44 })],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({ children: [run("{{proposal_body}}")] }),
          new Paragraph({
            children: [run("Authorized by DG Academy", { bold: true, size: 30 })],
            keepNext: true,
            spacing: { before: 280, after: 160 },
          }),
          new Paragraph({ children: [run("Mr. Hin Sopheap", { bold: true })], keepNext: true }),
          new Paragraph({ children: [run("Executive Director")], keepNext: true }),
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
        ],
      },
    ],
  });

  const directory = join(root, "public", "document-templates");
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, "digital-solution-proposal.docx"),
    await Packer.toBuffer(document),
  );
}

await main();
