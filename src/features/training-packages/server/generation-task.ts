import { saveAuditLog } from "@/lib/audit";
import type {
  CoursePackageBrainInput,
  ProposalAgentOutput,
} from "@/lib/brain/agents";
import { routeBrainTask } from "@/lib/brain/routing/router";
import {
  formatKnowledgeForBrain,
  retrieveKnowledge,
} from "@/lib/knowledge/retrieve";
import { knowledgeSourceNotesFromResults } from "@/lib/knowledge";
import { ensureDeliveryProjectForPackage } from "@/features/delivery/storage/delivery-storage";
import { GenerationInputError } from "@/features/generation-jobs/domain/errors";

import {
  buildPackageFromParts,
  getTrainerById,
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
  const input = normalizeTrainingInput({
    courseTitle: current.title,
    audience: current.audience,
    duration: current.duration,
    client: current.client,
    promise: current.promise,
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

  const briefValues = Object.entries(input.proposalBrief ?? {})
    .filter(
      ([key]) =>
        ![
          "trainerImageUrl",
          "trainerBio",
          "trainerExperience",
          "trainerQualifications",
          "secondTrainerImageUrl",
          "secondTrainerBio",
          "secondTrainerExperience",
          "secondTrainerQualifications",
        ].includes(key),
    )
    .map(([, value]) => value);
  const knowledgeResults = await retrieveKnowledge({
    query: [
      input.courseTitle,
      input.audience,
      input.client,
      input.promise,
      input.context,
      ...briefValues,
    ].join(" "),
    filters: { visibility: "Any" },
    limit: 6,
  });
  const brainInput: CoursePackageBrainInput = {
    ...input,
    context: [input.context, formatKnowledgeForBrain(knowledgeResults)]
      .filter(Boolean)
      .join("\n\n"),
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
    knowledgeUsed: knowledgeSourceNotesFromResults(knowledgeResults),
  });
  const saved = await saveTrainingPackage(generated);
  await ensureDeliveryProjectForPackage(saved.package);
  await saveAuditLog({
    actor,
    action: "package_generated",
    entityType: "training_package",
    entityId: packageId,
    metadata: { title: saved.package.title, model: result.model },
  });

  return saved.package;
}
