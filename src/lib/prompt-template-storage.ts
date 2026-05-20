import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scopeByOrganization, withOrganizationId } from "@/lib/organization-scope";
import {
  appendPromptSuggestion,
  createPromptTemplateDraft,
  normalizePromptTemplate,
  normalizePromptTemplateChange,
  type PromptTemplate,
  type PromptTemplateChange,
  type PromptTemplateSeed,
  type PromptTemplateStatus,
} from "@/lib/prompt-templates";

type PromptTemplateRow = {
  id: string;
  agent_name: string;
  version: number;
  title: string;
  system_prompt: string;
  user_prompt_template: string;
  output_schema: Record<string, unknown>;
  status: PromptTemplateStatus | null;
  created_at: string;
  updated_at: string;
};

type PromptTemplateChangeRow = {
  id: string;
  prompt_template_id: string;
  old_version: number;
  new_version: number;
  change_summary: string;
  reason: string;
  approved_by: string | null;
  created_at: string;
};

function templateToRow(template: PromptTemplate) {
  return {
    id: template.id,
    agent_name: template.agentName,
    version: template.version,
    title: template.title,
    system_prompt: template.systemPrompt,
    user_prompt_template: template.userPromptTemplate,
    output_schema: template.outputSchema,
    status: template.status,
    created_at: template.createdAt,
    updated_at: template.updatedAt,
  };
}

function templateFromRow(row: PromptTemplateRow) {
  return normalizePromptTemplate({
    id: row.id,
    agentName: row.agent_name,
    version: row.version,
    title: row.title,
    systemPrompt: row.system_prompt,
    userPromptTemplate: row.user_prompt_template,
    outputSchema: row.output_schema,
    status: row.status ?? "Draft",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function changeToRow(change: PromptTemplateChange) {
  return {
    id: change.id,
    prompt_template_id: change.promptTemplateId,
    old_version: change.oldVersion,
    new_version: change.newVersion,
    change_summary: change.changeSummary,
    reason: change.reason,
    approved_by: change.approvedBy || null,
    created_at: change.createdAt,
  };
}

function changeFromRow(row: PromptTemplateChangeRow) {
  return normalizePromptTemplateChange({
    id: row.id,
    promptTemplateId: row.prompt_template_id,
    oldVersion: row.old_version,
    newVersion: row.new_version,
    changeSummary: row.change_summary,
    reason: row.reason,
    approvedBy: row.approved_by ?? "",
    createdAt: row.created_at,
  });
}

function sortTemplates(templates: PromptTemplate[]) {
  return [...templates].sort(
    (a, b) =>
      a.agentName.localeCompare(b.agentName) ||
      b.version - a.version ||
      b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function ensureSeedPromptTemplates(seeds: PromptTemplateSeed[]) {
  const supabase = getSupabaseServerClient();
  const created: PromptTemplate[] = [];

  if (!supabase) {
    throw new Error("Supabase is required to seed prompt templates.");
  }

  for (const seed of seeds) {
    const existingQuery = supabase
      .from("prompt_templates")
      .select("id")
      .eq("agent_name", seed.agentName)
      .limit(1);
    const { data: existing } = await scopeByOrganization(existingQuery);

    if (existing?.length) {
      continue;
    }

    const template = normalizePromptTemplate({
      ...seed,
      version: seed.version ?? 1,
      status: "Active",
    });
    const { data, error } = await supabase
      .from("prompt_templates")
      .insert(withOrganizationId(templateToRow(template)))
      .select("*")
      .single();

    created.push(error ? template : templateFromRow(data as PromptTemplateRow));
  }

  return { created, storage: "supabase" as const };
}

export async function listPromptTemplates(filters: {
  agentName?: string;
  status?: PromptTemplateStatus;
} = {}) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to list prompt templates.");
  }

  let query = scopeByOrganization(supabase
    .from("prompt_templates")
    .select("*")
    .order("agent_name")
    .order("version", { ascending: false }));

  if (filters.agentName) {
    query = query.eq("agent_name", filters.agentName);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data as PromptTemplateRow[]).map(templateFromRow);
}

export async function getActivePromptTemplate(agentName: string) {
  const templates = await listPromptTemplates({ agentName, status: "Active" });
  return templates.sort((a, b) => b.version - a.version)[0] ?? null;
}

export async function listPromptTemplateChanges(promptTemplateId?: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to list prompt template changes.");
  }

  let query = scopeByOrganization(supabase
    .from("prompt_template_changes")
    .select("*")
    .order("created_at", { ascending: false }));

  if (promptTemplateId) {
    query = query.eq("prompt_template_id", promptTemplateId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data as PromptTemplateChangeRow[]).map(changeFromRow);
}

export async function savePromptTemplate(input: Partial<PromptTemplate>) {
  const template = normalizePromptTemplate(input);
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to save prompt templates.");
  }

  const { data, error } = await supabase
    .from("prompt_templates")
    .upsert(withOrganizationId(templateToRow(template)), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    template: templateFromRow(data as PromptTemplateRow),
    storage: "supabase" as const,
  };
}

async function savePromptTemplateChange(input: Partial<PromptTemplateChange>) {
  const change = normalizePromptTemplateChange(input);
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to save prompt template changes.");
  }

  const { data, error } = await supabase
    .from("prompt_template_changes")
    .insert(withOrganizationId(changeToRow(change)))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    change: changeFromRow(data as PromptTemplateChangeRow),
    storage: "supabase" as const,
  };
}

