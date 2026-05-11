import type { JsonSchema } from "@/lib/brain/schemas";

export const promptTemplateStatuses = ["Draft", "Active", "Archived"] as const;

export type PromptTemplateStatus = (typeof promptTemplateStatuses)[number];

export type PromptTemplate = {
  id: string;
  agentName: string;
  version: number;
  title: string;
  systemPrompt: string;
  userPromptTemplate: string;
  outputSchema: JsonSchema;
  status: PromptTemplateStatus;
  createdAt: string;
  updatedAt: string;
};

export type PromptTemplateChange = {
  id: string;
  promptTemplateId: string;
  oldVersion: number;
  newVersion: number;
  changeSummary: string;
  reason: string;
  approvedBy: string;
  createdAt: string;
};

export type PromptTemplateSeed = Omit<
  PromptTemplate,
  "id" | "version" | "status" | "createdAt" | "updatedAt"
> & {
  version?: number;
};

export function isPromptTemplateStatus(
  value: unknown,
): value is PromptTemplateStatus {
  return (
    typeof value === "string" &&
    promptTemplateStatuses.includes(value as PromptTemplateStatus)
  );
}

export function normalizePromptTemplate(
  value: Partial<PromptTemplate>,
): PromptTemplate {
  const now = new Date().toISOString();

  return {
    id: value.id || crypto.randomUUID(),
    agentName: String(value.agentName ?? "").trim(),
    version: Number.isFinite(Number(value.version)) ? Number(value.version) : 1,
    title: String(value.title ?? "").trim(),
    systemPrompt: String(value.systemPrompt ?? "").trim(),
    userPromptTemplate: String(value.userPromptTemplate ?? "").trim(),
    outputSchema:
      value.outputSchema && typeof value.outputSchema === "object"
        ? value.outputSchema
        : { type: "object", properties: {} },
    status: isPromptTemplateStatus(value.status) ? value.status : "Draft",
    createdAt: value.createdAt || now,
    updatedAt: value.updatedAt || now,
  };
}

export function normalizePromptTemplateChange(
  value: Partial<PromptTemplateChange>,
): PromptTemplateChange {
  return {
    id: value.id || crypto.randomUUID(),
    promptTemplateId: String(value.promptTemplateId ?? "").trim(),
    oldVersion: Number.isFinite(Number(value.oldVersion))
      ? Number(value.oldVersion)
      : 0,
    newVersion: Number.isFinite(Number(value.newVersion))
      ? Number(value.newVersion)
      : 1,
    changeSummary: String(value.changeSummary ?? "").trim(),
    reason: String(value.reason ?? "").trim(),
    approvedBy: String(value.approvedBy ?? "").trim(),
    createdAt: value.createdAt || new Date().toISOString(),
  };
}

export function renderUserPromptTemplate(template: string, input: unknown) {
  const inputJson = JSON.stringify(input, null, 2);

  return template
    .replaceAll("{{input}}", inputJson)
    .replaceAll("{{input_json}}", inputJson);
}

export function createPromptTemplateDraft({
  source,
  title,
  systemPrompt,
  userPromptTemplate,
}: {
  source: PromptTemplate;
  title?: string;
  systemPrompt?: string;
  userPromptTemplate?: string;
}) {
  const nextVersion = Number(source.version) + 1;

  return normalizePromptTemplate({
    agentName: source.agentName,
    version: nextVersion,
    title: title?.trim() || `${source.title} v${nextVersion}`,
    systemPrompt: systemPrompt?.trim() || source.systemPrompt,
    userPromptTemplate:
      userPromptTemplate?.trim() || source.userPromptTemplate,
    outputSchema: source.outputSchema,
    status: "Draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export function appendPromptSuggestion(
  prompt: string,
  suggestion: string,
  reason: string,
) {
  return [
    prompt.trim(),
    "",
    "Human-approved improvement candidate:",
    `- Suggested change: ${suggestion.trim()}`,
    reason.trim() ? `- Reason: ${reason.trim()}` : "",
    "- Keep this change client-safe, practical, and testable before activation.",
  ]
    .filter(Boolean)
    .join("\n");
}
