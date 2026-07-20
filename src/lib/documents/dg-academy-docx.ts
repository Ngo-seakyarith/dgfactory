import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  AlignmentType,
  BorderStyle,
  Footer,
  ImageRun,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

let logoDataPromise: Promise<Buffer | null> | null = null;

export function loadDgAcademyLogo() {
  if (!logoDataPromise) {
    logoDataPromise = readFile(
      join(process.cwd(), "public", "app-logo.png"),
    ).catch(() => null);
  }

  return logoDataPromise;
}

export function dgAcademyLogoParagraph(
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
        children: [
          new TextRun({
            text: "DG Academy",
            bold: true,
            font: "Arial",
            size: 28,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing,
      });
}

export function dgAcademyFooter() {
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

export function dgAcademyFooters() {
  return {
    default: dgAcademyFooter(),
    first: dgAcademyFooter(),
    even: dgAcademyFooter(),
  };
}

export function dgAcademyPageProperties() {
  return {
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
  };
}
