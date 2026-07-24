import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LevelFormat,
  LineRuleType,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import type { TrainingPackage } from "@/features/training-packages/domain/training-package";
import {
  parseFacilitatorGuidePlan,
  parsePromptLibraryPlan,
  parseWorkbookPlan,
  type FacilitatorGuidePlan,
  type PromptLibraryPlan,
  type WorkbookPlan,
} from "@/features/training-packages/export/material-document-plans";
import type { ExportTarget } from "@/features/training-packages/export/types";
import {
  dgAcademyFooters,
  dgAcademyLogoParagraph,
  dgAcademyPageProperties,
  loadDgAcademyLogo,
} from "@/lib/documents/dg-academy-docx";

const CONTENT_WIDTH = 9360;
const ORANGE = "F57B2B";
const BLUE = "0070C0";
const DARK = "1F2937";
const MUTED = "667085";
const LIGHT_BLUE = "EAF4FB";
const LIGHT_ORANGE = "FFF3E8";

const noBorder = { style: BorderStyle.NIL, size: 0, color: "FFFFFF" };
const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: "CCD6E0" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCD6E0" },
  left: { style: BorderStyle.SINGLE, size: 4, color: "CCD6E0" },
  right: { style: BorderStyle.SINGLE, size: 4, color: "CCD6E0" },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "D9E2EC" },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "D9E2EC" },
};

function run(
  text: string,
  options: { bold?: boolean; color?: string; size?: number; italic?: boolean } = {},
) {
  return new TextRun({
    text,
    font: "Arial",
    size: options.size ?? 22,
    bold: options.bold,
    color: options.color ?? DARK,
    italics: options.italic,
  });
}

function paragraph(text: string, options: { bold?: boolean; color?: string; after?: number } = {}) {
  return new Paragraph({
    children: [run(text, options)],
    spacing: {
      after: options.after ?? 120,
      line: 300,
      lineRule: LineRuleType.AUTO,
    },
  });
}

function heading(text: string, level: 1 | 2 | 3) {
  const sizes = { 1: 32, 2: 27, 3: 24 } as const;
  const before = { 1: 360, 2: 280, 3: 200 } as const;
  const after = { 1: 200, 2: 140, 3: 100 } as const;
  return new Paragraph({
    children: [run(text, { bold: true, color: level === 1 ? BLUE : DARK, size: sizes[level] })],
    heading:
      level === 1
        ? HeadingLevel.HEADING_1
        : level === 2
          ? HeadingLevel.HEADING_2
          : HeadingLevel.HEADING_3,
    keepNext: true,
    spacing: { before: before[level], after: after[level] },
  });
}

function bullet(text: string) {
  return new Paragraph({
    children: [run(text)],
    numbering: { reference: "material-bullets", level: 0 },
    spacing: { after: 80, line: 300, lineRule: LineRuleType.AUTO },
  });
}

function numbered(text: string) {
  return new Paragraph({
    children: [run(text)],
    numbering: { reference: "material-numbering", level: 0 },
    spacing: { after: 90, line: 300, lineRule: LineRuleType.AUTO },
  });
}

function checklist(text: string) {
  return new Paragraph({
    children: [run("\u2610 ", { color: BLUE, size: 24 }), run(text)],
    indent: { left: 360 },
    spacing: { after: 90, line: 300, lineRule: LineRuleType.AUTO },
  });
}

function labelParagraph(label: string, value: string) {
  return new Paragraph({
    children: [run(`${label}: `, { bold: true, color: BLUE }), run(value)],
    spacing: { after: 100, line: 300, lineRule: LineRuleType.AUTO },
  });
}

