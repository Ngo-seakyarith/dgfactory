import { describe, expect, test } from "bun:test";

import JSZip from "jszip";

import { parseSyllabusPptx } from "./parse-pptx";
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
