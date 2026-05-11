import { adaptiveGrowthReportToMarkdown, type AdaptiveGrowthExecutiveReport } from "@/lib/adaptive-growth-dashboard";

function filePart(value: string) {
  return (
    value
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 72) || "AdaptiveGrowthReport"
  );
}

function pdfEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(value: string, maxLength = 90) {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    if (!word) return;
    if (`${current} ${word}`.trim().length > maxLength) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  });

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function createSimplePdf(markdown: string) {
  const allLines = markdown
    .split(/\r?\n/)
    .flatMap((line) => wrapText(line.replace(/^#+\s*/, ""), 88));
  const pages: string[][] = [];

  for (let index = 0; index < allLines.length; index += 44) {
    pages.push(allLines.slice(index, index + 44));
  }

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages
      .map((_, index) => `${3 + index * 2} 0 R`)
      .join(" ")}] /Count ${pages.length} >>`,
  ];

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

export function exportAdaptiveGrowthReport(
  report: AdaptiveGrowthExecutiveReport,
  format: "pdf" | "txt" = "pdf",
) {
  const markdown = adaptiveGrowthReportToMarkdown(report);
  const datePart = report.generatedAt.slice(0, 10);
  const rangePart = filePart(report.filters.range);
  const filename = `DGAcademy_AdaptiveGrowth_${rangePart}_${datePart}.${format}`;

  if (format === "txt") {
    return {
      buffer: Buffer.from(markdown, "utf8"),
      contentType: "text/plain; charset=utf-8",
      filename,
    };
  }

  return {
    buffer: createSimplePdf(markdown),
    contentType: "application/pdf",
    filename,
  };
}