function callout(label: string, value: string, fill = LIGHT_BLUE) {
  return new Paragraph({
    children: [run(`${label}: `, { bold: true, color: BLUE }), run(value)],
    shading: { fill },
    border: {
      left: { style: BorderStyle.SINGLE, color: ORANGE, size: 18, space: 8 },
    },
    indent: { left: 180, right: 180 },
    spacing: { before: 60, after: 160, line: 300, lineRule: LineRuleType.AUTO },
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function responseSpace(lines: number) {
  return Array.from({ length: lines }, () =>
    new Paragraph({
      children: [run(" ")],
      border: {
        bottom: { style: BorderStyle.SINGLE, color: "B8C4CE", size: 4, space: 4 },
      },
      spacing: { before: 40, after: 100, line: 300 },
    }),
  );
}

function metadataCell(label: string, value: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    children: [
      new Paragraph({
        children: [run(label.toUpperCase(), { bold: true, color: MUTED, size: 18 })],
        spacing: { after: 40 },
      }),
      new Paragraph({ children: [run(value, { bold: true })], spacing: { after: 0 } }),
    ],
    shading: { fill: "F7F9FB" },
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
    margins: { top: 120, bottom: 120, left: 140, right: 140 },
  });
}

function coverChildren(pkg: TrainingPackage, documentTitle: string, descriptor: string, logoData: Buffer | null) {
  return [
    dgAcademyLogoParagraph(logoData, 104, { before: 160, after: 620 }),
    new Paragraph({
      children: [run(documentTitle, { bold: true, color: BLUE, size: 52 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
    }),
    new Paragraph({
      children: [run(pkg.title, { bold: true, size: 34 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [run(descriptor, { color: MUTED, size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 560 },
    }),
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      indent: { size: 120, type: WidthType.DXA },
      columnWidths: [4680, 4680],
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
            metadataCell("Client", pkg.client, 4680),
            metadataCell("Audience", pkg.audience, 4680),
          ],
        }),
        new TableRow({
          children: [
            metadataCell("Duration", pkg.duration, 4680),
            metadataCell("Prepared", new Date().toLocaleDateString("en-GB"), 4680),
          ],
        }),
      ],
    }),
    pageBreak(),
  ];
}

function agendaCell(text: string, width: number, header = false) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    children: [
      new Paragraph({
        children: [run(text, { bold: header, color: header ? "FFFFFF" : DARK, size: header ? 19 : 20 })],
        spacing: { after: 0, line: 260, lineRule: LineRuleType.AUTO },
      }),
    ],
    shading: header ? { fill: BLUE } : undefined,
    borders: tableBorders,
    margins: { top: 90, bottom: 90, left: 110, right: 110 },
  });
}

function agendaTable(plan: FacilitatorGuidePlan) {
  const widths = [1050, 850, 2200, 3660, 1600];
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    indent: { size: 120, type: WidthType.DXA },
    columnWidths: widths,
    borders: tableBorders,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          agendaCell("Time", widths[0], true),
          agendaCell("Length", widths[1], true),
          agendaCell("Session", widths[2], true),
          agendaCell("Objective", widths[3], true),
          agendaCell("Method", widths[4], true),
        ],
      }),
      ...plan.agenda.map((item) =>
        new TableRow({
          children: [
            agendaCell(item.timing, widths[0]),
            agendaCell(item.duration, widths[1]),
            agendaCell(item.session, widths[2]),
            agendaCell(item.objective, widths[3]),
            agendaCell(item.method, widths[4]),
          ],
        }),
      ),
    ],
  });
}

function promptBox(text: string) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    indent: { size: 120, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: "C7D8E6" },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "C7D8E6" },
      left: { style: BorderStyle.SINGLE, size: 6, color: ORANGE },
      right: { style: BorderStyle.SINGLE, size: 6, color: "C7D8E6" },
      insideHorizontal: noBorder,
      insideVertical: noBorder,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            children: text.split(/\n{2,}|\n/).filter(Boolean).map((line) =>
              new Paragraph({
                children: [run(line, { size: 21 })],
                spacing: { after: 100, line: 290, lineRule: LineRuleType.AUTO },
              }),
            ),
            shading: { fill: LIGHT_ORANGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            margins: { top: 180, bottom: 100, left: 220, right: 220 },
          }),
        ],
      }),
    ],
  });
}

function workbookChildren(pkg: TrainingPackage, plan: WorkbookPlan, logoData: Buffer | null) {
  const children: Array<Paragraph | Table> = [
    ...coverChildren(pkg, plan.title, "Participant Edition", logoData),
    heading("Welcome", 1),
    paragraph(plan.welcome),
    heading("How to use this workbook", 1),
    ...plan.howToUse.map(bullet),
  ];

  plan.modules.forEach((module, moduleIndex) => {
    children.push(pageBreak(), heading(`Module ${moduleIndex + 1}: ${module.title}`, 1));
    if (module.introduction) children.push(paragraph(module.introduction));
    if (module.keyPoints.length) {
      children.push(heading("Key ideas", 2), ...module.keyPoints.map(bullet));
    }
    module.activities.forEach((activity, activityIndex) => {
      children.push(heading(`Activity ${moduleIndex + 1}.${activityIndex + 1}: ${activity.title}`, 2));
      if (activity.purpose) children.push(callout("Purpose", activity.purpose));
      if (activity.instructions.length) {
        children.push(heading("Instructions", 3), ...activity.instructions.map(numbered));
      }
      if (activity.reflectionQuestions.length) {
        children.push(heading("Think and record", 3), ...activity.reflectionQuestions.map(bullet));
      }
      if (activity.expectedOutput) children.push(labelParagraph("Expected output", activity.expectedOutput));
      children.push(...responseSpace(activity.responseLines));
    });
    if (module.applicationPrompt) children.push(callout("Apply at work", module.applicationPrompt, LIGHT_ORANGE));
  });

  children.push(
    pageBreak(),
    heading("Personal action plan", 1),
    paragraph(plan.actionPlan.introduction),
    ...plan.actionPlan.prompts.map((item) => [heading(item, 3), ...responseSpace(plan.actionPlan.responseLines)]).flat(),
  );
  return children;
}

