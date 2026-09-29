import { describe, expect, test } from "bun:test";
import { Document, Packer } from "docx";
import { load } from "cheerio";
import JSZip from "jszip";

import { markdownToDocx } from "./markdown-docx";

async function exportedXml(source: string) {
  const result = markdownToDocx(source);
  const buffer = await Packer.toBuffer(new Document({
    numbering: result.numbering,
    sections: [{ children: result.children }],
  }));
  const zip = await JSZip.loadAsync(buffer);
  const document = await zip.file("word/document.xml")!.async("string");
  const numbering = await zip.file("word/numbering.xml")!.async("string");
  const relationships = await zip.file("word/_rels/document.xml.rels")!.async("string");
  return { document, numbering, relationships, xml: load(document, { xmlMode: true }) };
}

describe("Markdown DOCX export", () => {
  test("exports inline formatting as Word runs, not literal markers", async () => {
    const result = await exportedXml("## Training\n\n**Strong** and *emphasis* with ~~old~~ and `code`.\n\n[Guide](https://example.com/guide)");
    expect(result.document).toContain("<w:b/>");
    expect(result.document).toContain("<w:i/>");
    expect(result.document).toContain("<w:strike/>");
    expect(result.document).toContain('w:ascii="Arial"');
    expect(result.document).toContain('w:ascii="Consolas"');
    expect(result.document).not.toContain("**Strong**");
    expect(result.relationships).toContain('Target="https://example.com/guide"');
  });

  test("exports nested lists and separate ordered lists with explicit starts", async () => {
    const result = await exportedXml("- Parent\n  - Child\n\n7. Seventh\n8. Eighth\n\nNext sequence\n\n1. Restarted");
    expect(result.xml("w\\:numPr")).toHaveLength(5);
    expect(result.document).toContain('w:ilvl w:val="1"');
    expect(result.numbering).toContain('w:start w:val="7"');
    const ids = result.xml("w\\:numPr w\\:numId").map((_i, element) => result.xml(element).attr("w:val")).get();
    expect(ids[0]).not.toBe(ids[1]);
    expect(ids[2]).toBe(ids[3]);
    expect(ids[2]).not.toBe(ids[4]);
    expect(result.xml("w\\:t").text()).toContain("ParentChildSeventhEighthNext sequenceRestarted");
  });

  test("exports tables with header rows, aligned cells, and complete content", async () => {
    const result = await exportedXml("| Input | Result |\n| --- | ---: |\n| **Case** | 25 |\n| Prompt | Checked output |");
    expect(result.xml("w\\:tbl")).toHaveLength(1);
    expect(result.xml("w\\:tr")).toHaveLength(3);
    expect(result.xml("w\\:tc")).toHaveLength(6);
    expect(result.document).toContain("w:tblHeader");
    expect(result.document).toContain('w:jc w:val="right"');
    expect(result.xml("w\\:t").text()).toContain("InputResultCase25PromptChecked output");
  });

  test("preserves multiline code and explicit breaks without interpreting code syntax", async () => {
    const result = await exportedXml("Line one\\\nLine two\n\n```ts\nconst label = '**literal**';\nconst value = 1;\n```");
    expect(result.xml("w\\:br")).toHaveLength(2);
    expect(result.xml("w\\:t").text()).toContain("**literal**");
    expect(result.xml("w\\:t").text()).toContain("const value = 1;");
  });

  test("keeps task states, excludes metadata and unsafe links, and never embeds remote images", async () => {
    const result = await exportedXml("<!-- dg-workbook:internal-plan -->\n\n- [x] Ready\n- [ ] Pending\n\n[Unsafe](javascript:alert) ![Trainer](https://example.com/trainer.png)\n\n<script>alert(1)</script>");
    expect(result.xml("w\\:t").text()).toContain("[x] Ready[ ] Pending");
    expect(result.xml("w\\:t").text()).toContain("Unsafe Trainer");
    expect(result.document).not.toContain("internal-plan");
    expect(result.relationships).not.toContain("javascript:");
    expect(result.relationships).not.toContain("trainer.png");
    expect(result.document).not.toContain("<script>");
  });
});
