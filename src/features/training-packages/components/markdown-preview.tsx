"use client";

import type { ReactNode } from "react";
function renderInlineMarkdown(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[0.9em] text-teal-100"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return part;
  });
}

export function MarkdownPreview({ value }: { value: string }) {
  const lines = value.split(/\r?\n/);
  const elements: ReactNode[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  function flushList() {
    if (!listType || listItems.length === 0) {
      return;
    }

    const Tag = listType;
    elements.push(
      <Tag
        key={`list-${elements.length}`}
        className={`my-3 space-y-1 pl-6 text-sm leading-7 text-slate-200 ${
          listType === "ol" ? "list-decimal" : "list-disc"
        }`}
      >
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`}>{renderInlineMarkdown(item)}</li>
        ))}
      </Tag>,
    );
    listType = null;
    listItems = [];
  }

  function flushCodeBlock() {
    if (codeLines.length > 0) {
      elements.push(
        <pre
          key={`code-${elements.length}`}
          className="my-4 overflow-x-auto whitespace-pre-wrap rounded-md border border-white/10 bg-black/20 p-4 font-mono text-sm leading-6 text-slate-100"
        >
          {codeLines.join("\n")}
        </pre>,
      );
    }
    codeLines = [];
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      flushList();
      if (inCodeBlock) flushCodeBlock();
      inCodeBlock = !inCodeBlock;
      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    if (!trimmed) {
      flushList();
      return;
    }

    if (/^<!--\s*dg-(?:slide-deck|workbook|facilitator-guide|prompt-library):.*-->$/.test(trimmed)) {
      return;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      const className =
        level === 1
          ? "mb-4 mt-1 text-2xl font-semibold leading-tight text-white"
          : level === 2
            ? "mb-2 mt-6 text-lg font-semibold leading-snug text-white"
            : "mb-2 mt-4 text-base font-semibold leading-snug text-teal-50";
      elements.push(
        <div key={`heading-${index}`} className={className}>
          {renderInlineMarkdown(heading[2])}
        </div>,
      );
      return;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)/);
    if (bullet) {
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      listItems.push(bullet[1]);
      return;
    }

    const numbered = trimmed.match(/^\d+\.\s+(.+)/);
    if (numbered) {
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      listItems.push(numbered[1]);
      return;
    }

    flushList();
    elements.push(
      <p key={`paragraph-${index}`} className="my-3 text-sm leading-7 text-slate-200">
        {renderInlineMarkdown(trimmed)}
      </p>,
    );
  });

  flushList();
  flushCodeBlock();

  return (
    <div className="max-h-[34rem] overflow-auto p-5">
      <div className="max-w-4xl">{elements}</div>
    </div>
  );
}
