import { saveAuditLog } from "@/lib/audit";
import type {
  CoursePackageBrainInput,
  ProposalAgentOutput,
} from "@/lib/brain/agents";
import { routeBrainTask } from "@/lib/brain/routing/router";
import { ensureDeliveryProjectForPackage } from "@/features/delivery/storage/delivery-storage";
import {
  ensureOpportunityForPackage,
  linkDeliveryToOpportunity,
} from "@/features/crm/server/sync";
import { GenerationInputError } from "@/features/generation-jobs/domain/errors";

import {
  buildPackageFromParts,
  getTrainerById,
  getCommercialSetupError,
  normalizeTrainingInput,
  normalizeTrainingOutputs,
  proposalNarrativeBriefFrom,
} from "@/features/training-packages";
import {
  getTrainingPackage,
  saveTrainingPackage,
} from "../storage/training-storage";

export async function generateAndSaveTrainingPackage(
  packageId: string,
  actor: string,
) {
  const current = await getTrainingPackage(packageId);
  const commercialError = getCommercialSetupError(current.pricingInputs);
  if (commercialError) throw new GenerationInputError(commercialError);
  const input = normalizeTrainingInput({
    courseTitle: current.title,
    audience: current.audience,
    duration: current.duration,
    client: current.client,
    context: current.context,
    tone: current.tone,
    proposalBrief: current.proposalBrief,
  });

  if (!getTrainerById(input.proposalBrief?.trainerId ?? "")) {
    throw new GenerationInputError(
      "Select a DG Academy trainer before generating the package.",
    );
  }
  const secondTrainerId = input.proposalBrief?.secondTrainerId ?? "";
  if (
    secondTrainerId &&
    (!getTrainerById(secondTrainerId) ||
      secondTrainerId === input.proposalBrief?.trainerId)
  ) {
    throw new GenerationInputError(
      "Select a different approved profile for the second trainer.",
    );
  }

  const brainInput: CoursePackageBrainInput = {
    ...input,
    proposalBrief: proposalNarrativeBriefFrom(input.proposalBrief),
  };
  const result = await routeBrainTask<CoursePackageBrainInput, ProposalAgentOutput>({
    taskType: "course_package",
    input: brainInput,
    retries: 1,
  });
  const outputs = normalizeTrainingOutputs(result.output, input, current.pricingInputs);
  const generated = buildPackageFromParts({
    input,
    outputs,
    id: current.id,
    createdAt: current.createdAt,
    clientId: current.clientId,
    pricingInputs: current.pricingInputs,
  });
  const saved = await saveTrainingPackage(generated);
  const opportunity = await ensureOpportunityForPackage(saved.package, actor).catch(
    () => null,
  );
  const delivery = await ensureDeliveryProjectForPackage(saved.package);
  if (opportunity) {
    await linkDeliveryToOpportunity(delivery.project, opportunity.opportunity);
  }
  await saveAuditLog({
    actor,
    action: "package_generated",
    entityType: "training_package",
    entityId: packageId,
    metadata: { title: saved.package.title, model: result.model },
  });

  return saved.package;
}
