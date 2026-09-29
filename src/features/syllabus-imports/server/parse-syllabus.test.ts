import { describe, expect, test } from "bun:test";

import JSZip from "jszip";

import { parseSyllabusPptx } from "./parse-pptx";
import { parseSyllabusPdf } from "./parse-pdf";
import { validateSyllabusUpload } from "./parse-syllabus";

async function pptxFixture() {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<Types><Override ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/></Types>',
  );
  zip.file(
    "ppt/presentation.xml",
    '<p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst><p:sldId r:id="rId1"/></p:sldIdLst></p:presentation>',
  );
  zip.file(
    "ppt/_rels/presentation.xml.rels",
    '<Relationships><Relationship Id="rId1" Target="slides/slide1.xml"/></Relationships>',
  );
  zip.file(
    "ppt/slides/slide1.xml",
    `<p:sld xmlns:p="p" xmlns:a="a">
      <p:cSld><p:spTree>
        <p:sp><p:nvSpPr><p:nvPr/></p:nvSpPr><p:txBody><a:p><a:r><a:rPr sz="3200"/><a:t>Practical Leadership</a:t></a:r></a:p></p:txBody></p:sp>
        <p:sp><p:nvSpPr><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr><p:txBody>
          <a:p><a:pPr><a:buChar char="-"/></a:pPr><a:r><a:rPr sz="1800"/><a:t>Review the case</a:t></a:r></a:p>
          <a:p><a:pPr><a:buChar char="-"/></a:pPr><a:r><a:rPr sz="1800"/><a:t>Present the decision</a:t></a:r></a:p>
        </p:txBody></p:sp>
        <p:graphicFrame><a:graphic><a:graphicData><a:tbl>
          <a:tr><a:tc><a:txBody><a:p><a:r><a:t>Session</a:t></a:r></a:p></a:txBody></a:tc><a:tc><a:txBody><a:p><a:r><a:t>Time</a:t></a:r></a:p></a:txBody></a:tc></a:tr>
          <a:tr><a:tc><a:txBody><a:p><a:r><a:t>Practice</a:t></a:r></a:p></a:txBody></a:tc><a:tc><a:txBody><a:p><a:r><a:t>30 min</a:t></a:r></a:p></a:txBody></a:tc></a:tr>
        </a:tbl></a:graphicData></a:graphic></p:graphicFrame>
      </p:spTree></p:cSld>
    </p:sld>`,
  );
  zip.file(
    "ppt/slides/_rels/slide1.xml.rels",
    '<Relationships><Relationship Id="rId2" Target="../notesSlides/notesSlide1.xml"/></Relationships>',
  );
  zip.file(
    "ppt/notesSlides/notesSlide1.xml",
    '<p:notes xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree><p:sp><p:nvSpPr><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>Ask participants for one example.</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:notes>',
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("syllabus source validation", () => {
  test.each([
    ["source.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    ["source.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    ["source.pdf", "application/pdf"],
  ])("accepts %s", (name, mimeType) => {
    expect(() => validateSyllabusUpload({ name, mimeType, sizeBytes: 1_024 })).not.toThrow();
  });

  test("rejects unsupported and oversized files", () => {
    expect(() =>
      validateSyllabusUpload({ name: "source.ppt", mimeType: "", sizeBytes: 1_024 }),
    ).toThrow("DOCX, PPTX, or text-based PDF");
    expect(() =>
      validateSyllabusUpload({ name: "source.pdf", mimeType: "application/pdf", sizeBytes: 11 * 1024 * 1024 }),
    ).toThrow("no larger than 10 MB");
  });
});

describe("PowerPoint syllabus parsing", () => {
  test("preserves slide structure, tables, and speaker notes", async () => {
    const blocks = await parseSyllabusPptx(await pptxFixture());
    expect(blocks).toContainEqual({
      type: "heading",
      level: 1,
      text: "Practical Leadership",
      location: "Slide 1",
    });
    expect(blocks).toContainEqual({
      type: "list",
      ordered: false,
      items: ["Review the case", "Present the decision"],
      location: "Slide 1",
    });
    expect(blocks).toContainEqual({
      type: "table",
      rows: [["Session", "Time"], ["Practice", "30 min"]],
      location: "Slide 1",
    });
    expect(blocks).toContainEqual({
      type: "paragraph",
      text: "Ask participants for one example.",
      location: "Slide 1 notes",
    });
  });
});

function pdfFixture() {
  const stream = [
    "BT",
    "/F1 20 Tf",
    "72 740 Td",
    "(Practical Consultative Selling) Tj",
    "0 -32 Td",
    "/F1 12 Tf",
    "(Programme overview for sales professionals and account managers.) Tj",
    "0 -22 Td",
    "(Participants practise discovery questions, value framing, and closing.) Tj",
    "0 -22 Td",
    "(The workshop includes demonstrations, role-play, feedback, and action planning.) Tj",
    "ET",
  ].join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];
  let source = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(source));
    source += object;
  }
  const xrefOffset = Buffer.byteLength(source);
  source += "xref\n0 6\n0000000000 65535 f \n";
  source += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  source += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(source);
}

describe("PDF syllabus parsing", () => {
  test("extracts structured text without a native canvas runtime", async () => {
    const blocks = await parseSyllabusPdf(pdfFixture());

    expect(
      blocks.some(
        (block) =>
          block.type === "heading" &&
          block.text === "Practical Consultative Selling",
      ),
    ).toBe(true);
    expect(
      blocks.some(
        (block) =>
          block.type === "paragraph" &&
          block.text.includes("discovery questions"),
      ),
    ).toBe(true);
  });
});
