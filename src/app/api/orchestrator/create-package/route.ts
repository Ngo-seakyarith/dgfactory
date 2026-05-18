import { NextResponse } from "next/server";

import {
  runPackageWorkflow,
  type PackageWorkflowInput,
} from "@/lib/brain/workflows/packageWorkflow";
import { validateOrchestratorRequest } from "@/lib/orchestrator/auth";
import { redactForLog } from "@/lib/orchestrator/commands";
import {
  saveApprovalRequest,
  saveOrchestratorLog,
} from "@/lib/orchestrator/storage";
import {
  buildPackageFromParts,
  normalizeTrainingInput,
} from "@/lib/training-packages";
import { saveTrainingPackage } from "@/lib/training-storage";
import { normalizePricingInputs, type PricingInputs } from "@/lib/pricing";

export async function POST(request: Request) {
  const auth = validateOrchestratorRequest(request);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const payload = redactForLog(body);

  try {
    const input = normalizeTrainingInput(body);
    const pricingInputs = normalizePricingInputs(
      (body as { pricingInputs?: Partial<PricingInputs> }).pricingInputs,
    );
    const workflowInput: PackageWorkflowInput = {
      ...input,
      pricingInputs,
    };
    const workflow = await runPackageWorkflow(workflowInput);
    const pkg = buildPackageFromParts({
      input,
      outputs: workflow.output,
      pricingInputs,
      generationMode: "openai",
    });
    const saved = await saveTrainingPackage(pkg);
    const approval = await saveApprovalRequest({
      requestedBy: String((body as { requestedBy?: unknown }).requestedBy ?? "OpenClaw"),
      actionType: "REQUEST_APPROVAL",
      riskLevel: "Medium",
      payload: {
        purpose: "Review generated training package before any client use.",
        packageId: saved.package.id,
        title: saved.package.title,
        client: saved.package.client,
      },
      status: "Pending",
    });

    await saveOrchestratorLog({
      command: "CREATE_PACKAGE",
      payload,
      resultSummary: `Created and saved draft package ${saved.package.title}. Review approval ${approval.approval.id} created.`,
      status: "Completed",
    });

    return NextResponse.json({
      package: saved.package,
      workflowId: workflow.workflowId,
      qaScore: workflow.qaReview.score,
      approvalRequest: approval.approval,
      safety:
        "Package was saved as a draft. Nothing was sent externally. Human review requested.",
    });
  } catch (error) {
    await saveOrchestratorLog({
      command: "CREATE_PACKAGE",
      payload,
      resultSummary:
        error instanceof Error ? error.message : "Package creation failed.",
      status: "Failed",
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Package creation failed." },
      { status: 500 },
    );
  }
}
