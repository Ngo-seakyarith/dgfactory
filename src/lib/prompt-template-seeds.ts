import { brainAgents } from "@/lib/brain/agents";
import type { PromptTemplateSeed } from "@/lib/prompt-templates";

export function getSeedPromptTemplates(): PromptTemplateSeed[] {
  return brainAgents
    .filter((agent) =>
      [
        "chiefBrainAgent",
        "courseArchitectAgent",
        "proposalAgent",
        "slideAgent",
        "workbookAgent",
        "pricingNarrativeAgent",
        "qaAgent",
        "deliveryAgent",
        "improvementAgent",
      ].includes(agent.name),
    )
    .map((agent) => ({
      agentName: agent.name,
      version: 1,
      title: `${agent.name} active template`,
      systemPrompt: [
        `Agent: ${agent.name}`,
        `Role: ${agent.role}`,
        agent.instructions,
        "Return only JSON matching the requested schema.",
        "Keep DG Academy context practical, executive-friendly, and commercially careful.",
        "Do not invent deterministic pricing numbers, taxes, discounts, margins, or internal profitability.",
      ].join("\n\n"),
      userPromptTemplate: "{{input_json}}",
      outputSchema: agent.outputSchema,
    }));
}
