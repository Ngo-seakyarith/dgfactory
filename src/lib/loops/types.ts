export const loopTypes = [
  "weekly_pipeline_review",
  "weekly_content_ideas",
  "monthly_revenue_summary",
  "quality_improvement_review",
  "delivery_readiness_check",
  "stale_opportunity_follow_up",
  "prompt_improvement_review",
  "pilot_weekly_review",
  "weekly_market_sensing",
  "weekly_offer_mutation",
  "weekly_experiment_review",
  "weekly_selection_review",
  "weekly_replication_review",
  "monthly_learning_genome_update",
  "quarterly_expansion_strategy",
] as const;

export type LoopType = (typeof loopTypes)[number];

export const loopStatuses = ["Running", "Completed", "Failed"] as const;

export type LoopStatus = (typeof loopStatuses)[number];

export type LoopRun = {
  id: string;
  loopType: LoopType;
  status: LoopStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  summary: string;
  recommendations: string[];
  createdAt: string;
  completedAt: string | null;
};

export function isLoopType(value: unknown): value is LoopType {
  return typeof value === "string" && loopTypes.includes(value as LoopType);
}

export function isLoopStatus(value: unknown): value is LoopStatus {
  return typeof value === "string" && loopStatuses.includes(value as LoopStatus);
}

export function normalizeLoopPayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function normalizeLoopRun(value: Partial<LoopRun>): LoopRun {
  const now = new Date().toISOString();

  return {
    id: value.id || crypto.randomUUID(),
    loopType: isLoopType(value.loopType)
      ? value.loopType
      : "weekly_pipeline_review",
    status: isLoopStatus(value.status) ? value.status : "Running",
    input: normalizeLoopPayload(value.input),
    output: normalizeLoopPayload(value.output),
    summary: String(value.summary ?? "").trim(),
    recommendations: Array.isArray(value.recommendations)
      ? value.recommendations.map((item) => String(item ?? "").trim()).filter(Boolean)
      : [],
    createdAt: value.createdAt || now,
    completedAt: value.completedAt ?? null,
  };
}

export function loopTypeLabel(loopType: LoopType) {
  return loopType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
