import { describe, expect, test } from "bun:test";

import { parseSyllabusPdf } from "./parse-pdf";

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
