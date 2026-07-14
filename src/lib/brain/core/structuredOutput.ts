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

function normalizeJsonSchema(schema: JsonSchema) {
  return {
    name: "dg_brain_output",
    strict: false,
    schema,
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
  const completion = await client.chat.completions.create({
    model,
    reasoning_effort: brainReasoningEffort,
    response_format: {
      type: "json_schema",
      json_schema: normalizeJsonSchema(schema),
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
  });

  const raw = completion.choices[0]?.message.content;

  if (!raw) {
    throw new Error("OpenRouter returned an empty Brain Layer response.");
  }

  return JSON.parse(raw) as unknown;
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
      const output = await callOpenRouter({
        client,
        agent: agent as BrainAgentDefinition<TInput, unknown>,
        input,
        model: requestedModel,
        schema,
      });
      const validation = validateAgainstSchema(output, schema);

      if (!validation.valid) {
        throw new Error(`Schema validation failed: ${validation.errors.join("; ")}`);
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
