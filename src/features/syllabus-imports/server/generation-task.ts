import "server-only";

import { createHash } from "node:crypto";

import { ensureDeliveryProjectForPackage } from "@/features/delivery/storage/delivery-storage";
import {
  ensureOpportunityForPackage,
  linkDeliveryToOpportunity,
} from "@/lib/crm-sync";
import { GenerationInputError } from "@/features/generation-jobs/domain/errors";
import {
  buildPackageFromParts,
  emptyProposalBrief,
  normalizePricingInputs,
  normalizeTrainingOutputs,
  secondTrainerSnapshotFields,
  trainerCatalog,
  trainerSnapshotFields,
  type TrainingPackageInput,
} from "@/features/training-packages";
import { saveTrainingPackage } from "@/features/training-packages/storage/training-storage";
import { saveAuditLog } from "@/lib/audit";
import type { SyllabusProposalBrainOutput } from "@/lib/brain/agents";
import { routeBrainTask } from "@/lib/brain/routing/router";
import { listClients, resolvePackageClient } from "@/lib/crm-storage";

import { resolveImportTrainers } from "../domain/matching";
import type { SyllabusProposalImport } from "../domain/types";
import {
  deleteSyllabusImportSource,
  downloadSyllabusImport,
  getSyllabusImport,
  saveSyllabusImport,
} from "../storage/syllabus-import-storage";
import { parseSyllabusDocument } from "./parse-syllabus";

const defaultIncludedItems = [
  "Pre-training consultation and program customization",
  "Professional facilitation and training delivery",
  "Digital participant materials and practical templates",
  "Certificates of completion",
  "Pre-training and post-training evaluation",
].join("\n");

const defaultClientResponsibilities = [
  "Confirm the participant list and learning priorities",
  "Provide the training venue, display equipment, internet access, and refreshments",
  "Ensure participants bring laptops and can access approved tools",
  "Nominate a focal person for logistics and final coordination",
].join("\n");

function requiredPricing(value: SyllabusProposalImport) {
  if (value.pricingInputs.professionalFee <= 0) {
    throw new GenerationInputError("Enter a professional fee greater than zero.");
  }
}

async function finalizeExistingPackage(value: SyllabusProposalImport, actor: string) {
  const withoutSource = await deleteSyllabusImportSource({
    ...value,
    status: "Finalizing",
    errorMessage: "",
  });
  const completed = await saveSyllabusImport({
    ...withoutSource,
    status: "Completed",
    missingFields: [],
    errorMessage: "",
  });
  await saveAuditLog({
    actor,
    action: "syllabus_import_completed",
    entityType: "training_package",
    entityId: completed.packageId ?? completed.id,
    metadata: {
      importId: completed.id,
      sourceFilename: completed.originalName,
    },
  });
  return completed;
}

async function resolveClientName(value: SyllabusProposalImport) {
  const correctedName = value.corrections.clientName.trim();
  if (correctedName) return correctedName;
  if (value.corrections.clientId) {
    const selected = (await listClients()).find(
      (client) => client.id === value.corrections.clientId,
    );
    if (selected) return selected.name;
  }
  return value.mapping?.clientName?.trim() ?? "";
}

