import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { OpenRouter } from "@openrouter/sdk";
import { HTTPClient } from "@openrouter/sdk/lib/http";
import { OpenRouterError } from "@openrouter/sdk/models/errors";
import { z } from "zod";

import type { BrainAgentDefinition } from "@/lib/brain/agents";
import { brainModel, brainReasoningEffort } from "./modelConfig";
import * as clientModule from "./openRouterClient";
import { generateStructuredOutput, getBrainModelStatus } from "./structuredOutput";
import * as telemetry from "./usageTelemetry";

const outputSchema = z.object({ summary: z.string().min(1) }).strict();
const agent: BrainAgentDefinition<{ topic: string }, z.infer<typeof outputSchema>> = {
  taskType: "follow_up",
  name: "sdkMigrationTest",
  role: "Test writer",
  instructions: "Summarize the supplied topic.",
  inputSchema: { type: "object" },
  outputSchema,
};

function completion(content: string | null = '{"summary":"Ready"}') {
  return {
    id: "gen-sdk-test",
    created: 1,
    model: brainModel,
    object: "chat.completion",
    system_fingerprint: null,
    choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content } }],
    usage: {
      prompt_tokens: 120,
      completion_tokens: 45,
      total_tokens: 165,
      cost: 0.0123,
      prompt_tokens_details: { cached_tokens: 20 },
      completion_tokens_details: { reasoning_tokens: 12 },
    },
    openrouter_metadata: {
      attempt: 1,
      is_byok: false,
      endpoints: {
        total: 1,
        available: [{ model: brainModel, provider: "OpenAI", selected: true }],
      },
      region: null,
      requested: brainModel,
      strategy: "direct",
      summary: "Selected OpenAI",
    },
  };
}

