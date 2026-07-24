import OpenAI from "openai";

import {
  validateAgainstSchema,
  type JsonSchema,
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

type GenerateStructuredOutputOptions<TInput, TOutput> = {
  agent: BrainAgentDefinition<TInput, TOutput>;
  input: TInput;
  schema?: JsonSchema;
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

function strictJsonSchema(schema: JsonSchema): JsonSchema {
  const normalized: JsonSchema = {
    ...schema,
    properties: schema.properties
      ? Object.fromEntries(
          Object.entries(schema.properties).map(([key, child]) => [
            key,
            strictJsonSchema(child),
          ]),
        )
      : undefined,
    items: schema.items ? strictJsonSchema(schema.items) : undefined,
  };

  if (schema.type === "object") {
    normalized.additionalProperties = false;
  }

  return normalized;
}

function normalizeJsonSchema(schema: JsonSchema, strict: boolean) {
  return {
    name: "dg_brain_output",
    strict,
    schema: strict ? strictJsonSchema(schema) : schema,
  };
}

async function callOpenRouter<TInput>({
  client,
  agent,
  input,
  model,
  schema,
}: {
  client: OpenAI;
  agent: BrainAgentDefinition<TInput, unknown>;
  input: TInput;
  model: string;
  schema: JsonSchema;
}) {
  const prompt = await resolveAgentPrompt({ agent, input });
  const request = {
    model,
    reasoning: {
      effort: brainReasoningEffort,
    },
    provider: {
      require_parameters: true,
    },
    response_format: {
      type: "json_schema",
      json_schema: normalizeJsonSchema(schema, agent.strictOutput === true),
    } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming["response_format"],
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
  } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
    provider: { require_parameters: true };
    reasoning: { effort: typeof brainReasoningEffort };
  };
  const completion = await client.chat.completions.create(request);

  const raw = completion.choices[0]?.message.content;

  if (!raw) {
    throw new Error("OpenRouter returned an empty Brain Layer response.");
  }

  return {
    output: JSON.parse(raw) as unknown,
    promptSource: prompt.source,
    templateVersion: prompt.templateVersion,
  };
}

export async function generateStructuredOutput<TInput, TOutput>({
  agent,
  input,
  schema = agent.outputSchema,
  retries = 1,
}: GenerateStructuredOutputOptions<TInput, TOutput>): Promise<BrainResult<TOutput>> {
  const client = getOpenRouterClient();
  const requestedModel = getBrainModel();

  if (!client) {
    const error = new Error("OPENROUTER_API_KEY is required for Brain Layer generation.");
    recordBrainModelError(error);
    throw error;
  }

  let attempts = 0;
  let lastError: unknown = null;

  while (attempts <= retries) {
    attempts += 1;

    try {
      const generated = await callOpenRouter({
        client,
        agent: agent as BrainAgentDefinition<TInput, unknown>,
        input,
        model: requestedModel,
        schema,
      });
      const output = generated.output;
      const validation = validateAgainstSchema(output, schema);

      if (!validation.valid) {
        const promptSource = generated.promptSource === "template"
          ? `active template v${generated.templateVersion}`
          : generated.promptSource === "code_schema_mismatch"
            ? `code prompt because active template v${generated.templateVersion} has a stale schema`
            : "code prompt";
        throw new Error(
          `Schema validation failed using ${promptSource}: ${validation.errors.join("; ")}`,
        );
      }

      recordBrainModelSuccess();

      return {
        output: output as TOutput,
        mode: "openai",
        model: requestedModel,
      };
    } catch (error) {
      lastError = error;
    }
  }

  recordBrainModelError(lastError);
  throw lastError instanceof Error
    ? lastError
    : new Error("OpenRouter Brain Layer generation failed.");
}

export { getBrainModelStatus };
