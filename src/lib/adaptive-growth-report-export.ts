import { adaptiveGrowthReportToMarkdown, type AdaptiveGrowthExecutiveReport } from "@/lib/adaptive-growth-dashboard";

function filePart(value: string) {
  return (
    value
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 72) || "AdaptiveGrowthReport"
  );
}

export function exportAdaptiveGrowthReport(
  report: AdaptiveGrowthExecutiveReport,
) {
  const markdown = adaptiveGrowthReportToMarkdown(report);
  const datePart = report.generatedAt.slice(0, 10);
  const rangePart = filePart(report.filters.range);
  const filename = `DGAcademy_AdaptiveGrowth_${rangePart}_${datePart}.md`;

  return {
    buffer: Buffer.from(markdown, "utf8"),
    contentType: "text/markdown; charset=utf-8",
    filename,
  };
}
