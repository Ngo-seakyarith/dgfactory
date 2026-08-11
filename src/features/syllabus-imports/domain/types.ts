import type { PricingInputs } from "@/features/training-packages";
import type { ProposalNarrative } from "@/features/training-packages/domain/proposal-narrative";

export const syllabusImportStatuses = [
  "Uploaded",
  "Processing",
  "Needs Input",
  "Finalizing",
  "Completed",
  "Failed",
] as const;

export type SyllabusImportStatus = (typeof syllabusImportStatuses)[number];

type SourceDocumentLocation = {
  location?: string;
};

export type SourceDocumentBlock =
  | ({ type: "heading"; level: number; text: string } & SourceDocumentLocation)
  | ({ type: "paragraph"; text: string } & SourceDocumentLocation)
  | ({ type: "list"; ordered: boolean; items: string[] } & SourceDocumentLocation)
  | ({ type: "table"; rows: string[][] } & SourceDocumentLocation)
  | ({ type: "header" | "footer"; text: string } & SourceDocumentLocation);

export type SyllabusProposalBriefMapping = {
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
};

export type SyllabusProposalMapping = {
  courseTitle: string;
  clientName: string | null;
  audience: string;
  participantCount: number | null;
  duration: string;
  programGoal: string;
  context: string;
  trainerNames: string[];
  trainerIdentification: "Confirmed" | "Unclear" | "Missing";
  proposalBrief: SyllabusProposalBriefMapping;
  proposalNarrative: ProposalNarrative;
};

export type SyllabusImportCorrections = {
  clientId: string | null;
  clientName: string;
  trainerId: string;
  secondTrainerId: string;
};

export type SyllabusProposalImport = {
  id: string;
  status: SyllabusImportStatus;
  originalName: string;
  storagePath: string | null;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  pricingInputs: PricingInputs;
  mapping: SyllabusProposalMapping | null;
  corrections: SyllabusImportCorrections;
  missingFields: Array<"client" | "trainer" | "participants">;
  packageId: string | null;
  errorMessage: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SyllabusProposalBrainInput = {
  document: SourceDocumentBlock[];
  approvedTrainerNames: string[];
};

export type SyllabusProposalBrainOutput = {
  mapping: SyllabusProposalMapping;
};
