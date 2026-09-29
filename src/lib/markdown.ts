import { parseMarkdown } from "@tanstack/markdown/parser";
import type { BlockNode, InlineNode, ParseOptions } from "@tanstack/markdown";

const markdownOptions: ParseOptions = {
  allowHtml: false,
  frontmatter: false,
  headingIds: false,
  urlTransform(_url, kind, screenedUrl) {
    // Generated images remain labels; previews and exports never fetch them.
    if (kind === "image" || !screenedUrl) return null;
    const protocol = screenedUrl.match(/^([a-z][a-z0-9+.-]*):/i)?.[1];
    return !protocol || /^(https?|mailto|tel)$/i.test(protocol) ? screenedUrl : null;
  },
};

export function parseAppMarkdown(source: string) {
  const visibleSource = source.replace(
    /^[\t ]*<!--\s*dg-(?:slide-deck|workbook|facilitator-guide|prompt-library):[^\r\n]*-->[\t ]*(?:\r?\n|$)/,
    "",
  );
  return parseMarkdown(visibleSource, markdownOptions);
}

export function markdownInlineText(nodes: InlineNode[]): string {
  return nodes.map((node) => {
    switch (node.type) {
      case "text":
      case "inlineCode":
      case "inlineHtml":
        return node.value;
      case "image":
        return node.alt;
      case "break":
        return "\n";
      case "footnoteReference":
        return `[${node.number}]`;
      default:
        return markdownInlineText(node.children);
    }
  }).join("");
}

export function markdownBlockText(node: BlockNode): string {
  switch (node.type) {
    case "heading":
    case "paragraph":
      return markdownInlineText(node.children);
    case "code":
    case "html":
      return node.value;
    case "list":
    case "footnotes":
      return node.items.map((item) => item.children.map(markdownBlockText).join("\n")).join("\n");
    case "table":
      return [node.header, ...node.rows]
        .map((row) => row.map((cell) => markdownInlineText(cell.children)).join(" | "))
        .join("\n");
    case "thematicBreak":
      return "";
    default:
      return node.children.map(markdownBlockText).join("\n");
  }
}

export function markdownText(source: string) {
  return parseAppMarkdown(source).children.map(markdownBlockText).join("\n");
}
