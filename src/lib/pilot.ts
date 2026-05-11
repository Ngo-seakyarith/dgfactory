import { formatCrmMoney } from "@/lib/crm";
import { listDeliveryProjects } from "@/lib/delivery-storage";
import { listOutputEvaluations, listPromptImprovementSuggestions } from "@/lib/evaluation-storage";
import { listLoopRuns } from "@/lib/loops/storage";
import { listAuditLogs } from "@/lib/audit";
import { listOpportunities } from "@/lib/crm-storage";
import { listTrainingPackages } from "@/lib/training-storage";

export const pilotIssueSeverities = ["Low", "Medium", "High", "Critical"] as const;
export type PilotIssueSeverity = (typeof pilotIssueSeverities)[number];

export const pilotIssueStatuses = ["Open", "In Review", "Fixed", "Won't Fix", "Closed"] as const;
export type PilotIssueStatus = (typeof pilotIssueStatuses)[number];

export const pilotGoalStatuses = ["On Track", "At Risk", "Completed"] as const;
export type PilotGoalStatus = (typeof pilotGoalStatuses)[number];

export const pilotUrgencies = ["Low", "Medium", "High", "Critical"] as const;
export type PilotUrgency = (typeof pilotUrgencies)[number];

export type PilotGoal = {
  id: string;
  title: string;
  targetNumber: number;
  currentNumber: number;
  status: PilotGoalStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type PilotIssue = {
  id: string;
  title: string;
  description: string;
  severity: PilotIssueSeverity;
  status: PilotIssueStatus;
  relatedPage: string;
  relatedPackageId: string | null;
  relatedOpportunityId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PilotFeedback = {
  id: string;
  rating: number;
  whatWorked: string;
  whatWasConfusing: string;
  whatShouldImprove: string;
  urgency: PilotUrgency;
  relatedFeature: string;
  relatedPage: string;
  relatedPackageId: string | null;
  relatedOpportunityId: string | null;
  createdBy: string;
  createdAt: string;
};

export const pilotStartDate = "2026-05-05";
export const pilotEndDate = "2026-06-04";

export const defaultPilotGoalInputs: Array<Pick<PilotGoal, "title" | "targetNumber" | "notes">> = [
  { title: "Create 5 real training packages", targetNumber: 5, notes: "Use real DG Academy proposal ideas." },
  { title: "Export 3 client-ready proposals", targetNumber: 3, notes: "Count proposal DOCX/PDF exports." },
  { title: "Create 3 pricing plans", targetNumber: 3, notes: "Count packages with calculated pricing outputs." },
  { title: "Create 1 delivery project", targetNumber: 1, notes: "Use a won or pilot opportunity." },
  { title: "Run 5 QA reviews", targetNumber: 5, notes: "Count AI QA or saved output evaluations." },
  { title: "Collect 5 user feedback records", targetNumber: 5, notes: "Use Give Feedback across real pages." },
  { title: "Run 2 OpenClaw business loops", targetNumber: 2, notes: "Count loop runs including pilot weekly review." },
  { title: "Identify 10 improvement opportunities", targetNumber: 10, notes: "Count issues plus prompt/product suggestions." },
];

function isPilotIssueSeverity(value: unknown): value is PilotIssueSeverity {
  return typeof value === "string" && pilotIssueSeverities.includes(value as PilotIssueSeverity);
}

function isPilotIssueStatus(value: unknown): value is PilotIssueStatus {
  return typeof value === "string" && pilotIssueStatuses.includes(value as PilotIssueStatus);
}

function isPilotGoalStatus(value: unknown): value is PilotGoalStatus {
  return typeof value === "string" && pilotGoalStatuses.includes(value as PilotGoalStatus);
}

function isPilotUrgency(value: unknown): value is PilotUrgency {
  return typeof value === "string" && pilotUrgencies.includes(value as PilotUrgency);
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function calculatePilotGoalStatus(currentNumber: number, targetNumber: number): PilotGoalStatus {
  if (targetNumber > 0 && currentNumber >= targetNumber) {
    return "Completed";
  }

  return currentNumber > 0 ? "On Track" : "At Risk";
}

export function normalizePilotGoal(value: Partial<PilotGoal>): PilotGoal {
  const now = new Date().toISOString();
  const targetNumber = Math.max(0, numberValue(value.targetNumber));
  const currentNumber = Math.max(0, numberValue(value.currentNumber));

  return {
    id: value.id || crypto.randomUUID(),
    title: String(value.title ?? "").trim(),
    targetNumber,
    currentNumber,
    status: isPilotGoalStatus(value.status)
      ? value.status
      : calculatePilotGoalStatus(currentNumber, targetNumber),
    notes: String(value.notes ?? "").trim(),
    createdAt: value.createdAt || now,
    updatedAt: value.updatedAt || now,
  };
}

export function normalizePilotIssue(value: Partial<PilotIssue>): PilotIssue {
  const now = new Date().toISOString();

  return {
    id: value.id || crypto.randomUUID(),
    title: String(value.title ?? "").trim(),
    description: String(value.description ?? "").trim(),
    severity: isPilotIssueSeverity(value.severity) ? value.severity : "Medium",
    status: isPilotIssueStatus(value.status) ? value.status : "Open",
    relatedPage: String(value.relatedPage ?? "").trim(),
    relatedPackageId: value.relatedPackageId || null,
    relatedOpportunityId: value.relatedOpportunityId || null,
    createdBy: String(value.createdBy ?? "").trim(),
    createdAt: value.createdAt || now,
    updatedAt: value.updatedAt || now,
  };
}

export function normalizePilotFeedback(value: Partial<PilotFeedback>): PilotFeedback {
  return {
    id: value.id || crypto.randomUUID(),
    rating: Math.max(1, Math.min(5, Math.round(numberValue(value.rating, 3)))),
    whatWorked: String(value.whatWorked ?? "").trim(),
    whatWasConfusing: String(value.whatWasConfusing ?? "").trim(),
    whatShouldImprove: String(value.whatShouldImprove ?? "").trim(),
    urgency: isPilotUrgency(value.urgency) ? value.urgency : "Medium",
    relatedFeature: String(value.relatedFeature ?? "").trim(),
    relatedPage: String(value.relatedPage ?? "").trim(),
    relatedPackageId: value.relatedPackageId || null,
    relatedOpportunityId: value.relatedOpportunityId || null,
    createdBy: String(value.createdBy ?? "").trim(),
    createdAt: value.createdAt || new Date().toISOString(),
  };
}

export async function calculatePilotMetrics({
  goals,
  issues,
  feedback,
}: {
  goals: PilotGoal[];
  issues: PilotIssue[];
  feedback: PilotFeedback[];
}) {
  const [packages, opportunities, deliveryProjects, evaluations, suggestions, loops, audits] =
    await Promise.all([
      listTrainingPackages(),
      listOpportunities(),
      listDeliveryProjects(),
      listOutputEvaluations(),
      listPromptImprovementSuggestions(),
      listLoopRuns(),
      listAuditLogs(500),
    ]);
  const proposalExports = audits.filter(
    (log) => log.action === "package_export" && log.metadata.target === "proposal",
  );
  const qaReviews = evaluations.filter(
    (evaluation) => evaluation.reviewerType === "AI_QA" || evaluation.outputType === "full_package",
  );
  const averageQaScore = qaReviews.length
    ? Math.round(qaReviews.reduce((total, item) => total + item.score, 0) / qaReviews.length)
    : 0;
  const pricingPlans = packages.filter((pkg) => pkg.pricingOutputs).length;
  const loopRuns = loops.filter((loop) => loop.status === "Completed").length;
  const improvementCount = issues.length + suggestions.length;

  const currentByGoal = new Map<string, number>([
    ["Create 5 real training packages", packages.length],
    ["Export 3 client-ready proposals", proposalExports.length],
    ["Create 3 pricing plans", pricingPlans],
    ["Create 1 delivery project", deliveryProjects.length],
    ["Run 5 QA reviews", qaReviews.length],
    ["Collect 5 user feedback records", feedback.length],
    ["Run 2 OpenClaw business loops", loopRuns],
    ["Identify 10 improvement opportunities", improvementCount],
  ]);

  return {
    pilotStartDate,
    pilotEndDate,
    pilotGoals: goals.map((goal) => {
      const currentNumber = currentByGoal.get(goal.title) ?? goal.currentNumber;
      return {
        ...goal,
        currentNumber,
        status: calculatePilotGoalStatus(currentNumber, goal.targetNumber),
      };
    }),
    packagesCreated: packages.length,
    proposalsExported: proposalExports.length,
    opportunitiesCreated: opportunities.length,
    deliveryProjectsCreated: deliveryProjects.length,
    qaReviewsCompleted: qaReviews.length,
    averageQaScore,
    feedbackRecordsSubmitted: feedback.length,
    issuesReported: issues.length,
    improvementSuggestions: improvementCount,
    completedLoops: loopRuns,
    estimatedPipelineValue: opportunities.reduce((total, item) => total + item.estimatedValue, 0),
    estimatedPipelineValueFormatted: formatCrmMoney(opportunities.reduce((total, item) => total + item.estimatedValue, 0)),
    topIssues: [...issues]
      .sort((a, b) => pilotIssueSeverities.indexOf(b.severity) - pilotIssueSeverities.indexOf(a.severity))
      .slice(0, 5),
    topFeedback: [...feedback].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    recentLoops: loops.slice(0, 5),
  };
}

export function buildPilotReport({
  metrics,
}: {
  metrics: Awaited<ReturnType<typeof calculatePilotMetrics>>;
}) {
  const blockedGoals = metrics.pilotGoals.filter((goal) => goal.status === "At Risk");
  const criticalIssues = metrics.topIssues.filter((issue) => issue.severity === "Critical");
  const goNoGo =
    criticalIssues.length > 0 || blockedGoals.length > 4
      ? "No-go for wider deployment until critical blockers are fixed."
      : blockedGoals.length > 1
        ? "Conditional go: continue pilot and fix priority gaps before wider rollout."
        : "Go: ready to expand carefully with support and continued measurement.";

  return [
    "# DG Academy Factory Pilot Report",
    "",
    `Pilot period: ${metrics.pilotStartDate} to ${metrics.pilotEndDate}`,
    "",
    "## Pilot Summary",
    `The internal pilot created ${metrics.packagesCreated} packages, exported ${metrics.proposalsExported} client-ready proposals, opened ${metrics.opportunitiesCreated} opportunities, and captured ${metrics.feedbackRecordsSubmitted} feedback records.`,
    "",
    "## Goal Progress",
    ...metrics.pilotGoals.map(
      (goal) => `- ${goal.title}: ${goal.currentNumber}/${goal.targetNumber} (${goal.status})`,
    ),
    "",
    "## Usage Metrics",
    `- Packages created: ${metrics.packagesCreated}`,
    `- Proposals exported: ${metrics.proposalsExported}`,
    `- Opportunities created: ${metrics.opportunitiesCreated}`,
    `- Delivery projects created: ${metrics.deliveryProjectsCreated}`,
    `- QA reviews completed: ${metrics.qaReviewsCompleted}`,
    `- Average QA score: ${metrics.averageQaScore}`,
    `- Feedback records submitted: ${metrics.feedbackRecordsSubmitted}`,
    `- Issues reported: ${metrics.issuesReported}`,
    `- Improvement suggestions: ${metrics.improvementSuggestions}`,
    "",
    "## Top Issues",
    ...(metrics.topIssues.length
      ? metrics.topIssues.map((issue) => `- [${issue.severity}] ${issue.title}: ${issue.status}`)
      : ["- No pilot issues reported yet."]),
    "",
    "## Top User Feedback",
    ...(metrics.topFeedback.length
      ? metrics.topFeedback.map((item) => `- ${item.relatedFeature || "General"} (${item.rating}/5): ${item.whatShouldImprove || item.whatWorked}`)
      : ["- No user feedback submitted yet."]),
    "",
    "## Business Value Observed",
    `- Pipeline value tracked: ${metrics.estimatedPipelineValueFormatted}`,
    "- Faster proposal drafting and export readiness can be measured through proposal export count.",
    "- QA and feedback records create a practical improvement backlog for Codex and DG Academy.",
    "",
    "## Recommended Next Build Priorities",
    "- Fix high-severity pilot issues first.",
    "- Improve sections with repeated user confusion.",
    "- Convert approved pilot improvements into small Codex tasks.",
    "- Tighten Supabase persistence and auth before wider team rollout.",
    "",
    "## Go / No-Go Recommendation",
    goNoGo,
  ].join("\n");
}
