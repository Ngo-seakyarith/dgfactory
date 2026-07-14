import type { BrainAgentDefinition } from "@/lib/brain/agents";
import { getActivePromptTemplate } from "@/lib/prompt-template-storage";
import { renderUserPromptTemplate } from "@/lib/prompt-templates";

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
