"use client";

import { useMemo, useState } from "react";
import {
  Calculator,
  Clipboard,
  Download,
  FileText,
  Loader2,
  PlayCircle,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  calculateProductRoi,
  defaultRoiInputs,
  formatProductMoney,
  type RoiInputs,
} from "@/lib/productization";

export function ProductBriefExportButtons() {
  const [isExporting, setIsExporting] = useState("");
  const [notice, setNotice] = useState("");

  async function exportBrief(format: "docx" | "pdf") {
    setIsExporting(format);
    setNotice("");

    try {
      const response = await fetch("/api/product-brief/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "Product brief export failed.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filename =
        disposition.match(/filename="([^"]+)"/)?.[1] ??
        `DGAcademy_DGCapabilityFactory_ProductBrief.${format}`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setNotice(`Product brief ${format.toUpperCase()} exported.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Product brief export failed.");
    } finally {
      setIsExporting("");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="gold" onClick={() => exportBrief("docx")}>
          {isExporting === "docx" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Product Brief DOCX
        </Button>
        <Button type="button" variant="outline" onClick={() => exportBrief("pdf")}>
          {isExporting === "pdf" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          Product Brief PDF
        </Button>
      </div>
      {notice ? <p className="text-sm text-teal-50">{notice}</p> : null}
    </div>
  );
}

export function DemoSeedButton() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [notice, setNotice] = useState("");

  async function seedDemo() {
    setIsSeeding(true);
    setNotice("");

    try {
      const response = await fetch("/api/demo/seed", { method: "POST" });
      const payload = (await response.json()) as {
        note?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Demo workspace creation failed.");
      }

      setNotice(payload.note ?? "Demo workspace data created.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Demo workspace creation failed.");
    } finally {
      setIsSeeding(false);
    }
  }

  return (
    <Card className="border-teal-300/20 bg-teal-300/10 shadow-executive">
      <CardHeader>
        <div className="mb-2 flex flex-wrap gap-2">
          <Badge variant="teal">Demo Mode</Badge>
          <Badge variant="outline">Explicit admin action</Badge>
        </div>
        <CardTitle>Create Demo Workspace</CardTitle>
        <CardDescription>
          Adds clearly marked sample client, package, pricing, proposal, pipeline,
          delivery project, knowledge note, and quality report records.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button type="button" variant="gold" onClick={seedDemo} disabled={isSeeding}>
          {isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
          Create Demo Workspace
        </Button>
        {notice ? (
          <p className="rounded-lg border border-teal-300/20 bg-[#07111f]/55 p-3 text-sm text-teal-50">
            {notice}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function RoiCalculator() {
  const [inputs, setInputs] = useState<RoiInputs>(defaultRoiInputs);
  const [copied, setCopied] = useState(false);
  const outputs = useMemo(() => calculateProductRoi(inputs), [inputs]);

  function updateField(key: keyof RoiInputs, value: string) {
    setInputs((current) => ({
      ...current,
      [key]: Number(value),
    }));
  }

  async function copySummary() {
    await navigator.clipboard.writeText(outputs.roiSummary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-5">
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge variant="teal">ROI Placeholder</Badge>
            <Badge variant="outline">Estimate only</Badge>
          </div>
          <CardTitle>DG Capability Factory ROI Calculator</CardTitle>
          <CardDescription>
            Estimate proposal production time saved and revenue supported.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <RoiField
            label="Proposals per month"
            value={inputs.proposalsPerMonth}
            onChange={(value) => updateField("proposalsPerMonth", value)}
          />
          <RoiField
            label="Hours per proposal"
            value={inputs.hoursPerProposal}
            onChange={(value) => updateField("hoursPerProposal", value)}
          />
          <RoiField
            label="Staff cost per hour"
            value={inputs.staffCostPerHour}
            onChange={(value) => updateField("staffCostPerHour", value)}
          />
          <RoiField
            label="Expected time saved %"
            value={inputs.expectedTimeSavedPercent}
            onChange={(value) => updateField("expectedTimeSavedPercent", value)}
          />
          <RoiField
            label="Trainings per year"
            value={inputs.trainingsPerYear}
            onChange={(value) => updateField("trainingsPerYear", value)}
          />
          <RoiField
            label="Revenue per training"
            value={inputs.revenuePerTraining}
            onChange={(value) => updateField("revenuePerTraining", value)}
          />
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric
          label="Monthly hours saved"
          value={outputs.monthlyHoursSaved.toFixed(1)}
        />
        <Metric label="Annual hours saved" value={outputs.annualHoursSaved.toFixed(1)} />
        <Metric
          label="Annual cost saved"
          value={formatProductMoney(outputs.annualCostSaved)}
        />
        <Metric
          label="Monthly cost saved"
          value={formatProductMoney(outputs.monthlyCostSaved)}
        />
        <Metric
          label="Revenue supported"
          value={formatProductMoney(outputs.estimatedRevenueSupported)}
        />
        <Card className="border-teal-300/20 bg-teal-300/10 shadow-executive">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
              <Sparkles className="h-4 w-4 text-teal-100" />
              ROI summary
            </div>
            <p className="text-sm leading-6 text-teal-50/90">{outputs.roiSummary}</p>
            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={copySummary}>
              <Clipboard className="h-4 w-4" />
              {copied ? "Copied" : "Copy Summary"}
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function RoiField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-white">{label}</span>
      <Input
        type="number"
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calculator className="h-3.5 w-3.5" />
          {label}
        </div>
        <div className="mt-2 font-mono text-2xl font-semibold text-white">{value}</div>
      </CardContent>
    </Card>
  );
}
