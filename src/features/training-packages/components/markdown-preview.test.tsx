import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { MarkdownPreview } from "./markdown-preview";

describe("Markdown preview", () => {
  test("renders accessible headings, nested lists, task items, and a scrollable table", () => {
    const html = renderToStaticMarkup(<MarkdownPreview value={
      "# Course\n\n## Module\n\n- Parent\n  - Child\n\n- [x] Reviewed\n\n| Input | Output |\n| --- | --- |\n| Case | Brief |"
    } />);
    expect(html).toContain("<h1>Course</h1>");
    expect(html).toContain("<h2>Module</h2>");
    expect(html).toMatch(/<ul>[\s\S]*Parent[\s\S]*<ul>[\s\S]*Child/);
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('aria-label="Content table"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain("<th>Input</th>");
  });

  test("screens unsafe content and preserves safe external links", () => {
    const html = renderToStaticMarkup(<MarkdownPreview value={
      '<script>alert(1)</script>\n\n[Unsafe](javascript:alert) [Guide](https://example.com) ![Image](https://example.com/image.png)'
    } />);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<img");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  test("hides stored metadata without removing readable deck content", () => {
    const html = renderToStaticMarkup(<MarkdownPreview value={"<!-- dg-slide-deck:encoded-plan -->\n\n# Course\n\n## Live demo\n\n**Input:** A fictional case."} />);
    expect(html).not.toContain("encoded-plan");
    expect(html).toContain("<h2>Live demo</h2>");
    expect(html).toContain("<strong>Input:</strong>");
  });
});
