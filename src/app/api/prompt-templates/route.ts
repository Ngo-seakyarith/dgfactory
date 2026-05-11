import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import { getSeedPromptTemplates } from "@/lib/prompt-template-seeds";
import {
  createDraftPromptTemplate,
  ensureSeedPromptTemplates,
  listPromptTemplateChanges,
  listPromptTemplates,
} from "@/lib/prompt-template-storage";
import { isPromptTemplateStatus } from "@/lib/prompt-templates";
import { requirePermission } from "@/lib/route-guards";

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Prompt template request failed.";
}

export async function GET(request: Request) {
  const auth = requirePermission(request, "manage_prompts");

  if (!auth.ok) {
    return auth.response;
  }

  try {
    await ensureSeedPromptTemplates(getSeedPromptTemplates());
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const templates = await listPromptTemplates({
      agentName: url.searchParams.get("agentName") ?? undefined,
      status: isPromptTemplateStatus(status) ? status : undefined,
    });
    const changes = await listPromptTemplateChanges();

    return NextResponse.json({ templates, changes });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = requirePermission(request, "manage_prompts");

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as {
      sourceTemplateId?: unknown;
      title?: unknown;
      systemPrompt?: unknown;
      userPromptTemplate?: unknown;
      reason?: unknown;
    };

    if (typeof body.sourceTemplateId !== "string") {
      return NextResponse.json(
        { error: "sourceTemplateId is required to create a draft." },
        { status: 400 },
      );
    }

    const result = await createDraftPromptTemplate({
      sourceTemplateId: body.sourceTemplateId,
      title: typeof body.title === "string" ? body.title : undefined,
      systemPrompt:
        typeof body.systemPrompt === "string" ? body.systemPrompt : undefined,
      userPromptTemplate:
        typeof body.userPromptTemplate === "string"
          ? body.userPromptTemplate
          : undefined,
    });

    await saveAuditLog({
      actor: auth.user.actor,
      action: "prompt_draft_created",
      entityType: "prompt_template",
      entityId: result.template.id,
      metadata: {
        agentName: result.template.agentName,
        version: result.template.version,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
