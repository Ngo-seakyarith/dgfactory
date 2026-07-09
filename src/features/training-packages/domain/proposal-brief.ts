import { getTrainerById, trainerSnapshotFields } from "./trainers";

export type ProposalBrief = {
  coverHeading: string;
  coverSubtitle: string;
  certificationLabel: string;
  clientBackground: string;
  trainingNeed: string;
  objectives: string;
  expectedLearningOutcomes: string;
  contentPriorities: string;
  whoShouldAttend: string;
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
  includedItems: string;
  clientResponsibilities: string;
  billingArrangement: string;
  paymentInstructions: string;
  vatStatus: string;
  acceptanceDeadline: string;
  proposalDate: string;
  signatoryName: string;
  signatoryTitle: string;
};

export const defaultBillingArrangement =
  "The professional fee 100% shall be made to DG Academy before the training date.";

export const defaultPaymentInstructions =
  "Payment shall be made in either cash or check or bank transfer to DG Academy's account No: 34730640543314/ DGACADEMY of ACLEDA Bank. Bank slip shall be sent to DG Academy should the payment is made through bank transfer.";

export const emptyProposalBrief: ProposalBrief = {
  coverHeading: "",
  coverSubtitle: "",
  certificationLabel: "",
  clientBackground: "",
  trainingNeed: "",
  objectives: "",
  expectedLearningOutcomes: "",
  contentPriorities: "",
  whoShouldAttend: "",
  methodology: "",
  trainingTools: "",
  evaluationApproach: "",
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
  includedItems: "",
  clientResponsibilities: "",
  billingArrangement: defaultBillingArrangement,
  paymentInstructions: defaultPaymentInstructions,
  vatStatus: "Excluding VAT",
  acceptanceDeadline: "",
  proposalDate: "",
  signatoryName: "",
  signatoryTitle: "",
};

export function normalizeProposalBrief(value?: Partial<ProposalBrief> | null): ProposalBrief {
  const normalized = Object.fromEntries(
    Object.keys(emptyProposalBrief).map((key) => [
      key,
      String(value?.[key as keyof ProposalBrief] ?? "").trim(),
    ]),
  ) as ProposalBrief;
  const trainer = getTrainerById(normalized.trainerId);
  normalized.billingArrangement =
    normalized.billingArrangement || defaultBillingArrangement;
  normalized.paymentInstructions =
    normalized.paymentInstructions || defaultPaymentInstructions;
  normalized.vatStatus = normalized.vatStatus || emptyProposalBrief.vatStatus;

  return trainer ? { ...normalized, ...trainerSnapshotFields(trainer) } : normalized;
}