export async function generatePackageFromSyllabusImport(id: string, actor: string) {
  let value = await getSyllabusImport(id);
  if (!value) throw new GenerationInputError("The syllabus import was not found.");
  if (value.status === "Completed") return value;
  requiredPricing(value);

  if (value.packageId) return finalizeExistingPackage(value, actor);

  value = await saveSyllabusImport({
    ...value,
    status: "Processing",
    errorMessage: "",
  });

  if (!value.mapping) {
    let buffer: Buffer;
    try {
      buffer = await downloadSyllabusImport(value);
      const checksum = createHash("sha256").update(buffer).digest("hex");
      const document = await parseSyllabusDocument({
        buffer,
        name: value.originalName,
        mimeType: value.mimeType,
      });
      const result = await routeBrainTask<
        {
          document: typeof document;
          approvedTrainerNames: string[];
        },
        SyllabusProposalBrainOutput
      >({
        taskType: "syllabus_to_training_proposal",
        input: {
          document,
          approvedTrainerNames: trainerCatalog.map((trainer) => trainer.name),
        },
        retries: 1,
      });
      value = await saveSyllabusImport({
        ...value,
        sha256: checksum,
        mapping: result.output.mapping,
      });
      await saveAuditLog({
        actor,
        action: "syllabus_import_mapped",
        entityType: "syllabus_import",
        entityId: value.id,
        metadata: {
          sourceFilename: value.originalName,
          model: result.model,
        },
      });
    } catch (error) {
      if (error instanceof GenerationInputError) throw error;
      const message = error instanceof Error ? error.message : "The syllabus could not be processed.";
      if (/DOCX|PPTX|PDF|PowerPoint|syllabus|document|content|file/i.test(message)) {
        throw new GenerationInputError(message);
      }
      throw error;
    }
  }

  const mapping = value.mapping;
  if (!mapping) throw new Error("The syllabus mapping was not saved.");
  if (
    value.pricingInputs.numberOfParticipants <= 0 &&
    Number(mapping.participantCount ?? 0) > 0
  ) {
    value = await saveSyllabusImport({
      ...value,
      pricingInputs: normalizePricingInputs({
        ...value.pricingInputs,
        numberOfParticipants: Number(mapping.participantCount ?? 0),
      }),
    });
  }
  const clientName = await resolveClientName(value);
  const trainerResolution = resolveImportTrainers({
    trainerNames: mapping.trainerNames,
    trainerId: value.corrections.trainerId,
    secondTrainerId: value.corrections.secondTrainerId,
  });
  const missingFields: SyllabusProposalImport["missingFields"] = [];
  const trainerConfirmedByUser = Boolean(value.corrections.trainerId);
  if (!clientName) {
    missingFields.push("client");
  }
  if (
    !trainerResolution.trainers.length ||
    trainerResolution.unresolved.length ||
    (!trainerConfirmedByUser && mapping.trainerIdentification !== "Confirmed")
  ) {
    missingFields.push("trainer");
  }
  if (value.pricingInputs.numberOfParticipants <= 0) {
    missingFields.push("participants");
  }

  if (missingFields.length) {
    return saveSyllabusImport({
      ...value,
      status: "Needs Input",
      corrections: {
        ...value.corrections,
        clientName: value.corrections.clientName || mapping.clientName || "",
        trainerId:
          value.corrections.trainerId || trainerResolution.trainers[0]?.id || "",
        secondTrainerId:
          value.corrections.secondTrainerId || trainerResolution.trainers[1]?.id || "",
      },
      missingFields,
      errorMessage: "",
    });
  }

  const clientResult = await resolvePackageClient(
    {
      id: value.corrections.clientId ?? undefined,
      name: clientName,
    },
    clientName,
  );
  const [primaryTrainer, secondTrainer] = trainerResolution.trainers;
  const title = mapping.courseTitle.trim();
  const audience = mapping.audience.trim() || "To be confirmed";
  const duration = mapping.duration.trim() || "To be confirmed";
  const promise =
    mapping.programGoal.trim() ||
    mapping.proposalNarrative.courseObjectives[0] ||
    "Deliver the practical capabilities defined in the imported syllabus.";
  const proposalBrief = {
    ...emptyProposalBrief,
    coverHeading: "Customized Training Proposal",
    ...mapping.proposalBrief,
    objectives:
      mapping.proposalBrief.objectives || mapping.proposalNarrative.courseObjectives.join("\n"),
    expectedLearningOutcomes:
      mapping.proposalBrief.expectedLearningOutcomes ||
      mapping.proposalNarrative.expectedLearningOutcomes.join("\n"),
    contentPriorities:
      mapping.proposalBrief.contentPriorities ||
      mapping.proposalNarrative.contentOutlines.join("\n"),
    whoShouldAttend:
      mapping.proposalBrief.whoShouldAttend ||
      mapping.proposalNarrative.whoShouldAttend.join("\n"),
    methodology:
      mapping.proposalBrief.methodology ||
      mapping.proposalNarrative.trainingMethodology.join("\n"),
    trainingTools:
      mapping.proposalBrief.trainingTools ||
      mapping.proposalNarrative.trainingTools.join("\n"),
    evaluationApproach:
      mapping.proposalBrief.evaluationApproach ||
      mapping.proposalNarrative.trainingEvaluation.join("\n"),
    ...trainerSnapshotFields(primaryTrainer),
    ...(secondTrainer ? secondTrainerSnapshotFields(secondTrainer) : {}),
    includedItems: defaultIncludedItems,
    clientResponsibilities: defaultClientResponsibilities,
    vatStatus: value.pricingInputs.vatStatus,
    proposalDate: new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Bangkok",
    }).format(new Date()),
  };
  const input: TrainingPackageInput = {
    courseTitle: title,
    audience,
    duration,
    client: clientResult.client.name,
    promise,
    context: mapping.context,
    tone: "Executive, practical, commercially sharp",
    proposalBrief,
  };
  const outputs = normalizeTrainingOutputs(
    { proposalNarrative: mapping.proposalNarrative },
    input,
    value.pricingInputs,
  );
  const trainingPackage = buildPackageFromParts({
    id: value.id,
    createdAt: value.createdAt,
    clientId: clientResult.client.id,
    input,
    outputs,
    pricingInputs: value.pricingInputs,
    knowledgeUsed: [],
  });
  const saved = await saveTrainingPackage(trainingPackage);
  const opportunity = await ensureOpportunityForPackage(saved.package, actor).catch(
    () => null,
  );
  const delivery = await ensureDeliveryProjectForPackage(saved.package);
  if (opportunity) {
    await linkDeliveryToOpportunity(delivery.project, opportunity.opportunity);
  }
  value = await saveSyllabusImport({
    ...value,
    status: "Finalizing",
    packageId: saved.package.id,
    missingFields: [],
    errorMessage: "",
  });
  await saveAuditLog({
    actor,
    action: "package_generated_from_syllabus",
    entityType: "training_package",
    entityId: saved.package.id,
    metadata: {
      title: saved.package.title,
      client: saved.package.client,
      importId: value.id,
    },
  });
  return finalizeExistingPackage(value, actor);
}
