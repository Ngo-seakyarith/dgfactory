"use client";

import { useState } from "react";
import { Check, Clipboard, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DetailLoadingSkeleton } from "@/components/page-loading-skeleton";
import { Card, CardContent } from "@/components/ui/card";
export function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

export function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="flex min-h-[12rem] items-center justify-center rounded-lg border border-dashed border-white/15 bg-[#07111f]/45 p-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-teal-300/10 text-teal-100">
          <Sparkles className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return <DetailLoadingSkeleton label={label} />;
}

export function ErrorState({
  title = "Something went wrong",
  detail,
}: {
  title?: string;
  detail: string;
}) {
  return (
    <Card className="border-destructive/25 bg-destructive/10 shadow-executive">
      <CardContent className="p-6">
        <div className="text-base font-semibold text-destructive">{title}</div>
        <p className="mt-2 text-sm leading-6 text-destructive/80">{detail}</p>
      </CardContent>
    </Card>
  );
}
