import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AiUsage = {
  costUsd: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  cachedInputTokens: number | null;
  totalTokens: number | null;
};

type AiUsageEvent = {
  operationId: string;
  feature: string;
  modelId: string;
  provider: string;
  status: "SUCCESS" | "ERROR";
  attemptNumber: number;
  usage: AiUsage;
  latencyMs: number;
  errorType?: string;
  startedAt: Date;
  completedAt: Date;
};

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function emptyAiUsage(): AiUsage {
  return {
    costUsd: null,
    inputTokens: null,
    outputTokens: null,
    reasoningTokens: null,
    cachedInputTokens: null,
    totalTokens: null,
  };
}

export function extractOpenRouterUsage(completion: unknown): AiUsage {
  const response = completion as {
    usage?: {
      cost?: unknown;
      prompt_tokens?: unknown;
      completion_tokens?: unknown;
      total_tokens?: unknown;
      prompt_tokens_details?: { cached_tokens?: unknown };
      completion_tokens_details?: { reasoning_tokens?: unknown };
    };
  };
  const usage = response?.usage;
  return {
    costUsd: optionalNumber(usage?.cost),
    inputTokens: optionalNumber(usage?.prompt_tokens),
    outputTokens: optionalNumber(usage?.completion_tokens),
    reasoningTokens: optionalNumber(usage?.completion_tokens_details?.reasoning_tokens),
    cachedInputTokens: optionalNumber(usage?.prompt_tokens_details?.cached_tokens),
    totalTokens: optionalNumber(usage?.total_tokens),
  };
}

export function analyticsEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): "production" | "development" {
  return env.VERCEL_ENV === "production" ||
    (!env.VERCEL_ENV && env.NODE_ENV === "production")
    ? "production"
    : "development";
}

export function classifyAiError(error: unknown) {
  const candidate = error as {
    status?: number;
    statusCode?: number;
    name?: string;
    message?: string;
    cause?: { status?: number; message?: string };
  };
  const status = candidate?.status ?? candidate?.statusCode ?? candidate?.cause?.status;
  const detail = `${candidate?.name ?? ""} ${candidate?.message ?? ""} ${candidate?.cause?.message ?? ""}`.toLowerCase();
  if (detail.includes("openrouter_api_key")) return "CONFIGURATION";
  if (status === 401 || status === 403) return "AUTHENTICATION";
  if (status === 408 || detail.includes("timeout")) return "TIMEOUT";
  if (status === 429 || detail.includes("rate limit")) return "RATE_LIMIT";
  if (detail.includes("schema validation") || detail.includes("json") || detail.includes("empty")) {
    return "INVALID_RESPONSE";
  }
  if (typeof status === "number" && status >= 500) return "PROVIDER_ERROR";
  if (detail.includes("network") || detail.includes("fetch")) return "NETWORK_ERROR";
  return "UNKNOWN";
}

export async function recordAiUsageEvent(event: AiUsageEvent) {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) return;
    const { error } = await supabase.from("ai_usage_events").insert({
      operation_id: event.operationId,
      feature: event.feature,
      environment: analyticsEnvironment(),
      model_id: event.modelId.slice(0, 200),
      provider: event.provider.slice(0, 120),
      status: event.status,
      attempt_number: event.attemptNumber,
      input_tokens: event.usage.inputTokens,
      output_tokens: event.usage.outputTokens,
      reasoning_tokens: event.usage.reasoningTokens,
      cached_input_tokens: event.usage.cachedInputTokens,
      total_tokens: event.usage.totalTokens,
      cost_usd: event.usage.costUsd === null ? null : String(event.usage.costUsd),
      latency_ms: Math.max(0, event.latencyMs),
      error_type: event.errorType?.slice(0, 64) ?? null,
      started_at: event.startedAt.toISOString(),
      completed_at: event.completedAt.toISOString(),
    });
    if (error) throw new Error(error.message);
  } catch (error) {
    // Telemetry is best-effort and must never break a DGFactory generation.
    console.warn(
      "AI usage event was not recorded",
      error instanceof Error ? error.name : "UnknownError",
    );
  }
}
