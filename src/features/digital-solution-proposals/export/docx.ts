import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  Paragraph,
  PatchType,
  TextRun,
  patchDocument,
} from "docx";

import {
  composeSolutionProposalDocument,
} from "../domain/proposal";
import type {
  DigitalSolutionProposal,
  SolutionProposalBlock,
  SolutionProposalSection,
} from "../domain/types";

function text(
  value: string,
  options: { bold?: boolean; color?: string; size?: number; italics?: boolean } = {},
) {
  return new TextRun({
    text: value,
    bold: options.bold,
    italics: options.italics,
    color: options.color,
    size: options.size ?? 22,
    font: "Arial",
  });
}

function paragraph(value: string, after = 140) {
  return new Paragraph({
    children: [text(value)],
    spacing: { after, line: 320 },
  });
}

function bullet(value: string) {
  return new Paragraph({
    children: [text(value)],
    bullet: { level: 0 },
    spacing: { after: 90, line: 300 },
  });
}

function numbered(value: string, index: number) {
  return new Paragraph({
    children: [text(`${index + 1}. `, { bold: true }), text(value)],
    indent: { left: 360, hanging: 260 },
    spacing: { after: 90, line: 300 },
  });
}

function subsection(value: string) {
  return new Paragraph({
    children: [text(value, { bold: true, color: "0070C0", size: 25 })],
    keepNext: true,
    spacing: { before: 180, after: 100 },
  });
}

function blockChildren(block: SolutionProposalBlock) {
  if (block.type === "paragraph") return [paragraph(block.text)];
  if (block.type === "bullet_list") return block.items.map(bullet);
  if (block.type === "numbered_list") {
    return block.items.map((item, index) => numbered(item, index));
  }
  if (block.type === "capabilities") {
    return block.items.flatMap((item) => [
      subsection(item.name),
      paragraph(item.description),
      ...(item.value
        ? [
            new Paragraph({
              children: [text("Client value: ", { bold: true }), text(item.value)],
              spacing: { after: 140, line: 300 },
            }),
          ]
        : []),
    ]);
  }
  return block.items.flatMap((phase, index) => [
    subsection(`Phase ${index + 1}: ${phase.name}`),
    ...(phase.duration
      ? [
          new Paragraph({
            children: [text("Duration: ", { bold: true }), text(phase.duration)],
            spacing: { after: 100 },
          }),
        ]
      : []),
    ...phase.activities.map(bullet),
    ...phase.deliverables.map(
      (item) =>
        new Paragraph({
          children: [text("Deliverable: ", { bold: true }), text(item)],
          spacing: { after: 90, line: 300 },
        }),
    ),
  ]);
}

function sectionChildren(section: SolutionProposalSection, index: number) {
  return [
    new Paragraph({
      children: [text(`${index + 1}. ${section.title}`, { bold: true, size: 30 })],
      keepNext: true,
      spacing: { before: index === 0 ? 0 : 260, after: 160 },
    }),
    ...section.blocks.flatMap(blockChildren),
  ];
}

function safeFilename(value: string) {
  return value
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .toLowerCase();
}

export async function exportSolutionProposalDocx(proposal: DigitalSolutionProposal) {
  const document = composeSolutionProposalDocument(proposal);
  if (!document) {
    throw new Error("Generate the digital solution proposal before exporting.");
  }
  const template = await readFile(
    join(
      process.cwd(),
      "public",
      "document-templates",
      "digital-solution-proposal.docx",
    ),
  );
  const body = document.sections.flatMap(sectionChildren);
  const buffer = await patchDocument({
    outputType: "nodebuffer",
    data: template,
    keepOriginalStyles: true,
    patches: {
      cover_heading: {
        type: PatchType.PARAGRAPH,
        children: [text(document.coverHeading, { size: 30 })],
      },
      solution_title: {
        type: PatchType.PARAGRAPH,
        children: [text(`\u201C${document.solutionTitle}\u201D`, { bold: true, color: "0070C0", size: 58 })],
      },
      client_name: {
        type: PatchType.PARAGRAPH,
        children: [text(document.client, { bold: true, color: "0070C0", size: 44 })],
      },
      proposal_body: {
        type: PatchType.DOCUMENT,
        children: body,
      },
    },
  });

  return {
    buffer,
    filename: `${safeFilename(document.client)}-${safeFilename(document.solutionTitle)}-proposal.docx`,
  };
}
