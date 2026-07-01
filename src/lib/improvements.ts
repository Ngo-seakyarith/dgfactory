export const improvementSourceTypes = [
  "User Feedback",
  "Pilot Issue",
  "QA Review",
  "Failed Export",
  "Failed Offer",
  "Winning Offer",
  "Business Loop",
  "Learning Genome",
  "Eval Failure",
  "Other",
] as const;

export const improvementCategories = [
  "Product Feature",
  "Bug Fix",
  "Prompt Improvement",
  "Template Improvement",
  "Agent Improvement",
  "UX Improvement",
  "Business Model Improvement",
  "Documentation",
  "Other",
] as const;

export const improvementStatuses = [
  "Suggested",
  "Approved",
  "Sent to Codex",
  "Implemented",
  "Rejected",
] as const;

export type ImprovementSourceType = (typeof improvementSourceTypes)[number];
export type ImprovementCategory = (typeof improvementCategories)[number];
export type ImprovementStatus = (typeof improvementStatuses)[number];

export type ImprovementOpportunity = {
  id: string;
  sourceType: ImprovementSourceType;
  sourceId: string | null;
  title: string;
  description: string;
  category: ImprovementCategory;
  priority: number;
  status: ImprovementStatus;
  recommendedAction: string;
  codexPrompt: string;
  suggestedFiles: string[];
  acceptanceCriteria: string[];
  createdAt: string;
  updatedAt: string;
};

function isOneOf<T extends readonly string[]>(options: T, value: unknown): value is T[number] {
  return typeof value === "string" && options.includes(value);
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeNumber(value: unknown, defaultValue = 3) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(5, Math.round(parsed))) : defaultValue;
}

function normalizeList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function normalizeImprovementOpportunity(
  value: Partial<ImprovementOpportunity>,
): ImprovementOpportunity {
  const now = new Date().toISOString();

  return {
    id: value.id || crypto.randomUUID(),
    sourceType: isOneOf(improvementSourceTypes, value.sourceType)
      ? value.sourceType
      : "Other",
    sourceId: value.sourceId || null,
    title: normalizeText(value.title),
    description: normalizeText(value.description),
    category: isOneOf(improvementCategories, value.category)
      ? value.category
      : "Other",
    priority: normalizeNumber(value.priority),
    status: isOneOf(improvementStatuses, value.status) ? value.status : "Suggested",
    recommendedAction: normalizeText(value.recommendedAction),
    codexPrompt: normalizeText(value.codexPrompt),
    suggestedFiles: normalizeList(value.suggestedFiles),
    acceptanceCriteria: normalizeList(value.acceptanceCriteria),
    createdAt: value.createdAt || now,
    updatedAt: value.updatedAt || now,
  };
}

export function buildCodexPrompt(opportunity: ImprovementOpportunity) {
  if (opportunity.codexPrompt.trim()) {
    return opportunity.codexPrompt;
  }

  return [
    "Continue building DG Academy AI Training Production Factory.",
    "",
    `Improvement: ${opportunity.title}`,
    `Source: ${opportunity.sourceType}`,
    `Category: ${opportunity.category}`,
    `Priority: ${opportunity.priority}`,
    "",
    "Context:",
    opportunity.description,
    "",
    "Goal:",
    opportunity.recommendedAction || "Implement one small, safe improvement.",
    "",
    "Suggested files/modules:",
    ...(opportunity.suggestedFiles.length
      ? opportunity.suggestedFiles.map((file) => `- ${file}`)
      : ["- Inspect relevant app, API, lib, and docs files first."]),
    "",
    "Acceptance criteria:",
    ...(opportunity.acceptanceCriteria.length
      ? opportunity.acceptanceCriteria.map((item) => `- ${item}`)
      : ["- The change works locally.", "- Lint, typecheck, and build pass."]),
    "",
    "Safety constraints:",
    "- Do not send external messages.",
    "- Do not deploy.",
    "- Do not delete production data.",
    "- Do not expose internal margin, prompt templates, private knowledge, or client data.",
    "- Require real configured services for production behavior.",
  ].join("\n");
}
