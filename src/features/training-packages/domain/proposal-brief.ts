import {
  emptySecondTrainerSnapshotFields,
  getTrainerById,
  secondTrainerSnapshotFields,
  trainerSnapshotFields,
} from "./trainers";

export type ProposalBrief = {
  coverSubtitle: string;
  certificationLabel: string;
  clientBackground: string;
  trainingNeed: string;
  expectedLearningOutcomes: string;
  contentPriorities: string;
  methodology: string;
  trainingTools: string;
  evaluationApproach: string;
  scheduleDate: string;
  scheduleTime: string;
  scheduleVenue: string;
  trainerId: string;
  trainerImageUrl: string;
  trainerName: string;
  trainerTitle: string;
  trainerBio: string;
  trainerExperience: string;
  trainerQualifications: string;
  secondTrainerId: string;
  secondTrainerImageUrl: string;
  secondTrainerName: string;
  secondTrainerTitle: string;
  secondTrainerBio: string;
  secondTrainerExperience: string;
  secondTrainerQualifications: string;
  includedItems: string;
  clientResponsibilities: string;
  billingArrangement: string;
  paymentInstructions: string;
  acceptanceDeadline: string;
  proposalDate: string;
};

export const defaultMethodology = [
  "30% theory and 70% practice",
  "Short, focused inputs of 15 to 20 minutes with immediate real-world application",
  "Live demonstrations and worked examples drawn from the participants' sector",
  "Structured exercises and case-based practice",
  "Small group sharing and discussion after each module",
  "Learning recap and an action plan for the key takeaways",
].join("\n");

export const defaultTrainingTools = [
  "Practical templates and planning worksheets",
  "Self-assessment of participant capability",
  "Training handouts and exercise materials",
  "Certificate of training",
  "Action plan template for post-training application",
].join("\n");

export const defaultEvaluationApproach = [
  "Pre-training assessment conducted online to capture participant needs and expectations",
  "In-class observation of engagement and skill application during practical exercises",
  "Learning-in-action activities completed during the session",
  "Post-course feedback survey on content, delivery, and overall impact",
].join("\n");

export const defaultIncludedItems = [
  "Pre-training consultation and program customization",
  "Professional facilitation and training delivery",
  "Digital participant materials and practical templates",
  "Certificates of completion",
  "Pre-training and post-training evaluation",
].join("\n");

export const defaultClientResponsibilities = [
  "Confirm the participant list and learning priorities",
  "Provide the training venue, display equipment, internet access, and refreshments",
  "Ensure participants bring laptops and can access approved tools",
  "Nominate a focal person for logistics and final coordination",
].join("\n");

export const defaultBillingArrangement =
  "The professional fee 100% shall be made to DG Academy before the training date.";

export const defaultPaymentInstructions =
  "Payment shall be made in either cash or check or bank transfer to DG Academy's account No: 34730640543314/ DGACADEMY of ACLEDA Bank. Bank slip shall be sent to DG Academy should the payment is made through bank transfer.";

export const emptyProposalBrief: ProposalBrief = {
  coverSubtitle: "",
  certificationLabel: "",
  clientBackground: "",
  trainingNeed: "",
  expectedLearningOutcomes: "",
  contentPriorities: "",
  methodology: defaultMethodology,
  trainingTools: defaultTrainingTools,
  evaluationApproach: defaultEvaluationApproach,
  scheduleDate: "",
  scheduleTime: "",
  scheduleVenue: "",
  trainerId: "",
  trainerImageUrl: "",
  trainerName: "",
  trainerTitle: "",
  trainerBio: "",
  trainerExperience: "",
  trainerQualifications: "",
  ...emptySecondTrainerSnapshotFields,
  includedItems: defaultIncludedItems,
  clientResponsibilities: defaultClientResponsibilities,
  billingArrangement: defaultBillingArrangement,
  paymentInstructions: defaultPaymentInstructions,
  acceptanceDeadline: "",
  proposalDate: "",
};

export function normalizeProposalBrief(value?: Partial<ProposalBrief> | null): ProposalBrief {
  const normalized = Object.fromEntries(
    Object.keys(emptyProposalBrief).map((key) => [
      key,
      String(value?.[key as keyof ProposalBrief] ?? "").trim(),
    ]),
  ) as ProposalBrief;
  const trainer = getTrainerById(normalized.trainerId);
  const secondTrainer = getTrainerById(normalized.secondTrainerId);
  normalized.methodology = normalized.methodology || defaultMethodology;
  normalized.trainingTools = normalized.trainingTools || defaultTrainingTools;
  normalized.evaluationApproach =
    normalized.evaluationApproach || defaultEvaluationApproach;
  normalized.includedItems = normalized.includedItems || defaultIncludedItems;
  normalized.clientResponsibilities =
    normalized.clientResponsibilities || defaultClientResponsibilities;
  normalized.billingArrangement =
    normalized.billingArrangement || defaultBillingArrangement;
  normalized.paymentInstructions =
    normalized.paymentInstructions || defaultPaymentInstructions;

  const withPrimary = trainer
    ? { ...normalized, ...trainerSnapshotFields(trainer) }
    : normalized;

  if (!secondTrainer || secondTrainer.id === trainer?.id) {
    return { ...withPrimary, ...emptySecondTrainerSnapshotFields };
  }

  return { ...withPrimary, ...secondTrainerSnapshotFields(secondTrainer) };
}
