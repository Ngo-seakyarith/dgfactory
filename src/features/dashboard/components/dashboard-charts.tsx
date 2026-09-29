"use client";

import { useMemo } from "react";
import { barX, barY, defineChart, group, type ChartPoint } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { scaleOrdinal } from "@tanstack/charts/scales/ordinal";
import { tooltip } from "@tanstack/charts/tooltip";
import { projectTypes } from "@/features/pipeline/project-domain";
import { clientRankingMetrics, feeStatuses, formatFees, type ClientRankingMetric, type RankedClient, type MonthlyTrainingFees, type projectStageCounts } from "../domain";

const theme = { foreground: "#1d2521", muted: "#65726b", grid: "#d8ded8", background: "transparent" };
export const feeColors = ["#17776b", "#b77912"] as const;
const projectColors = ["#17776b", "#326ca6", "#9c6490"];
const compactMoney = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });

export function createMonthlyFeesChart(rows: readonly MonthlyTrainingFees[]) {
  return defineChart({
    marks: [barY(rows, { x: "month", y: "fee", z: "status", key: "id", layout: group({ padding: 0.12 }), maxThickness: 22, radius: { end: 3 } })],
    scales: {
      x: { scale: () => scaleBand().padding(0.24), axis: { ticks: { size: 0 }, tickLabels: { fontSize: 12 } } },
      y: { scale: scaleLinear, nice: true, grid: true, axis: { label: "Training fees (USD)", ticks: { format: (value) => compactMoney.format(value) } } },
    },
    color: { scale: scaleOrdinal(feeStatuses, feeColors) },
    theme,
    focus: "group-x",
    tooltip: {
      use: tooltip,
      content: (points) => ({
        title: points[0] ? `${points[0].datum.month} ${points[0].datum.year}` : "Training fees",
        rows: points.map(({ datum }) => ({
          label: `${datum.status} (${datum.trainings.length} training${datum.trainings.length === 1 ? "" : "s"})`,
          value: formatFees(datum.fee), color: feeColors[feeStatuses.indexOf(datum.status)],
        })),
      }),
    },
  });
}

export function MonthlyFeesChart({ rows, onFocus }: {
  rows: readonly MonthlyTrainingFees[];
  onFocus: (row: MonthlyTrainingFees | null) => void;
}) {
  const definition = useMemo(() => createMonthlyFeesChart(rows), [rows]);
  return <Chart definition={definition} height={320} initialWidth={720}
    ariaLabel={`Monthly training fees by payment received date in ${rows[0]?.year ?? "the selected year"}, comparing Delivered and Contracted training in US dollars`}
    ariaDescription="Months without recorded payment dates have zero fees. Amounts use Actual, or the proposal fee when Actual is not recorded."
    onFocusChange={(point) => onFocus(point?.datum ?? null)} />;
}

type StageRow = ReturnType<typeof projectStageCounts>[number];

export function createProjectStagesChart(rows: readonly StageRow[]) {
  return defineChart({
    marks: [barX(rows, { x: "count", y: "stage", z: "type", key: "id", maxThickness: 22 })],
    scales: {
      x: { scale: scaleLinear, nice: true, grid: true, axis: { label: "Count", ticks: { format: (value) => Number.isInteger(value) ? String(value) : "" } } },
      y: { scale: () => scaleBand().padding(0.4), axis: { ticks: { size: 0 }, tickLabels: { fontSize: 12 } } },
    },
    color: { scale: scaleOrdinal(projectTypes, projectColors) },
    theme,
    focus: "group-y",
    tooltip: {
      use: tooltip,
      content: (points) => ({ title: points[0]?.datum.stage ?? "Pipeline stages", rows: points.map(({ datum }) => ({ label: datum.type, value: String(datum.projects.length), color: projectColors[projectTypes.indexOf(datum.type)] })) }),
    },
  });
}

export function ProjectStagesChart({ rows }: { rows: readonly StageRow[] }) {
  const definition = useMemo(() => createProjectStagesChart(rows), [rows]);
  return <Chart definition={definition} height={280} ariaLabel="Pipeline counts by sales stage: Prospects, Warm, Hot, Contracted, and Delivered, separated by training, intelligent systems, and other work" />;
}

export function createTopClientsChart(rows: readonly RankedClient[], metric: ClientRankingMetric) {
  const settings = clientRankingMetrics[metric];
  const byId = new Map(rows.map((row) => [row.id, row]));
  return defineChart(({ width }) => ({
    marks: [barX(rows, { x: "value", y: "id", key: "id", fill: settings.color, maxThickness: 22, radius: { end: 3 } })],
    scales: {
      x: { scale: scaleLinear, nice: true, grid: true, axis: { label: metric === "revenue" ? "Training fees (USD)" : settings.label, ticks: { format: (value: number) => metric === "revenue" ? compactMoney.format(value) : Number.isInteger(value) ? String(value) : "" } } },
      y: { scale: () => scaleBand().padding(0.35), axis: { ticks: { size: 0, format: (id: string) => {
        const row = byId.get(id);
        if (!row) return "";
        const max = width < 480 ? 17 : 30;
        const name = row.client.name.length > max ? `${row.client.name.slice(0, max - 3)}...` : row.client.name;
        return `${row.rank}. ${name}`;
      } }, tickLabels: { fontSize: 12, thin: false } } },
    },
  }), {
    theme,
    focus: "nearest",
    tooltip: {
      use: tooltip,
      content: (points: readonly ChartPoint<RankedClient>[]) => ({
        title: points[0]?.datum.client.name ?? "Top clients",
        rows: points[0] ? [
          { label: "Revenue (Contracted + Delivered)", value: formatFees(points[0].datum.revenue) },
          { label: "Trainings", value: String(points[0].datum.trainings) },
          { label: "Delivered trainings", value: String(points[0].datum.delivered) },
          { label: "System proposals", value: String(points[0].datum.systems) },
        ] : [],
      }),
    },
  });
}

export function TopClientsChart({ rows, metric, onSelect }: { rows: readonly RankedClient[]; metric: ClientRankingMetric; onSelect: (client: RankedClient) => void }) {
  const definition = useMemo(() => createTopClientsChart(rows, metric), [rows, metric]);
  return <Chart definition={definition} height={Math.max(200, rows.length * 40 + 60)} initialWidth={720}
    ariaLabel={`Top ${rows.length} clients ranked by ${clientRankingMetrics[metric].label.toLowerCase()}`}
    ariaDescription={clientRankingMetrics[metric].description}
    onSelect={(point) => { if (point) onSelect(point.datum); }} />;
}

export function FeeLegend() {
  return <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">{feeStatuses.map((status, index) => <span key={status} className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: feeColors[index] }} />{status}</span>)}</div>;
}

export function ProjectLegend() {
  return <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">{projectTypes.map((type, index) => <span key={type} className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: projectColors[index] }} />{type}</span>)}</div>;
}
