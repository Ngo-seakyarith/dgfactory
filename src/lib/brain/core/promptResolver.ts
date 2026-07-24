import type { BrainAgentDefinition } from "@/lib/brain/agents";
import { promptSchemaMatches } from "@/lib/brain/core/schemaCompatibility";
import { getActivePromptTemplate } from "@/lib/prompt-template-storage";
import { renderUserPromptTemplate } from "@/lib/prompt-templates";

function codePrompt<TInput>({
  agent,
  input,
  source,
  templateVersion,
}: {
  agent: BrainAgentDefinition<TInput, unknown>;
  input: TInput;
  source: "code" | "code_schema_mismatch";
  templateVersion: number | null;
}) {
  return {
    systemPrompt: [
      `Agent: ${agent.name}`,
      `Role: ${agent.role}`,
      agent.instructions,
      "Return only JSON matching the requested schema.",
      "Keep DG Academy context practical, executive-friendly, and commercially careful.",
    ].join("\n\n"),
    userPrompt: JSON.stringify(input),
    source,
    templateVersion,
  } as const;
}

export async function resolveAgentPrompt<TInput>({
  agent,
  input,
}: {
  agent: BrainAgentDefinition<TInput, unknown>;
  input: TInput;
}) {
  const activeTemplate = await getActivePromptTemplate(agent.name);

  if (
    activeTemplate &&
    promptSchemaMatches(activeTemplate.outputSchema, agent.outputSchema)
  ) {
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

  return codePrompt({
    agent,
    input,
    source: activeTemplate ? "code_schema_mismatch" : "code",
    templateVersion: activeTemplate?.version ?? null,
  });
}
