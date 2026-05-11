import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import {
  activatePromptTemplate,
  archivePromptTemplate,
  rollbackPromptTemplate,
} from "@/lib/prompt-template-storage";
import { requirePermission } from "@/lib/route-guards";

type Context = {
  params: Promise<{ id: string }>;
};

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Prompt template update failed.";
}

export async function PATCH(request: Request, context: Context) {
  const auth = requirePermission(request, "approve_prompts");

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      action?: unknown;
      approvedBy?: unknown;
      changeSummary?: unknown;
      reason?: unknown;
      agentName?: unknown;
      version?: unknown;
    };
    const approvedBy =
      typeof body.approvedBy === "string" ? body.approvedBy : undefined;

    if (body.action === "approve") {
      const result = await activatePromptTemplate({
        id,
        approvedBy,
        changeSummary:
          typeof body.changeSummary === "string"
            ? body.changeSummary
            : undefined,
        reason: typeof body.reason === "string" ? body.reason : undefined,
      });

      await saveAuditLog({
        actor: auth.user.actor,
        action: "prompt_approved",
        entityType: "prompt_template",
        entityId: result.template.id,
        metadata: {
          agentName: result.template.agentName,
          version: result.template.version,
          changeId: result.change.id,
        },
      });

      return NextResponse.json(result);
    }

    if (body.action === "archive") {
      const result = await archivePromptTemplate(id);
      await saveAuditLog({
        actor: auth.user.actor,
        action: "prompt_archived",
        entityType: "prompt_template",
        entityId: result.template.id,
        metadata: {
          agentName: result.template.agentName,
          version: result.template.version,
        },
      });
      return NextResponse.json(result);
    }

    if (body.action === "rollback") {
      if (typeof body.agentName !== "string" || !Number.isFinite(Number(body.version))) {
        return NextResponse.json(
          { error: "agentName and version are required for rollback." },
          { status: 400 },
        );
      }

      const result = await rollbackPromptTemplate({
        agentName: body.agentName,
        version: Number(body.version),
        approvedBy,
      });

      await saveAuditLog({
        actor: auth.user.actor,
        action: "prompt_rollback",
        entityType: "prompt_template",
        entityId: result.template.id,
        metadata: {
          agentName: result.template.agentName,
          version: result.template.version,
          changeId: result.change.id,
        },
      });

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Action must be approve, archive, or rollback." },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