export async function createDraftPromptTemplate({
  sourceTemplateId,
  title,
  systemPrompt,
  userPromptTemplate,
}: {
  sourceTemplateId: string;
  title?: string;
  systemPrompt?: string;
  userPromptTemplate?: string;
}) {
  const templates = await listPromptTemplates();
  const source = templates.find((template) => template.id === sourceTemplateId);

  if (!source) {
    throw new Error("Source prompt template not found.");
  }

  const nextVersion =
    Math.max(
      source.version,
      ...templates
        .filter((template) => template.agentName === source.agentName)
        .map((template) => template.version),
    ) + 1;
  const draft = createPromptTemplateDraft({
    source,
    title,
    systemPrompt,
    userPromptTemplate,
  });
  draft.version = nextVersion;

  return savePromptTemplate(draft);
}

export async function createDraftFromImprovementSuggestion({
  targetAgent,
  suggestedChange,
  reason,
}: {
  targetAgent: string;
  suggestedChange: string;
  reason: string;
}) {
  const active = await getActivePromptTemplate(targetAgent);

  if (!active) {
    throw new Error(`No active prompt template found for ${targetAgent}.`);
  }

  return createDraftPromptTemplate({
    sourceTemplateId: active.id,
    title: `${active.agentName} improvement draft v${active.version + 1}`,
    systemPrompt: appendPromptSuggestion(
      active.systemPrompt,
      suggestedChange,
      reason,
    ),
    userPromptTemplate: active.userPromptTemplate,
  });
}

export async function activatePromptTemplate({
  id,
  approvedBy,
  changeSummary,
  reason,
}: {
  id: string;
  approvedBy?: string;
  changeSummary?: string;
  reason?: string;
}) {
  const templates = await listPromptTemplates();
  const draft = templates.find((template) => template.id === id);

  if (!draft) {
    throw new Error("Prompt template not found.");
  }

  if (draft.status !== "Draft") {
    throw new Error("Only draft prompt templates can be activated.");
  }

  const active = templates
    .filter(
      (template) =>
        template.agentName === draft.agentName && template.status === "Active",
    )
    .sort((a, b) => b.version - a.version)[0];
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  if (active) {
    await savePromptTemplate({
      ...active,
      status: "Archived",
      updatedAt: now,
    });
  }

  const activated = normalizePromptTemplate({
    ...draft,
    status: "Active",
    updatedAt: now,
  });
  const saved = await savePromptTemplate(activated);
  const change = await savePromptTemplateChange({
    promptTemplateId: saved.template.id,
    oldVersion: active?.version ?? 0,
    newVersion: saved.template.version,
    changeSummary:
      changeSummary || `Activated ${saved.template.agentName} v${saved.template.version}.`,
    reason: reason || "Human-approved prompt template activation.",
    approvedBy: approvedBy || "",
  });

  if (supabase && active) {
    await scopeByOrganization(
      supabase
        .from("prompt_templates")
        .update({ status: "Archived", updated_at: now })
        .eq("id", active.id),
    );
  }

  return { template: saved.template, change: change.change, storage: saved.storage };
}

export async function archivePromptTemplate(id: string) {
  const templates = await listPromptTemplates();
  const template = templates.find((item) => item.id === id);

  if (!template) {
    throw new Error("Prompt template not found.");
  }

  return savePromptTemplate({
    ...template,
    status: "Archived",
    updatedAt: new Date().toISOString(),
  });
}

export async function rollbackPromptTemplate({
  agentName,
  version,
  approvedBy,
}: {
  agentName: string;
  version: number;
  approvedBy?: string;
}) {
  const templates = await listPromptTemplates({ agentName });
  const target = templates.find((template) => template.version === version);

  if (!target) {
    throw new Error("Rollback target template not found.");
  }

  const active = templates
    .filter((template) => template.status === "Active")
    .sort((a, b) => b.version - a.version)[0];
  const now = new Date().toISOString();

  if (active && active.id !== target.id) {
    await savePromptTemplate({ ...active, status: "Archived", updatedAt: now });
  }

  const activated = await savePromptTemplate({
    ...target,
    status: "Active",
    updatedAt: now,
  });
  const change = await savePromptTemplateChange({
    promptTemplateId: activated.template.id,
    oldVersion: active?.version ?? 0,
    newVersion: target.version,
    changeSummary: `Rolled ${agentName} back to v${target.version}.`,
    reason: "Human-approved rollback.",
    approvedBy: approvedBy || "",
  });

  return {
    template: activated.template,
    change: change.change,
    storage: activated.storage,
  };
}
