import OpenAI from "openai";

import {
  validateAgainstSchema,
  type JsonSchema,
} from "@/lib/brain/schemas";
import type { BrainAgentDefinition, BrainMode } from "@/lib/brain/agents";
import {
  brainModel,
  brainReasoningEffort,
  recordBrainModelError,
  recordBrainModelSuccess,
  getBrainModelStatus,
} from "@/lib/brain/modelConfig";
import { getActivePromptTemplate } from "@/lib/prompt-template-storage";
import { renderUserPromptTemplate } from "@/lib/prompt-templates";

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

let openRouterClient: OpenAI | null = null;

export function getBrainModel() {
  return brainModel;
}

function getOpenRouterClient() {
  if (!process.env.OPENROUTER_API_KEY) {
    return null;
  }

  if (!openRouterClient) {
    openRouterClient = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-OpenRouter-Title": "DG Academy Training Production Factory",
      },
    });
  }

  return openRouterClient;
}

function normalizeJsonSchema(schema: JsonSchema) {
  return {
    name: "dg_brain_output",
    strict: false,
    schema,
  };
}

export async function resolveAgentPrompt<TInput>({
  agent,
  input,
}: {
  agent: BrainAgentDefinition<TInput, unknown>;
  input: TInput;
}) {
  const activeTemplate = await getActivePromptTemplate(agent.name);

  if (activeTemplate) {
    return {
      systemPrompt: activeTemplate.systemPrompt,
      userPrompt: renderUserPromptTemplate(
        activeTemplate.userPromptTemplate,
        input,
      ),
      source: "template" as const,
      templateVersion: activeTemplate.version,
    };
  }

  return {
    systemPrompt: [
      `Agent: ${agent.name}`,
      `Role: ${agent.role}`,
      agent.instructions,
      "Return only JSON matching the requested schema.",
      "Keep DG Academy context practical, executive-friendly, and commercially careful.",
    ].join("\n\n"),
    userPrompt: JSON.stringify(input),
    source: "code" as const,
    templateVersion: null,
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
