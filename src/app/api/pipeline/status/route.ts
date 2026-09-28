import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApproved } from "@/lib/route-guards";
import { saveAuditLog } from "@/lib/audit";
import { proposalStages } from "@/features/pipeline/domain";
import { setProposalStage } from "@/features/pipeline/server/proposal-stage";
import { ProjectRequestError } from "@/features/pipeline/server/errors";

const statusInput = z.object({ id: z.uuid(), kind: z.enum(["training_package", "system_proposal"]), status: z.enum(proposalStages) });

export async function PATCH(request: Request) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const { id, kind, status } = statusInput.parse(await request.json());
    await setProposalStage(id, kind, status);
    await saveAuditLog({ actor: auth.user.actor, action: "proposal_status_changed", entityType: kind, entityId: id, metadata: { status } });
    return NextResponse.json({ status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? "Invalid proposal or status." : error instanceof Error ? error.message : "Proposal status could not be saved." }, {
      status: error instanceof z.ZodError || error instanceof SyntaxError ? 400 : error instanceof ProjectRequestError ? error.status : 500,
    });
  }
}
