"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, Loader2, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type BrainStatus = {
  intendedBrainModel: string;
  actualModelUsed: string;
  apiKeyConfigured: boolean;
  lastSuccessfulModelUsed: string | null;
  modelStatus: "configured" | "error";
  lastWarning: string | null;
  lastError: string | null;
};

export function AiSettingsPanel() {
  const [status, setStatus] = useState<BrainStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadStatus() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/brain/status", { cache: "no-store" });
      setStatus((await response.json()) as BrainStatus);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-teal-100" />
          Brain Model Status
        </CardTitle>
        <CardDescription>
          GPT-5.5 is the intended Brain model. Missing credentials or model
          errors now fail generation instead of producing substitute content.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading Brain status...
          </div>
        ) : status ? (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <StatusTile label="Intended model" value={status.intendedBrainModel} />
              <StatusTile label="Actual model" value={status.actualModelUsed} />
              <StatusTile label="API key" value={status.apiKeyConfigured ? "Configured" : "Missing"} />
              <StatusTile label="Last success" value={status.lastSuccessfulModelUsed ?? "None yet"} />
              <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
                <div className="text-xs text-muted-foreground">Status</div>
                <Badge className="mt-2" variant={status.modelStatus === "configured" ? "teal" : "gold"}>
                  {status.modelStatus}
                </Badge>
              </div>
            </div>
            {status.lastWarning || status.lastError ? (
              <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-50">
                {status.lastWarning || status.lastError}
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Brain status unavailable.</p>
        )}
        <Button type="button" variant="outline" onClick={loadStatus}>
          <RefreshCw className="h-4 w-4" />
          Refresh Status
        </Button>
      </CardContent>
    </Card>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 break-words font-mono text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
