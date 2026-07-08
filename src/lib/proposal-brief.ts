export type ProposalBrief = {
  coverHeading: string;
  coverSubtitle: string;
  certificationLabel: string;
  clientBackground: string;
  trainingNeed: string;
  objectives: string;
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
  includedItems: string;
  clientResponsibilities: string;
  billingArrangement: string;
  paymentInstructions: string;
  acceptanceDeadline: string;
  proposalDate: string;
  signatoryName: string;
  signatoryTitle: string;
};

export const emptyProposalBrief: ProposalBrief = {
  coverHeading: "",
  coverSubtitle: "",
  certificationLabel: "",
  clientBackground: "",
  trainingNeed: "",
  objectives: "",
  contentPriorities: "",
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
  billingArrangement: "",
  paymentInstructions: "",
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

  return trainer ? { ...normalized, ...trainerSnapshotFields(trainer) } : normalized;
}
import { getTrainerById, trainerSnapshotFields } from "@/lib/trainers";