describe("native OpenRouter structured generation", () => {
  let requests: Request[];
  let responses: Response[];
  let usageEvents: ReturnType<typeof spyOn<typeof telemetry, "recordAiUsageEvent">>;

  beforeEach(() => {
    requests = [];
    responses = [Response.json(completion())];
    const client = new OpenRouter({
      apiKey: "test-key-not-a-secret",
      httpReferer: "https://example.test",
      appTitle: "DG Academy Training Production Factory",
      retryConfig: { strategy: "none" },
      httpClient: new HTTPClient({
        fetcher: async (input, init) => {
          const request = input instanceof Request ? input : new Request(input, init);
          requests.push(request);
          const response = responses.shift();
          if (!response) throw new Error("Unexpected additional model request");
          return response;
        },
      }),
    });
    spyOn(clientModule, "getOpenRouterClient").mockReturnValue(client);
    usageEvents = spyOn(telemetry, "recordAiUsageEvent").mockResolvedValue(undefined);
  });

  afterEach(() => mock.restore());

  test("serializes strict schema, prompts, reasoning, and attribution through the SDK", async () => {
    const result = await generateStructuredOutput({ agent, input: { topic: "Sales" } });
    expect(result).toEqual({ output: { summary: "Ready" }, mode: "openai", model: "openai/gpt-6-sol" });
    expect(requests).toHaveLength(1);
    const request = requests[0]!;
    expect(request.url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(request.headers.get("HTTP-Referer")).toBe("https://example.test");
    expect(request.headers.get("X-OpenRouter-Title")).toBe("DG Academy Training Production Factory");
    expect(request.headers.get("X-OpenRouter-Metadata")).toBe("enabled");
    const body = await request.json();
    expect(body.model).toBe("openai/gpt-6-sol");
    expect(body.stream).toBe(false);
    expect(body.reasoning).toEqual({ effort: brainReasoningEffort });
    expect(body.provider).toEqual({ require_parameters: true });
    expect(body.response_format).toMatchObject({
      type: "json_schema",
      json_schema: {
        name: "dg_brain_output",
        strict: true,
        schema: { type: "object", required: ["summary"], additionalProperties: false },
      },
    });
    expect(body.messages[0].content).toContain(agent.instructions);
    expect(JSON.parse(body.messages[1].content)).toEqual({ topic: "Sales" });
    expect(usageEvents).toHaveBeenCalledWith(expect.objectContaining({
      provider: "OpenAI",
      modelId: brainModel,
      status: "SUCCESS",
      attemptNumber: 1,
      usage: {
        costUsd: 0.0123,
        inputTokens: 120,
        outputTokens: 45,
        totalTokens: 165,
        cachedInputTokens: 20,
        reasoningTokens: 12,
      },
    }));
  });

  for (const status of [400, 401, 402, 403, 404, 422]) {
    test(`does not retry permanent HTTP ${status} errors`, async () => {
      responses = [Response.json({ error: { code: status, message: "Request rejected" } }, { status })];
      await expect(generateStructuredOutput({ agent, input: { topic: "Sales" } }))
        .rejects.toThrow(`OpenRouter request failed (${status}): Request rejected`);
      expect(requests).toHaveLength(1);
      expect(usageEvents).toHaveBeenCalledTimes(1);
    });
  }

  for (const status of [408, 409, 429, 500, 502, 503]) {
    test(`retries HTTP ${status} once and records both attempts`, async () => {
      responses = [
        Response.json({ error: { code: status, message: "Temporary failure" } }, { status }),
        Response.json(completion()),
      ];
      await generateStructuredOutput({ agent, input: { topic: "Sales" } });
      expect(requests).toHaveLength(2);
      expect(usageEvents.mock.calls.map(([event]) => [event.status, event.attemptNumber]))
        .toEqual([["ERROR", 1], ["SUCCESS", 2]]);
      expect(getBrainModelStatus().lastError).toBeNull();
    });
  }

  test("surfaces upstream provider details without losing the native error cause", async () => {
    responses = [Response.json({
      error: {
        code: 400,
        message: "Provider rejected request",
        metadata: {
          error_type: "invalid_request_error",
          provider_code: "unsupported_parameter",
          raw: JSON.stringify({ error: { message: "Unsupported response schema" } }),
        },
      },
    }, { status: 400 })];
    const error = await generateStructuredOutput({ agent, input: { topic: "Sales" } })
      .catch((failure: unknown) => failure);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(
      "OpenRouter request failed (400 invalid_request_error/unsupported_parameter): Unsupported response schema",
    );
    expect((error as Error).cause).toBeInstanceOf(OpenRouterError);
  });

  for (const content of ["not JSON", '{"summary":""}', null]) {
    test(`retries invalid structured content: ${String(content)}`, async () => {
      responses = [Response.json(completion(content)), Response.json(completion())];
      await generateStructuredOutput({ agent, input: { topic: "Sales" } });
      expect(requests).toHaveLength(2);
      expect(usageEvents.mock.calls[0]?.[0]).toMatchObject({
        status: "ERROR",
        errorType: "INVALID_RESPONSE",
        usage: { inputTokens: 120, costUsd: 0.0123 },
      });
    });
  }

  test("retries an invalid SDK response rather than treating HTTP 200 as permanent", async () => {
    responses = [Response.json({ choices: [] }), Response.json(completion())];
    await generateStructuredOutput({ agent, input: { topic: "Sales" } });
    expect(requests).toHaveLength(2);
    expect(usageEvents.mock.calls[0]?.[0].errorType).toBe("INVALID_RESPONSE");
  });

  test("honors zero retries and records the final model error", async () => {
    responses = [Response.json(completion('{"summary":""}'))];
    await expect(generateStructuredOutput({ agent, input: { topic: "Sales" }, retries: 0 }))
      .rejects.toThrow("Schema validation failed");
    expect(requests).toHaveLength(1);
    expect(getBrainModelStatus().lastError).toContain("Schema validation failed");
  });

  test("missing API configuration fails before any request", async () => {
    spyOn(clientModule, "getOpenRouterClient").mockReturnValue(null);
    await expect(generateStructuredOutput({ agent, input: { topic: "Sales" } }))
      .rejects.toThrow("OPENROUTER_API_KEY is required");
    expect(requests).toHaveLength(0);
    expect(usageEvents.mock.calls[0]?.[0].errorType).toBe("CONFIGURATION");
  });
});
