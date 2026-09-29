import type { OpenRouter } from "@openrouter/sdk";
import { OpenRouterError, ResponseValidationError } from "@openrouter/sdk/models/errors";

import {
  brainSchemaToJsonSchema,
  formatBrainSchemaErrors,
  type BrainOutputSchema,
} from "@/lib/brain/schemas";
import type { BrainAgentDefinition, BrainMode } from "@/lib/brain/agents";
import {
  brainModel,
  brainReasoningEffort,
  getBrainModelStatus,
  recordBrainModelError,
  recordBrainModelSuccess,
} from "@/lib/brain/core/modelConfig";
import { getOpenRouterClient } from "@/lib/brain/core/openRouterClient";
import { resolveAgentPrompt } from "@/lib/brain/core/promptResolver";
import {
  classifyAiError,
  emptyAiUsage,
  extractOpenRouterUsage,
  recordAiUsageEvent,
} from "@/lib/brain/core/usageTelemetry";

type GenerateStructuredOutputOptions<TInput, TOutput> = {
  agent: BrainAgentDefinition<TInput, TOutput>;
  input: TInput;
  schema?: BrainOutputSchema<TOutput>;
  retries?: number;
};

export type BrainResult<TOutput> = {
  output: TOutput;
  mode: BrainMode;
  model: string;
  notice?: string;
};

export function getBrainModel() {
  return brainModel;
}

function normalizeJsonSchema(schema: BrainOutputSchema) {
  return {
    name: "dg_brain_output",
    strict: true,
    schema: brainSchemaToJsonSchema(schema),
  };
}

function providerErrorMessage(error: OpenRouterError) {
  let body: {
    message?: unknown;
    metadata?: {
      error_type?: unknown;
      provider_code?: unknown;
      raw?: unknown;
    };
  } | undefined;
  try {
    body = (JSON.parse(error.body) as { error?: typeof body }).error;
  } catch {
    // Non-JSON HTTP errors still carry the SDK's status and message.
  }
  const metadata = body?.metadata;
  let rawMessage = "";

  if (typeof metadata?.raw === "string") {
    try {
      const raw = JSON.parse(metadata.raw) as {
        error?: { message?: unknown };
        message?: unknown;
      };
      const message = raw.error?.message ?? raw.message;
      rawMessage = typeof message === "string" ? message : "";
    } catch {
      rawMessage = metadata.raw;
    }
  } else if (metadata?.raw && typeof metadata.raw === "object") {
    const raw = metadata.raw as {
      error?: { message?: unknown };
      message?: unknown;
    };
    const message = raw.error?.message ?? raw.message;
    rawMessage = typeof message === "string" ? message : "";
  }

  const message = rawMessage ||
    (typeof body?.message === "string" ? body.message : error.message);
  const errorType = typeof metadata?.error_type === "string"
    ? ` ${metadata.error_type}`
    : "";
  const providerCode = typeof metadata?.provider_code === "string"
    ? `/${metadata.provider_code}`
    : "";

  return `OpenRouter request failed (${error.statusCode}${errorType}${providerCode}): ${message}`;
}

function normalizeOpenRouterError(error: unknown) {
  if (!(error instanceof OpenRouterError) || error instanceof ResponseValidationError) return error;
  return new Error(providerErrorMessage(error), { cause: error });
}

function shouldRetryOpenRouterError(error: unknown) {
  if (!(error instanceof OpenRouterError) || error instanceof ResponseValidationError) {
    return true;
  }
  return error.statusCode === 408 ||
    error.statusCode === 409 ||
    error.statusCode === 429 ||
    error.statusCode >= 500;
}

