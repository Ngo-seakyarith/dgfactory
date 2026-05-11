import OpenAI from "openai";

import {
  validateAgainstSchema,
  type JsonSchema,
} from "@/lib/brain/schemas";
import type { BrainAgentDefinition, BrainMode } from "@/lib/brain/agents";
import {
  fallbackModel,
  intendedBrainModel,
  recordBrainModelError,
  recordBrainModelFallback,
  recordBrainModelMock,
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

let openaiClient: OpenAI | null = null;

export function getBrainModel() {
  return intendedBrainModel;
}

function getFallbackModel(primaryModel: string) {
  return fallbackModel === primaryModel ? "gpt-4o-mini" : fallbackModel;
}

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return openaiClient;
}

function parseModelUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : undefined;

  return (
    status === 404 ||
    message.includes("model") && message.includes("not") && message.includes("found") ||
    message.includes("does not exist") ||
    message.includes("not have access")
  );
}

function safeOpenAINotice(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : undefined;

  if (status === 401 || message.includes("incorrect api key")) {
    return "OpenAI API key was rejected, so mock Brain Layer output was used.";
  }

  if (status === 429 || message.includes("rate limit") || message.includes("quota")) {
    return "OpenAI rate limit or quota was reached, so mock Brain Layer output was used.";
  }

  if (message.includes("json") || message.includes("schema")) {
    return "OpenAI returned an unexpected structure, so mock Brain Layer output was used.";
  }

  return "OpenAI Brain Layer generation was unavailable, so mock output was used.";
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

async function callOpenAI<TInput>({
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
    temperature: 0.45,
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
    throw new Error("OpenAI returned an empty Brain Layer response.");
  }

  return JSON.parse(raw) as unknown;
}

export async function generateStructuredOutput<TInput, TOutput>({
  agent,
  input,
  schema = agent.outputSchema,
  retries = 1,
}: GenerateStructuredOutputOptions<TInput, TOutput>): Promise<BrainResult<TOutput>> {
  const client = getOpenAIClient();
  const requestedModel = getBrainModel();

  if (!client) {
    const output = agent.mockOutput(input);
    const validation = validateAgainstSchema(output, schema);

    if (!validation.valid) {
      throw new Error(`Mock output failed schema validation: ${validation.errors.join("; ")}`);
    }

    recordBrainModelMock("OPENAI_API_KEY is missing, so Brain Layer mock mode was used.");

    return {
      output,
      mode: "mock",
      model: "mock",
      notice: "OPENAI_API_KEY is missing, so Brain Layer mock mode was used.",
    };
  }

  let model = requestedModel;
  let attempts = 0;
  let fallbackUsed = false;
  let lastError: unknown = null;

  while (attempts <= retries) {
    attempts += 1;

    try {
      const output = await callOpenAI({
        client,
        agent: agent as BrainAgentDefinition<TInput, unknown>,
        input,
        model,
        schema,
      });
      const validation = validateAgainstSchema(output, schema);

      if (!validation.valid) {
        throw new Error(`Schema validation failed: ${validation.errors.join("; ")}`);
      }

      recordBrainModelSuccess(model);

      return {
        output: output as TOutput,
        mode: "openai",
        model,
        notice: fallbackUsed
          ? `AI_BRAIN_MODEL=${requestedModel} was unavailable, so ${model} was used.`
          : undefined,
      };
    } catch (error) {
      lastError = error;

      if (!fallbackUsed && parseModelUnavailable(error)) {
        const nextModel = getFallbackModel(model);
        recordBrainModelFallback({
          intendedModel: model,
          nextModel,
          reason: error instanceof Error ? error.message : "Model unavailable.",
        });
        model = nextModel;
        fallbackUsed = true;
        attempts = 0;
        continue;
      }
    }
  }

  const output = agent.mockOutput(input);
  const validation = validateAgainstSchema(output, schema);

  if (!validation.valid) {
    throw new Error(`Mock output failed schema validation: ${validation.errors.join("; ")}`);
  }

  recordBrainModelError(lastError);
  recordBrainModelMock(safeOpenAINotice(lastError));

  return {
    output,
    mode: "mock",
    model: "mock",
    notice: safeOpenAINotice(lastError),
  };
}

export { getBrainModelStatus };
