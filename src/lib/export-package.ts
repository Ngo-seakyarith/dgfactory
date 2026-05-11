import {
  fullPackageToMarkdown,
  qualityChecklistToMarkdown,
  type TrainingPackage,
} from "@/lib/training-packages";
import {
  internalProfitabilityNote,
  pricingSummaryToMarkdown,
} from "@/lib/pricing";

export type ExportFormat = "docx" | "pptx" | "pdf" | "txt";
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

type ExportOptions = {
  includeInternalNotes?: boolean;
};

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

function pdfEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
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
  options: ExportOptions = {},
) {
  const pricingSummary = pricingSummaryToMarkdown(pkg.pricingInputs, pkg.pricingOutputs);
  const internalNote = internalProfitabilityNote(
    pkg.pricingInputs,
    pkg.pricingOutputs,
  );
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
      options.includeInternalNotes ? `\n## Internal Profitability Note\n${internalNote}` : "",
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

function docxRun(text: string, options?: { bold?: boolean; size?: number }) {
  return `<w:r><w:rPr>${options?.bold ? "<w:b/>" : ""}${options?.size ? `<w:sz w:val="${options.size}"/>` : ""}</w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`;
}

function docxParagraph(text: string, style?: "Title" | "Heading1" | "Heading2") {
  const trimmed = text.trim();
  const headingLevel = trimmed.match(/^(#{1,3})\s+/)?.[1].length;
  const clean = trimmed.replace(/^#+\s*/, "");
  const resolvedStyle =
    style ?? (headingLevel === 1 ? "Heading1" : headingLevel ? "Heading2" : undefined);

  if (!clean) {
    return "<w:p/>";
  }

  const size = resolvedStyle === "Title" ? 36 : resolvedStyle === "Heading1" ? 28 : resolvedStyle === "Heading2" ? 24 : 22;
  return `<w:p><w:pPr>${resolvedStyle ? `<w:pStyle w:val="${resolvedStyle}"/>` : ""}</w:pPr>${docxRun(clean, { bold: Boolean(resolvedStyle), size })}</w:p>`;
}

function pageBreak() {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function createDocx(
  pkg: TrainingPackage,
  target: ExportTarget,
  options: ExportOptions = {},
) {
  const date = new Date().toLocaleDateString("en-US");
  const body = contentForTarget(pkg, target, options);
  const paragraphs = [
    docxParagraph("DG Academy", "Title"),
    docxParagraph(docTitle(target), "Heading1"),
    docxParagraph(`Course: ${pkg.title}`),
    docxParagraph(`Client: ${pkg.client}`),
    docxParagraph(`Date generated: ${date}`),
    pageBreak(),
    ...markdownToLines(body).map((line) => docxParagraph(line)),
  ].join("\n");

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr>
  </w:body>
</w:document>`;

  return createZip([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    },
    { name: "word/document.xml", content: document },
  ]);
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

function createPdf(
  pkg: TrainingPackage,
  target: ExportTarget,
  options: ExportOptions = {},
) {
  const heading = [
    `DG Academy - ${docTitle(target)}`,
    `Course: ${pkg.title}`,
    `Client: ${pkg.client}`,
    `Date generated: ${new Date().toLocaleDateString("en-US")}`,
    "",
  ];
  const allLines = [...heading, ...markdownToLines(contentForTarget(pkg, target, options))].flatMap(
    (line) => wrapText(line, 86),
  );
  const pages: string[][] = [];
  for (let index = 0; index < allLines.length; index += 44) {
    pages.push(allLines.slice(index, index + 44));
  }

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(
    `<< /Type /Pages /Kids [${pages
      .map((_, index) => `${3 + index * 2} 0 R`)
      .join(" ")}] /Count ${pages.length} >>`,
  );

  pages.forEach((lines, index) => {
    const pageObject = 3 + index * 2;
    const contentObject = pageObject + 1;
    const stream = [
      "BT",
      "/F1 10 Tf",
      "50 760 Td",
      ...lines.flatMap((line, lineIndex) => [
        lineIndex === 0 ? "" : "0 -16 Td",
        `(${pdfEscape(line)}) Tj`,
      ]),
      "ET",
    ]
      .filter(Boolean)
      .join("\n");

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> /Contents ${contentObject} 0 R >>`,
    );
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  });

  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  const parts = ["%PDF-1.4\n"];
  const offsets: number[] = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(parts.join("")));
    parts.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });

  const xrefOffset = Buffer.byteLength(parts.join(""));
  parts.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  offsets.slice(1).forEach((offset) => {
    parts.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
  });
  parts.push(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
  );

  return Buffer.from(parts.join(""), "utf8");
}

export function exportTrainingPackage(
  pkg: TrainingPackage,
  format: ExportFormat,
  target: ExportTarget = "full",
  options: ExportOptions = {},
): ExportResult {
  if (format === "txt") {
    return {
      buffer: Buffer.from(contentForTarget(pkg, target, options), "utf8"),
      contentType: "text/plain; charset=utf-8",
      filename: exportFilename(pkg, target, "txt"),
    };
  }

  if (format === "docx") {
    return {
      buffer: createDocx(pkg, target, options),
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

  return {
    buffer: createPdf(pkg, target, options),
    contentType: "application/pdf",
    filename: exportFilename(pkg, target, "pdf"),
  };
}
