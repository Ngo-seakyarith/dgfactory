import type { Client } from "@/features/crm/domain";
import { proposalStages } from "@/features/pipeline/domain";
import { projectTypes, type ClientProject } from "@/features/pipeline/project-domain";
import type { TrainingPackage } from "@/features/training-packages/domain/training-package";

export const feeStatuses = ["Delivered", "Contracted"] as const;
export type FeeStatus = (typeof feeStatuses)[number];

export type TrainingFee = {
  package: TrainingPackage;
  project: ClientProject | null;
  status: FeeStatus;
  paymentReceivedDate: string | null;
  fee: number;
};

export type DashboardOwnerFilter = "all" | "unassigned" | `owner:${string}`;
const ownerKey = (owner: string) => owner.trim().toLowerCase();

export function dashboardOwnerOptions(clients: readonly Client[]) {
  const owners = new Map<string, string>();
  for (const client of clients) {
    const key = ownerKey(client.accountOwner);
    if (key && !owners.has(key)) owners.set(key, client.accountOwner.trim());
  }
  return [...owners].map(([key, label]) => ({ value: `owner:${key}` as const, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function filterDashboardByOwner(trainings: readonly TrainingFee[], projects: readonly ClientProject[], clients: readonly Client[], owner: DashboardOwnerFilter) {
  if (owner === "all") return { trainings, projects };
  const owners = new Map(clients.map((client) => [client.id, ownerKey(client.accountOwner)]));
  const matches = (clientId: string | null | undefined) => {
    const key = clientId ? owners.get(clientId) ?? "" : "";
    return owner === "unassigned" ? !key : `owner:${key}` === owner;
  };
  return {
    projects: projects.filter((project) => matches(project.clientId)),
    trainings: trainings.filter((training) => matches(training.package.clientId)),
  };
}

export type MonthlyTrainingFees = {
  id: string;
  month: string;
  monthIndex: number;
  year: number;
  status: FeeStatus;
  fee: number;
  trainings: TrainingFee[];
};

export function normalizePaymentReceivedDate(value: string): string | null {
  const date = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : null;
}

export function collectTrainingFees(packages: readonly TrainingPackage[], projects: readonly ClientProject[]): TrainingFee[] {
  const projectByPackage = new Map(projects.filter((project) => project.trainingPackageId).map((project) => [project.trainingPackageId, project]));
  return packages.flatMap((pkg): TrainingFee[] => {
    if (pkg.status !== "Generated" || (pkg.salesStatus !== "Delivered" && pkg.salesStatus !== "Contracted")) return [];
    const project = projectByPackage.get(pkg.id) ?? null;
    const fee = pkg.pricingInputs.professionalFee;
    if (!Number.isFinite(fee) || fee < 0) return [];
    return [{
      package: pkg, project, status: pkg.salesStatus, fee,
      paymentReceivedDate: normalizePaymentReceivedDate(project?.paymentReceivedDate ?? ""),
    }];
  });
}

const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

export function monthlyTrainingFees(trainings: readonly TrainingFee[], year: number): MonthlyTrainingFees[] {
  const rows = Array.from({ length: 12 }, (_, monthIndex) => feeStatuses.map((status) => ({
    id: `${year}-${monthIndex + 1}-${status}`,
    month: monthFormatter.format(new Date(Date.UTC(year, monthIndex, 1))),
    monthIndex, year, status, fee: 0, trainings: [] as TrainingFee[],
  }))).flat();
  const byMonth = new Map(rows.map((row) => [row.id, row]));
  for (const training of trainings) {
    if (!training.paymentReceivedDate || Number(training.paymentReceivedDate.slice(0, 4)) !== year) continue;
    const monthIndex = Number(training.paymentReceivedDate.slice(5, 7)) - 1;
    const row = byMonth.get(`${year}-${monthIndex + 1}-${training.status}`)!;
    row.fee += training.fee;
    row.trainings.push(training);
  }
  return rows;
}

export function projectStageCounts(projects: readonly ClientProject[]) {
  return proposalStages.flatMap((stage) => projectTypes.map((type) => {
    const source = projects.filter((project) => project.stage === stage && project.projectType === type);
    return { id: `${stage}-${type}`, stage, type, count: source.length, projects: source };
  }));
}

export function feeTotal(trainings: readonly TrainingFee[], status?: FeeStatus) {
  return trainings.reduce((total, training) => total + (!status || training.status === status ? training.fee : 0), 0);
}

export const clientRankingMetrics = {
  revenue: { label: "Revenue", description: "Contracted + Delivered training fees - all time", color: "#17776b" },
  trainings: { label: "Number of trainings", description: "Training records across all stages - all time", color: "#326ca6" },
  delivered: { label: "Delivered trainings", description: "Delivered training records - all time", color: "#b77912" },
  systems: { label: "System proposals", description: "Intelligent system records across all stages - all time", color: "#9c6490" },
} as const;
export type ClientRankingMetric = keyof typeof clientRankingMetrics;

export type ClientPerformance = {
  id: string;
  client: Client;
  revenue: number;
  trainings: number;
  delivered: number;
  systems: number;
  projects: ClientProject[];
  fees: TrainingFee[];
};

export function clientPerformance(trainings: readonly TrainingFee[], projects: readonly ClientProject[], clients: readonly Client[]): ClientPerformance[] {
  const rows = new Map(clients.map((client) => [client.id, {
    id: client.id, client, revenue: 0, trainings: 0, delivered: 0, systems: 0,
    projects: [] as ClientProject[], fees: [] as TrainingFee[],
  }]));
  for (const project of projects) {
    const row = project.clientId ? rows.get(project.clientId) : undefined;
    if (!row) continue;
    row.projects.push(project);
    if (project.projectType === "Training") {
      row.trainings++;
      if (project.stage === "Delivered") row.delivered++;
    } else if (project.projectType === "Intelligent System") row.systems++;
  }
  for (const fee of trainings) {
    const row = fee.package.clientId ? rows.get(fee.package.clientId) : undefined;
    if (!row) continue;
    row.fees.push(fee);
    row.revenue += fee.fee;
  }
  return [...rows.values()];
}

export type RankedClient = ClientPerformance & { value: number; rank: number };

export function rankClients(rows: readonly ClientPerformance[], metric: ClientRankingMetric, limit: number): RankedClient[] {
  return rows.filter((row) => row[metric] > 0)
    .sort((a, b) => b[metric] - a[metric] || a.client.name.localeCompare(b.client.name, "en", { sensitivity: "base", numeric: true }) || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((row, index) => ({ ...row, value: row[metric], rank: index + 1 }));
}

export const formatFees = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
