"use client";

import { useMemo } from "react";
import { Markdown, type MarkdownComponents } from "@tanstack/markdown/react";

import { parseAppMarkdown } from "@/lib/markdown";

const components: MarkdownComponents = {
  a({ href, children, ...props }) {
    const external = /^https?:\/\//i.test(href ?? "");
    return (
      <a {...props} href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
        {children}
      </a>
    );
  },
  table({ children, ...props }) {
    return (
      <div className="markdown-table-scroll" role="region" aria-label="Content table" tabIndex={0}>
        <table {...props}>{children}</table>
      </div>
    );
  },
};

export function MarkdownPreview({ value }: { value: string }) {
  const document = useMemo(() => parseAppMarkdown(value), [value]);
  return (
    <div className="max-h-[34rem] min-w-0 overflow-auto p-5">
      <div className="markdown-preview max-w-4xl">
        <Markdown components={components}>{document}</Markdown>
      </div>
    </div>
  );
}
