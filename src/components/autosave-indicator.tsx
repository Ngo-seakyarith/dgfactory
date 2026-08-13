"use client";

import { AlertCircle, Check, Loader2 } from "lucide-react";

import type { AutosaveStatus } from "@/hooks/use-autosave";

export function AutosaveIndicator({ status }: { status: AutosaveStatus }) {
  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground" role="status">
        <Loader2 className="h-4 w-4 animate-spin" />
        Saving...
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-destructive" role="alert">
        <AlertCircle className="h-4 w-4" />
        Autosave failed
      </span>
    );
  }

  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground" role="status">
        <Check className="h-4 w-4" />
        Saved
      </span>
    );
  }

  return <span className="text-sm text-muted-foreground">Autosave on</span>;
}