async function callOpenRouter<TInput>({
  client,
  agent,
  input,
  model,
  schema,
}: {
  client: OpenRouter;
  agent: BrainAgentDefinition<TInput, unknown>;
  input: TInput;
  model: string;
  schema: BrainOutputSchema;
}) {
  const prompt = await resolveAgentPrompt({ agent, input });
  const completion = await client.chat.send({
    xOpenRouterMetadata: "enabled",
    chatRequest: {
      model,
      stream: false,
      reasoning: {
        effort: brainReasoningEffort,
      },
      provider: {
        requireParameters: true,
      },
      responseFormat: {
        type: "json_schema",
        jsonSchema: normalizeJsonSchema(schema),
      },
      messages: [
        {
          role: "system",
          content: prompt.systemPrompt,
        },
        {
          role: "user",
          content: prompt.userPrompt,
        },
      ],
    },
  });
  if (!("choices" in completion)) {
    throw new Error("OpenRouter returned a stream instead of a structured response.");
  }
  return { raw: completion.choices[0]?.message.content, completion };
}

export async function generateStructuredOutput<TInput, TOutput>({
  agent,
  input,
  schema = agent.outputSchema,
  retries = 1,
}: GenerateStructuredOutputOptions<TInput, TOutput>): Promise<BrainResult<TOutput>> {
  const client = getOpenRouterClient();
  const requestedModel = getBrainModel();
  const operationId = crypto.randomUUID();

  if (!client) {
    const error = new Error("OPENROUTER_API_KEY is required for Brain Layer generation.");
    const now = new Date();
    await recordAiUsageEvent({
      operationId,
      feature: agent.taskType,
      modelId: requestedModel,
      provider: "openrouter",
      status: "ERROR",
      attemptNumber: 1,
      usage: emptyAiUsage(),
      latencyMs: 0,
      errorType: classifyAiError(error),
      startedAt: now,
      completedAt: now,
    });
    recordBrainModelError(error);
    throw error;
  }

  let attempts = 0;
  let lastError: unknown = null;

  while (attempts <= retries) {
    attempts += 1;
    const startedAt = new Date();
    let usage = emptyAiUsage();
    let responseModel = requestedModel;
    let provider = "openrouter";

    try {
      const generated = await callOpenRouter({
        client,
        agent: agent as BrainAgentDefinition<TInput, unknown>,
        input,
        model: requestedModel,
        schema,
      });
      usage = extractOpenRouterUsage(generated.completion);
      responseModel = generated.completion.model || requestedModel;
      const responseProvider = generated.completion.openrouterMetadata?.endpoints.available
        .find((endpoint) => endpoint.selected)?.provider;
      if (typeof responseProvider === "string" && responseProvider.trim()) {
        provider = responseProvider.trim();
      }
      if (!generated.raw) {
        throw new Error("OpenRouter returned an empty Brain Layer response.");
      }
      if (typeof generated.raw !== "string") {
        throw new Error("OpenRouter returned non-text JSON content.");
      }
      const validation = schema.safeParse(JSON.parse(generated.raw) as unknown);

      if (!validation.success) {
        throw new Error(
          `Schema validation failed: ${formatBrainSchemaErrors(validation.error).join("; ")}`,
        );
      }

      recordBrainModelSuccess();
      const completedAt = new Date();
      await recordAiUsageEvent({
        operationId,
        feature: agent.taskType,
        modelId: responseModel,
        provider,
        status: "SUCCESS",
        attemptNumber: attempts,
        usage,
        latencyMs: completedAt.getTime() - startedAt.getTime(),
        startedAt,
        completedAt,
      });

      return {
        output: validation.data,
        mode: "openai",
        model: requestedModel,
      };
    } catch (error) {
      const completedAt = new Date();
      await recordAiUsageEvent({
        operationId,
        feature: agent.taskType,
        modelId: responseModel,
        provider,
        status: "ERROR",
        attemptNumber: attempts,
        usage,
        latencyMs: completedAt.getTime() - startedAt.getTime(),
        errorType: classifyAiError(error),
        startedAt,
        completedAt,
      });
      lastError = normalizeOpenRouterError(error);
      if (!shouldRetryOpenRouterError(error)) break;
    }
  }

  recordBrainModelError(lastError);
  throw lastError instanceof Error
    ? lastError
    : new Error("OpenRouter Brain Layer generation failed.");
}

export { getBrainModelStatus };
