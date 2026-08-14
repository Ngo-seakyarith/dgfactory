export const solutionProposalStatuses = [
  "Draft",
  "Reviewing",
  "Review Ready",
  "Generated",
  "Failed",
] as const;

export const solutionTypes = [
  "Business Website",
  "Web Application",
  "Internal Business System",
  "Customer Portal",
  "E-commerce",
  "Data and Reporting System",
  "AI-enabled System",
  "Other",
] as const;

export type SolutionProposalStatus = (typeof solutionProposalStatuses)[number];
export type SolutionType = (typeof solutionTypes)[number];
export type SourceFileStatus = "Uploaded" | "Analyzing" | "Ready" | "Failed";
export type ColumnDataType =
  | "empty"
  | "string"
  | "number"
  | "date"
  | "boolean"
  | "mixed";

export type NumericSummary = {
  minimum: number;
  maximum: number;
  average: number;
  total: number;
};

export type DateSummary = {
  earliest: string;
  latest: string;
};

export type ColumnProfile = {
  name: string;
  inferredType: ColumnDataType;
  nonEmptyCount: number;
  missingCount: number;
  distinctCount: number;
  sensitive: boolean;
  sensitiveReason: string;
  userDescription: string;
  sampleValues: string[];
  numericSummary: NumericSummary | null;
  dateSummary: DateSummary | null;
  roles: Array<"identifier" | "metric" | "category" | "date">;
};

export type SheetProfile = {
  name: string;
  included: boolean;
  rowCount: number;
  analyzedRowCount: number;
  columnCount: number;
  formulaCount: number;
  duplicateRows: number;
  partial: boolean;
  columns: ColumnProfile[];
  maskedSampleRows: Record<string, string>[];
  warnings: string[];
};

export type DatasetProfile = {
  fileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  totalRows: number;
  analyzedRows: number;
  partial: boolean;
  sheets: SheetProfile[];
  warnings: string[];
};

export type DatasetRelationship = {
  field: string;
  sources: string[];
  confidence: "low" | "medium" | "high";
  evidence: string;
};

export type CombinedDatasetAnalysis = {
  profiles: DatasetProfile[];
  totalFiles: number;
  totalSheets: number;
  totalRows: number;
  analyzedRows: number;
  partial: boolean;
  relationships: DatasetRelationship[];
  warnings: string[];
};

export type EvidenceFinding = {
  title: string;
  detail: string;
  evidence: string;
  severity: "low" | "medium" | "high";
};

export type RecommendedCapability = {
  title: string;
  problem: string;
  rationale: string;
  capability: string;
  userValue: string;
  basis: "Brief" | "Evidence" | "Assumption";
  confidence: "low" | "medium" | "high";
};

export type SolutionReview = {
  evidenceBasis: "Brief only" | "Brief and source data";
  executiveSummary: string;
  confirmedRequirements: string[];
  userGroups: string[];
  keyWorkflows: string[];
  recommendedCapabilities: RecommendedCapability[];
  evidenceFindings: EvidenceFinding[];
  technicalConsiderations: string[];
  assumptions: string[];
  risks: string[];
  questions: string[];
  userNotes: string;
};

export type SolutionProposalBrief = {
  businessBackground: string;
  currentWorkflowAndChallenges: string;
  projectGoal: string;
  desiredOutcomes: string;
  targetUsers: string;
  userRoles: string;
  requiredFeatures: string;
  keyWorkflows: string;
  adminRequirements: string;
  contentRequirements: string;
  designDirection: string;
  languages: string;
  deviceRequirements: string;
  integrations: string;
  securityRequirements: string;
  domainAndHosting: string;
  timeline: string;
  budgetConstraints: string;
  trainingAndMaintenance: string;
  successMeasures: string;
  existingAssets: string;
  constraints: string;
};

export type SolutionCommercialLineItem = {
  id: string;
  description: string;
  amount: number;
};

export type SolutionCommercialInputs = {
  currency: string;
  lineItems: SolutionCommercialLineItem[];
  vatStatus: "Including VAT" | "Excluding VAT";
  paymentTerms: string;
  proposalValidity: string;
};

export type SolutionModule = {
  name: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
  userValue: string;
};

export type SolutionImplementationPhase = {
  name: string;
  duration: string;
  activities: string[];
  deliverables: string[];
};

export type DigitalSolutionProposalContent = {
  coverHeading: string;
  solutionTitle: string;
  client: string;
  executiveSummary: string[];
  clientSituation: string[];
  discoveryFindings: string[];
  projectObjectives: string[];
  recommendedSolution: string[];
  solutionModules: SolutionModule[];
  userJourneys: string[];
  interfacesAndExperiences: string[];
  architectureAndIntegrations: string[];
  securityAndGovernance: string[];
  implementationPhases: SolutionImplementationPhase[];
  deliverables: string[];
  clientResponsibilities: string[];
  assumptions: string[];
  risks: string[];
  nextSteps: string[];
};

export type SolutionSourceFile = {
  id: string;
  proposalId: string;
  originalName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  status: SourceFileStatus;
  analysis: DatasetProfile | null;
  errorMessage: string;
  createdAt: string;
  updatedAt: string;
};

export type DigitalSolutionProposal = {
  id: string;
  clientId: string | null;
  clientName: string;
  title: string;
  solutionType: SolutionType;
  brief: SolutionProposalBrief;
  status: SolutionProposalStatus;
  files: SolutionSourceFile[];
  evidenceAnalysis: CombinedDatasetAnalysis | null;
  solutionReview: SolutionReview | null;
  proposalContent: DigitalSolutionProposalContent | null;
  commercialInputs: SolutionCommercialInputs;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SolutionReviewBrainInput = {
  clientName: string;
  projectTitle: string;
  solutionType: SolutionType;
  brief: SolutionProposalBrief;
  evidenceAnalysis: CombinedDatasetAnalysis | null;
};

export type SolutionReviewBrainOutput = {
  solutionReview: SolutionReview;
};

export type DigitalSolutionProposalBrainInput = SolutionReviewBrainInput & {
  solutionReview: SolutionReview;
  commercialSummary: string;
};

export type DigitalSolutionProposalBrainOutput = {
  proposalContent: DigitalSolutionProposalContent;
};
