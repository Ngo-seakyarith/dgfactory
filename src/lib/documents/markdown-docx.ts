import type { BlockNode, HeadingNode, InlineNode, ParagraphNode } from "@tanstack/markdown";
import {
  AlignmentType,
  BorderStyle,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  LineRuleType,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
  type INumberingOptions,
  type IRunOptions,
  type ParagraphChild,
} from "docx";

import { parseAppMarkdown } from "@/lib/markdown";

type MarkdownDocxOptions = {
  heading?: (node: HeadingNode, runs: ParagraphChild[]) => Paragraph | null;
  paragraph?: (node: ParagraphNode, runs: ParagraphChild[]) => Paragraph;
};

export function markdownInlineRuns(nodes: InlineNode[], options: IRunOptions = {}): ParagraphChild[] {
  const runOptions = { font: "Arial", size: 22, color: "252525", ...options };
  return nodes.flatMap((node): ParagraphChild[] => {
    switch (node.type) {
      case "text":
      case "inlineHtml":
        return node.value.split("\n").flatMap((line, index) => [
          ...(index ? [new TextRun({ ...runOptions, break: 1 })] : []),
          new TextRun({ ...runOptions, text: line }),
        ]);
      case "inlineCode":
        return [new TextRun({ ...runOptions, text: node.value, font: "Consolas", shading: { fill: "F2F4F1" } })];
      case "strong":
        return markdownInlineRuns(node.children, { ...runOptions, bold: true });
      case "emphasis":
        return markdownInlineRuns(node.children, { ...runOptions, italics: true });
      case "strike":
        return markdownInlineRuns(node.children, { ...runOptions, strike: true });
      case "link":
        return [new ExternalHyperlink({
          link: node.href,
          children: markdownInlineRuns(node.children, { ...runOptions, style: "Hyperlink" }),
        })];
      case "image":
        return [new TextRun({ ...runOptions, text: node.alt })];
      case "break":
        return [new TextRun({ ...runOptions, break: 1 })];
      case "footnoteReference":
        return [new TextRun({ ...runOptions, text: `[${node.number}]`, superScript: true })];
      case "inlineComponent":
        return markdownInlineRuns(node.children, runOptions);
    }
  });
}

export function markdownToDocx(source: string, options: MarkdownDocxOptions = {}) {
  const document = parseAppMarkdown(source);
  const config: INumberingOptions["config"][number][] = [];
  const headings = [
    HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6,
  ];

  function renderBlocks(nodes: BlockNode[], depth = 0, quoteIndent = 0): (Paragraph | Table)[] {
    return nodes.flatMap((node): (Paragraph | Table)[] => {
      switch (node.type) {
        case "heading": {
          const runs = markdownInlineRuns(node.children, { bold: true, size: node.depth === 1 ? 30 : 26 });
          const paragraph = options.heading ? options.heading(node, runs) : new Paragraph({
            children: runs,
            heading: headings[node.depth - 1],
            keepNext: true,
            spacing: { before: 240, after: 120 },
          });
          return paragraph ? [paragraph] : [];
        }
        case "paragraph": {
          const runs = markdownInlineRuns(node.children);
          if (depth === 0 && quoteIndent === 0 && options.paragraph) return [options.paragraph(node, runs)];
          return [new Paragraph({
            children: runs,
            indent: { left: depth * 360 + quoteIndent },
            spacing: { after: 120, line: 280, lineRule: LineRuleType.AUTO },
          })];
        }
        case "list": {
          const level = Math.min(depth, 8);
          const reference = `markdown-list-${config.length}`;
          config.push({
            reference,
            levels: Array.from({ length: 9 }, (_, index) => ({
              level: index,
              format: node.ordered ? LevelFormat.DECIMAL : LevelFormat.BULLET,
              text: node.ordered ? `%${index + 1}.` : "\u2022",
              start: node.ordered ? node.start ?? 1 : undefined,
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: (index + 1) * 360 + quoteIndent, hanging: 360 } },
                run: { font: "Arial", size: 22 },
              },
            })),
          });
          return node.items.flatMap((item) => {
            const first = item.children[0];
            const children = first?.type === "paragraph" ? item.children.slice(1) : item.children;
            const runs = first?.type === "paragraph" ? markdownInlineRuns(first.children) : [];
            return [
              new Paragraph({
                children: [
                  ...(item.checked !== undefined ? [new TextRun({ text: item.checked ? "[x] " : "[ ] ", font: "Arial" })] : []),
                  ...runs,
                ],
                numbering: { reference, level },
                spacing: { after: 90, line: 280, lineRule: LineRuleType.AUTO },
              }),
              ...renderBlocks(children, depth + 1, quoteIndent),
            ];
          });
        }
        case "table": {
          const columns = Math.max(1, node.header.length);
          const row = (cells: typeof node.header, header: boolean) => new TableRow({
            tableHeader: header,
            children: Array.from({ length: columns }, (_, index) => new TableCell({
              width: { size: 100 / columns, type: WidthType.PERCENTAGE },
              shading: header ? { fill: "EAF0ED" } : undefined,
              margins: { top: 100, bottom: 100, left: 120, right: 120 },
              children: [new Paragraph({
                children: markdownInlineRuns(cells[index]?.children ?? [], { bold: header, size: 20 }),
                alignment: node.align[index] === "center" ? AlignmentType.CENTER
                  : node.align[index] === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT,
                spacing: { after: 60, line: 260, lineRule: LineRuleType.AUTO },
              })],
            })),
          });
          return [new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            rows: [row(node.header, true), ...node.rows.map((cells) => row(cells, false))],
          }), new Paragraph({ text: "", spacing: { after: 120 } })];
        }
        case "blockquote":
        case "callout":
          return renderBlocks(node.children, depth, quoteIndent + 360);
        case "code":
          return [new Paragraph({
            children: markdownInlineRuns([{ type: "text", value: node.value }], { font: "Consolas", size: 19 }),
            shading: { fill: "F2F4F1" },
            indent: { left: depth * 360 + quoteIndent, right: 120 },
            spacing: { before: 120, after: 160, line: 240, lineRule: LineRuleType.AUTO },
          })];
        case "thematicBreak":
          return [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, color: "CDD6D0", size: 4 } },
            spacing: { before: 120, after: 120 },
          })];
        case "footnotes":
          return node.items.flatMap((item) => [
            new Paragraph({ children: [new TextRun({ text: `[${item.number}]`, font: "Arial", size: 20 })], keepNext: true }),
            ...renderBlocks(item.children, depth, quoteIndent),
          ]);
        case "html":
          return [new Paragraph({ children: [new TextRun({ text: node.value, font: "Arial", size: 22 })] })];
        case "component":
          return renderBlocks(node.children, depth, quoteIndent);
      }
    });
  }

  const children = renderBlocks(document.children);
  return { children, numbering: { config } satisfies INumberingOptions };
}
