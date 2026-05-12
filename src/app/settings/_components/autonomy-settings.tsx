"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { autonomyLevels, type AutonomyLevel } from "@/lib/safety/autonomy";

const descriptions: Record<AutonomyLevel, string> = {
  manual: "AI drafts only.",
  assisted: "AI drafts and recommends next actions.",
  supervised: "AI can execute low-risk internal actions.",
  bounded_auto: "AI can run scheduled low-risk loops, while risky actions still require approval.",
};

export function AutonomySettingsPanel() {
  const [autonomyLevel, setAutonomyLevel] = useState<AutonomyLevel>("assisted");
  const [notice, setNotice] = useState("");

  async function loadSettings() {
    const response = await fetch("/api/settings/autonomy", { cache: "no-store" });
    const payload = (await response.json()) as {
      settings?: { autonomyLevel: AutonomyLevel };
    };
    if (payload.settings) setAutonomyLevel(payload.settings.autonomyLevel);
  }

  async function saveSettings() {
    const response = await fetch("/api/settings/autonomy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autonomyLevel }),
    });
    const payload = (await response.json()) as { error?: string };
    setNotice(response.ok ? "Autonomy level updated." : payload.error ?? "Update failed.");
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-teal-100" />
          Agent Autonomy Level
        </CardTitle>
        <CardDescription>
          Bounded autonomy controls what low-risk internal actions agents may
          perform. Risky actions always require approval.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[240px_1fr]">
          <Select
            value={autonomyLevel}
            onChange={(event) => setAutonomyLevel(event.target.value as AutonomyLevel)}
          >
            {autonomyLevels.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </Select>
          <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-3">
            <Badge variant="teal">{autonomyLevel}</Badge>
            <p className="mt-2 text-sm text-muted-foreground">{descriptions[autonomyLevel]}</p>
          </div>
        </div>
        <Button type="button" variant="gold" onClick={saveSettings}>
          <ShieldCheck className="h-4 w-4" />
          Save Autonomy Level
        </Button>
        {notice ? <p className="text-sm text-teal-50">{notice}</p> : null}
      </CardContent>
    </Card>
  );
}
