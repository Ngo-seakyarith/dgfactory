"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Select } from "@/components/ui/select";
import { clientRankingMetrics, formatFees, rankClients, type ClientPerformance, type ClientRankingMetric } from "../domain";
import { TopClientsChart } from "./dashboard-charts";

export function TopClients({ rows }: { rows: readonly ClientPerformance[] }) {
  const [metric, setMetric] = useState<ClientRankingMetric>("revenue");
  const [limit, setLimit] = useState(5);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const ranked = useMemo(() => rankClients(rows, metric, limit), [rows, metric, limit]);
  const selected = ranked.find((row) => row.id === selectedId);
  const settings = clientRankingMetrics[metric];
  const countLabel = metric === "trainings" ? "training" : metric === "delivered" ? "delivered training" : "system proposal";

  return <div className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 id="top-clients" className="text-lg font-semibold">Top clients</h2><p className="mt-1 text-sm text-muted-foreground">{settings.description}</p></div>
      <div className="flex max-w-full flex-wrap items-center gap-3">
        <div className="flex items-center gap-2"><label htmlFor="client-ranking-metric" className="text-sm text-muted-foreground">Rank by</label><Select id="client-ranking-metric" value={metric} className="w-48 max-w-full" onChange={(event) => { setMetric(event.target.value as ClientRankingMetric); setSelectedId(null); }}>{Object.entries(clientRankingMetrics).map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}</Select></div>
        <div className="flex items-center gap-2"><label htmlFor="client-ranking-limit" className="text-sm text-muted-foreground">Show</label><Select id="client-ranking-limit" value={limit} className="w-24" onChange={(event) => setLimit(Number(event.target.value))}>{[5, 10, 20].map((value) => <option key={value} value={value}>Top {value}</option>)}</Select></div>
      </div>
    </div>
    {ranked.length ? <>
      <div className="min-w-0 border-y border-border bg-white py-3"><TopClientsChart rows={ranked} metric={metric} onSelect={(row) => setSelectedId(row.id)} /></div>
      {selected ? <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-sm" aria-live="polite"><Link href={`/pipeline?clientId=${selected.id}`} className="inline-flex min-w-0 items-center gap-2 font-medium hover:text-primary"><span className="break-words">{selected.client.name}</span><ArrowRight className="h-4 w-4 shrink-0" /></Link><span className="shrink-0 tabular-nums text-muted-foreground">{metric === "revenue" ? formatFees(selected.value) : `${selected.value} ${countLabel}${selected.value === 1 ? "" : "s"}`}</span></div> : null}
    </> : <p className="flex min-h-48 items-center justify-center border-y border-border px-4 text-center text-sm text-muted-foreground">{metric === "revenue" ? "No Confirmed or Delivered training fees for these clients." : `No ${settings.label.toLowerCase()} for these clients.`}</p>}
  </div>;
}
