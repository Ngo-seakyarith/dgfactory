import { describe, expect, test } from "bun:test";
import { renderHtml } from "@tanstack/markdown/html";

import { markdownInlineText, markdownText, parseAppMarkdown } from "./markdown";

describe("shared application Markdown", () => {
  test("preserves paragraphs, nested lists, tables, and inline formatting", () => {
    const source = "## Content\n\n**Strong** and *emphasis* with `code`.\n\n- Parent\n  - Child\n\n| Tool | Output |\n| --- | --- |\n| Spreadsheet | **Report** |";
    const document = parseAppMarkdown(source);
    expect(document.children.map((node) => node.type)).toEqual(["heading", "paragraph", "list", "table"]);
    const html = renderHtml(document);
    expect(html).toContain("<strong>Strong</strong>");
    expect(html).toContain("<em>emphasis</em>");
    expect(html).toContain("<code>code</code>");
    expect(html).toMatch(/<ul>[\s\S]*<li>Parent[\s\S]*<ul>[\s\S]*Child/);
    expect(html).toContain("<table>");
    expect(markdownText(source)).toContain("Tool | Output\nSpreadsheet | Report");
  });

  test("removes only the leading DG serialized metadata marker", () => {
    for (const kind of ["slide-deck", "workbook", "facilitator-guide", "prompt-library"]) {
      const document = parseAppMarkdown(`<!-- dg-${kind}:%7B%22version%22%3A2%7D -->\r\n\r\n# Visible title`);
      expect(document.children).toHaveLength(1);
      expect(document.children[0]?.type).toBe("heading");
      expect(markdownText(`<!-- dg-${kind}:data -->\n# Visible title`)).toBe("Visible title");
    }
    expect(markdownText("```html\n<!-- dg-slide-deck:example -->\n```"))
      .toBe("<!-- dg-slide-deck:example -->");
  });

  test("escapes HTML and removes unsafe URLs rather than evaluating them", () => {
    const document = parseAppMarkdown('<script>alert(1)</script>\n\n[Run](javascript:alert) [Local](file:///C:/secret.txt) [Data](data:text/html,bad)');
    const html = renderHtml(document);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("href=");
    expect(html).toContain("Run Local Data");
  });

  test("permits safe links without fetching image URLs", () => {
    const html = renderHtml(parseAppMarkdown("[Guide](https://example.com/guide) [Email](mailto:team@example.com) [Call](tel:+85512345678) [Package](/packages/1) ![Trainer](https://example.com/trainer.png)"));
    expect(html).toContain('href="https://example.com/guide"');
    expect(html).toContain('href="mailto:team@example.com"');
    expect(html).toContain('href="tel:+85512345678"');
    expect(html).toContain('href="/packages/1"');
    expect(html).not.toContain("<img");
    expect(html).toContain("Trainer");
  });

  test("retains ordered starts, task states, and literal code", () => {
    const document = parseAppMarkdown("7. First\n8. Second\n\n- [x] Ready\n- [ ] Pending\n\n```ts\nconst title = '**literal**';\n```");
    expect(document.children[0]).toMatchObject({ type: "list", ordered: true, start: 7 });
    expect(document.children[1]).toMatchObject({ type: "list", items: [{ checked: true }, { checked: false }] });
    expect(document.children[2]).toMatchObject({ type: "code", value: "const title = '**literal**';" });
  });

  test("does not reinterpret generated content as frontmatter and is deterministic", () => {
    const source = "---\ntitle: Course\n---\n\n## Content";
    const first = parseAppMarkdown(source);
    expect(first.frontmatter).toBeUndefined();
    expect(markdownText(source)).toContain("title: Course");
    expect(parseAppMarkdown(source)).toEqual(first);
    expect(markdownInlineText([{ type: "strong", children: [{ type: "text", value: "Title" }] }])).toBe("Title");
  });
});
