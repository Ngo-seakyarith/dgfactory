import type { BrainAgentDefinition } from "@/lib/brain/agents";

export async function resolveAgentPrompt<TInput>({
  agent,
  input,
}: {
  agent: BrainAgentDefinition<TInput, unknown>;
  input: TInput;
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
  };
}
