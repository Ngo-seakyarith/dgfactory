import type { Client } from "@/features/crm/domain";
import { proposalStages } from "@/features/pipeline/domain";
import { projectTypes, type ClientProject } from "@/features/pipeline/project-domain";
import type { TrainingPackage } from "@/features/training-packages/domain/training-package";

export const feeStatuses = ["Delivered", "Confirmed"] as const;
export type FeeStatus = (typeof feeStatuses)[number];

export type TrainingFee = {
  id: string;
  title: string;
  clientId: string | null;
  client: string;
  href: string;
  amountLabel: "Actual" | "Proposal fee";
  package: TrainingPackage | null;
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
    trainings: trainings.filter((training) => matches(training.clientId)),
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

const validAmount = (value: number | null | undefined) => value != null && Number.isFinite(value) && value >= 0 ? value : null;

export function collectTrainingFees(packages: readonly TrainingPackage[], projects: readonly ClientProject[]): TrainingFee[] {
  const packageById = new Map(packages.map((pkg) => [pkg.id, pkg]));
  const linkedPackages = new Set(projects.flatMap((project) => project.trainingPackageId ? [project.trainingPackageId] : []));
  const fees: TrainingFee[] = [];
  for (const project of projects) {
    if (project.projectType !== "Training" || (project.stage !== "Delivered" && project.stage !== "Confirmed")) continue;
    const pkg = project.trainingPackageId ? packageById.get(project.trainingPackageId) ?? null : null;
    const actual = validAmount(project.actualValue);
    const fee = actual ?? (pkg?.status === "Generated" ? validAmount(pkg.pricingInputs.professionalFee) : null);
    if (fee === null) continue;
    fees.push({
      id: project.id, title: project.title, clientId: project.clientId, client: project.clientName,
      href: `/pipeline?projectId=${project.id}`, amountLabel: actual !== null ? "Actual" : "Proposal fee",
      package: pkg, project, status: project.stage, fee,
      paymentReceivedDate: normalizePaymentReceivedDate(project.paymentReceivedDate ?? ""),
    });
  }
  // Unlinked proposals remain visible, but a linked training is counted only through its Pipeline row.
  for (const pkg of packages) {
    if (linkedPackages.has(pkg.id) || pkg.status !== "Generated" || (pkg.salesStatus !== "Delivered" && pkg.salesStatus !== "Confirmed")) continue;
    const fee = validAmount(pkg.pricingInputs.professionalFee);
    if (fee === null) continue;
    fees.push({
      id: pkg.id, title: pkg.title, clientId: pkg.clientId, client: pkg.client,
      href: `/packages/${pkg.id}`, amountLabel: "Proposal fee",
      package: pkg, project: null, status: pkg.salesStatus, fee, paymentReceivedDate: null,
    });
  }
  return fees;
}

export type TrainingPaymentReminder = {
  id: string;
  title: string;
  client: string;
  status: FeeStatus;
  href: string;
  amount: number | null;
  amountLabel: "Proposal fee" | "Actual" | "Value" | null;
};

export function collectTrainingPaymentReminders(trainings: readonly TrainingFee[], projects: readonly ClientProject[]): TrainingPaymentReminder[] {
  const feeByProject = new Map(trainings.flatMap((training) => training.project ? [[training.project.id, training] as const] : []));
  const reminders: TrainingPaymentReminder[] = [];

  for (const project of projects) {
    if (project.projectType !== "Training" || (project.stage !== "Confirmed" && project.stage !== "Delivered")) continue;
    if (normalizePaymentReceivedDate(project.paymentReceivedDate ?? "")) continue;
    const training = feeByProject.get(project.id);
    const actual = validAmount(project.actualValue);
    const target = validAmount(project.targetValue);
    reminders.push({
      id: project.id, title: project.title, client: project.clientName, status: project.stage,
      href: `/pipeline?projectId=${project.id}`,
      amount: training?.fee ?? actual ?? target,
      amountLabel: training?.amountLabel ?? (actual !== null ? "Actual" : target !== null ? "Value" : null),
    });
  }

  for (const training of trainings) {
    if (training.project || training.paymentReceivedDate) continue;
    reminders.push({
      id: training.id, title: training.title, client: training.client, status: training.status,
      href: training.href, amount: training.fee, amountLabel: training.amountLabel,
    });
  }
  return reminders;
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
  revenue: { label: "Revenue", description: "Confirmed + Delivered training fees - all time", color: "#17776b" },
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
    const row = fee.clientId ? rows.get(fee.clientId) : undefined;
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
