"use client";

import { useState } from "react";
import { Check, Clipboard, Loader2, Save, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TrainingPackage } from "@/features/training-packages";
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

export function SaveButton({
  disabled,
  isSaving,
  onSave,
}: {
  disabled?: boolean;
  isSaving?: boolean;
  onSave: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full sm:w-auto"
      onClick={onSave}
      disabled={disabled || isSaving}
    >
      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      Save Package
    </Button>
  );
}

export function QualityChecklist({
  checklist,
}: {
  checklist: TrainingPackage["qualityChecklist"];
}) {
  return (
    <div className="grid gap-2">
      {checklist.map((item, index) => (
        <div
          key={`${item.category}-${index}`}
          className="rounded-lg border border-white/10 bg-[#07111f]/55 p-3"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-white">{item.category}</span>
            <span className={item.status === "ready" ? "text-xs text-teal-100" : "text-xs text-[#f7d889]"}>
              {item.status === "ready" ? "Ready" : "Review"}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.item}</p>
        </div>
      ))}
    </div>
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
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}
      </CardContent>
    </Card>
  );
}

export function ErrorState({
  title = "Something went wrong",
  detail,
}: {
  title?: string;
  detail: string;
}) {
  return (
    <Card className="border-red-300/25 bg-red-400/10 shadow-executive">
      <CardContent className="p-6">
        <div className="text-base font-semibold text-red-100">{title}</div>
        <p className="mt-2 text-sm leading-6 text-red-100/80">{detail}</p>
      </CardContent>
    </Card>
  );
}