function facilitatorChildren(pkg: TrainingPackage, plan: FacilitatorGuidePlan, logoData: Buffer | null) {
  const children: Array<Paragraph | Table> = [
    ...coverChildren(pkg, plan.title, "Trainer Edition", logoData),
    heading("Guide purpose", 1),
    paragraph(plan.purpose),
    heading("Trainer preparation", 1),
    ...plan.trainerPreparation.map(checklist),
    heading("Session at a glance", 1),
    agendaTable(plan),
    pageBreak(),
    heading("Detailed run sheet", 1),
  ];

  plan.sections.forEach((section, index) => {
    children.push(
      heading(`${index + 1}. ${section.title}`, 2),
      callout("Timing", section.timing),
      labelParagraph("Objective", section.objective),
    );
    if (section.keyMessages.length) children.push(heading("Key messages", 3), ...section.keyMessages.map(bullet));
    if (section.runSteps.length) children.push(heading("How to run it", 3), ...section.runSteps.map(numbered));
    if (section.debriefQuestions.length) children.push(heading("Debrief questions", 3), ...section.debriefQuestions.map(bullet));
    if (section.expectedOutputs.length) children.push(heading("Expected participant outputs", 3), ...section.expectedOutputs.map(bullet));
    if (section.transition) children.push(callout("Transition", section.transition, LIGHT_ORANGE));
  });

  children.push(pageBreak(), heading("Operational checklists", 1), heading("Materials and room", 2), ...plan.materialsChecklist.map(checklist));
  if (plan.likelyQuestions.length) {
    children.push(heading("Likely participant questions", 2));
    plan.likelyQuestions.forEach((item) => children.push(heading(item.question, 3), paragraph(item.answer)));
  }
  if (plan.contingencies.length) {
    children.push(heading("Contingency guidance", 2));
    plan.contingencies.forEach((item) => children.push(callout(item.situation, item.response)));
  }
  children.push(heading("Before closing the session", 2), ...plan.closingChecklist.map(checklist));
  return children;
}

function promptLibraryChildren(pkg: TrainingPackage, plan: PromptLibraryPlan, logoData: Buffer | null) {
  const children: Array<Paragraph | Table> = [
    ...coverChildren(pkg, plan.title, "Participant Reference Guide", logoData),
    heading("Introduction", 1),
    paragraph(plan.introduction),
    heading("How to use the prompts", 1),
    ...plan.usageGuidance.map(numbered),
    heading("Responsible use checklist", 1),
    ...plan.responsibleUseChecks.map(checklist),
  ];

  plan.sections.forEach((section) => {
    children.push(pageBreak(), heading(section.title, 1), paragraph(section.description));
    section.prompts.forEach((item, index) => {
      children.push(
        heading(`${index + 1}. ${item.title}`, 2),
        labelParagraph("When to use", item.whenToUse),
        promptBox(item.prompt),
      );
      if (item.adaptationTips.length) children.push(heading("Adapt it", 3), ...item.adaptationTips.map(bullet));
      if (item.reviewChecks.length) children.push(heading("Check the output", 3), ...item.reviewChecks.map(checklist));
    });
  });
  return children;
}

function materialDocument(title: string, children: Array<Paragraph | Table>) {
  return new Document({
    creator: "DG Academy",
    title,
    numbering: {
      config: [
        {
          reference: "material-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "\u2022",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 540, hanging: 260 } },
                run: { font: "Arial", size: 22, color: BLUE },
              },
            },
          ],
        },
        {
          reference: "material-numbering",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 540, hanging: 260 } },
                run: { font: "Arial", size: 22, color: BLUE },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        footers: dgAcademyFooters(),
        properties: dgAcademyPageProperties(),
        children,
      },
    ],
  });
}

export async function createStructuredMaterialDocx(
  pkg: TrainingPackage,
  target: ExportTarget,
  body: string,
): Promise<Buffer | null> {
  const logoData = await loadDgAcademyLogo();

  if (target === "workbook") {
    const plan = parseWorkbookPlan(body);
    if (!plan) return null;
    return Packer.toBuffer(materialDocument(`${pkg.title} - ${plan.title}`, workbookChildren(pkg, plan, logoData)));
  }

  if (target === "facilitator-guide") {
    const plan = parseFacilitatorGuidePlan(body);
    if (!plan) return null;
    return Packer.toBuffer(materialDocument(`${pkg.title} - ${plan.title}`, facilitatorChildren(pkg, plan, logoData)));
  }

  if (target === "prompt-library") {
    const plan = parsePromptLibraryPlan(body);
    if (!plan) return null;
    return Packer.toBuffer(materialDocument(`${pkg.title} - ${plan.title}`, promptLibraryChildren(pkg, plan, logoData)));
  }

  return null;
}
