import { describe, expect, test } from "bun:test";

import {
  analyticsEnvironment,
  classifyAiError,
  emptyAiUsage,
  extractOpenRouterUsage,
} from "./usageTelemetry";

describe("DGFactory AI usage telemetry", () => {
  test("extracts OpenRouter token, cache, reasoning, and cost fields", () => {
    expect(extractOpenRouterUsage({
      usage: {
        cost: 0.0123456789,
        prompt_tokens: 120,
        completion_tokens: 45,
        total_tokens: 165,
        prompt_tokens_details: { cached_tokens: 20 },
        completion_tokens_details: { reasoning_tokens: 12 },
      },
    })).toEqual({
      costUsd: 0.0123456789,
      inputTokens: 120,
      outputTokens: 45,
      reasoningTokens: 12,
      cachedInputTokens: 20,
      totalTokens: 165,
    });
  });

  test("does not fabricate missing usage", () => {
    expect(extractOpenRouterUsage({})).toEqual(emptyAiUsage());
  });

  test("keeps only safe failure categories", () => {
    expect(classifyAiError({ status: 429, message: "private provider detail" })).toBe("RATE_LIMIT");
    expect(classifyAiError({ status: 502, message: "upstream failed" })).toBe("PROVIDER_ERROR");
    expect(classifyAiError(new Error("Schema validation failed: private output detail"))).toBe("INVALID_RESPONSE");
  });

  test("separates production from preview and local traffic", () => {
    expect(analyticsEnvironment({ VERCEL_ENV: "production", NODE_ENV: "production" } as NodeJS.ProcessEnv)).toBe("production");
    expect(analyticsEnvironment({ VERCEL_ENV: "preview", NODE_ENV: "production" } as NodeJS.ProcessEnv)).toBe("development");
    expect(analyticsEnvironment({ NODE_ENV: "development" } as NodeJS.ProcessEnv)).toBe("development");
  });
});
