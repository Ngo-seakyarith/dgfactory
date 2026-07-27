"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function QueryErrorState({
  title = "Could not load this data",
  detail,
  onRetry,
}: {
  title?: string;
  detail: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg border border-destructive/25 bg-destructive/10 shadow-executive">
      <div className="flex flex-col items-start gap-4 p-6">
        <div>
          <div className="font-semibold text-destructive">{title}</div>
          <p className="mt-2 text-sm leading-6 text-destructive/80">{detail}</p>
        </div>
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    </div>
  );
}
