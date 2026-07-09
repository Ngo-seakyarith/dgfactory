import type { TrainingPackage } from "@/features/training-packages/domain/training-package";
import { createZip } from "./zip";
import { markdownToLines, wrapText, xmlEscape } from "./content";
import type { DocumentSection } from "./types";

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

export function createPptx(pkg: TrainingPackage) {
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
