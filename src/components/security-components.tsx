"use client";

import { useEffect, useMemo, useState } from "react";
import { Clipboard, Loader2, Play, ShieldCheck, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SecurityAudit, SecurityAuditItem } from "@/lib/security/types";

type SecurityPayload = {
  audit?: SecurityAudit;
  audits?: SecurityAudit[];
  items?: SecurityAuditItem[];
  report?: string;
  error?: string;
};

export function SecurityDashboard() {
  const [audit, setAudit] = useState<SecurityAudit | null>(null);
  const [items, setItems] = useState<SecurityAuditItem[]>([]);
  const [report, setReport] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  async function loadSecurity() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/security", { cache: "no-store" });
      const payload = (await response.json()) as SecurityPayload;

      if (!response.ok || !payload.audit) {
        throw new Error(payload.error ?? "Security dashboard could not load.");
      }

      setAudit(payload.audit);
      setItems(payload.items ?? []);
      setReport(payload.report ?? "");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Security load failed.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSecurity();
  }, []);

  const grouped = useMemo(() => {
    const groups = new Map<string, SecurityAuditItem[]>();
    items.forEach((item) => {
      groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
    });
    return [...groups.entries()];
  }, [items]);
  const failed = items.filter((item) => item.status === "Failed");
  const passed = items.filter((item) => item.status === "Passed");
  const critical = failed.filter((item) => item.severity === "Critical");

  async function runRedTeam() {
    setIsRunning(true);
    setNotice("");

    try {
      const response = await fetch("/api/security/run-red-team", {
        method: "POST",
      });
      const payload = (await response.json()) as SecurityPayload;

      if (!response.ok || !payload.audit) {
        throw new Error(payload.error ?? "Red-team run failed.");
      }

      setAudit(payload.audit);
      setItems(payload.items ?? []);
      setReport(payload.report ?? "");
      setNotice(payload.audit.summary);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Red-team run failed.");
    } finally {
      setIsRunning(false);
    }
  }

  async function copyReport() {
    if (!report) return;
    await navigator.clipboard.writeText(report);
    setNotice("Security report copied.");
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-teal-300/20 bg-teal-300/10 p-6 shadow-executive">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
              V3.3 Security Red Team
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">
              Governance Audit
            </h1>
            <p className="mt-3 text-sm leading-7 text-teal-50/80">
              Check prompt injection, data leakage, margin exposure, unsafe tools,
              orchestrator overreach, role permissions, exports, and Supabase RLS readiness.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="gold" onClick={runRedTeam} disabled={isRunning}>
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run Red-Team
            </Button>
            <Button type="button" variant="outline" onClick={copyReport} disabled={!report}>
              <Clipboard className="h-4 w-4" />
              Copy Report
            </Button>
          </div>
        </div>
      </section>

      {notice ? (
        <p className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-3 text-sm text-teal-50">
          {notice}
        </p>
      ) : null}

      {isLoading ? (
        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading security audit...
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Risk score" value={audit?.riskScore ?? 0} />
        <Metric label="Passed" value={passed.length} />
        <Metric label="Failed" value={failed.length} />
        <Metric label="Critical" value={critical.length} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#f7d889]" />
              Security Checklist
            </CardTitle>
            <CardDescription>
              Baseline internal controls for wider deployment readiness.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {grouped.map(([category, groupItems]) => (
              <div key={category} className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
                <div className="font-semibold text-white">{category}</div>
                <div className="mt-3 space-y-2">
                  {groupItems.map((item) => (
                    <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-white/10 bg-black/15 p-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-100">{item.title}</div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {item.evidence || item.description}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Badge variant={item.status === "Passed" ? "teal" : item.status === "Failed" ? "gold" : "outline"}>
                          {item.status}
                        </Badge>
                        <Badge variant="outline">{item.severity}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#f7d889]" />
              Security Report
            </CardTitle>
            <CardDescription>
              Executive summary, risks, fixes, and go/no-go recommendation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[42rem] overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-[#07111f]/55 p-4 font-sans text-sm leading-7 text-slate-100">
              {report || "Run a red-team audit to generate a security report."}
            </pre>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardContent className="p-5">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-2 font-mono text-3xl font-semibold text-white">{value}</div>
      </CardContent>
    </Card>
  );
}
