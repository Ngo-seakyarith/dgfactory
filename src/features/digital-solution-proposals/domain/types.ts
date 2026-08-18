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
  hostingAndRecurringCosts: string;
  paymentTerms: string;
  proposalValidity: string;
};

export type LegacySolutionModule = {
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

export type LegacyDigitalSolutionProposalContent = {
  coverHeading: string;
  solutionTitle: string;
  client: string;
  executiveSummary: string[];
  clientSituation: string[];
  discoveryFindings: string[];
  projectObjectives: string[];
  recommendedSolution: string[];
  solutionModules: LegacySolutionModule[];
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

export const solutionProposalSectionKeys = [
  "executive_summary",
  "client_situation",
  "project_objectives",
  "recommended_solution",
  "solution_scope",
  "user_experience",
  "architecture_integrations",
  "security_governance",
  "implementation",
  "deliverables",
  "client_responsibilities",
  "assumptions_risks",
  "commercial_terms",
  "next_steps",
] as const;

export type SolutionProposalSectionKey =
  (typeof solutionProposalSectionKeys)[number];

export type SolutionProposalParagraphBlock = {
  type: "paragraph";
  text: string;
};

export type SolutionProposalBulletListBlock = {
  type: "bullet_list";
  items: string[];
};

export type SolutionProposalNumberedListBlock = {
  type: "numbered_list";
  items: string[];
};

export type SolutionProposalCapabilityBlock = {
  type: "capabilities";
  items: Array<{
    name: string;
    description: string;
    value: string;
  }>;
};

export type SolutionProposalPhaseBlock = {
  type: "implementation_phases";
  items: SolutionImplementationPhase[];
};

export type SolutionProposalBlock =
  | SolutionProposalParagraphBlock
  | SolutionProposalBulletListBlock
  | SolutionProposalNumberedListBlock
  | SolutionProposalCapabilityBlock
  | SolutionProposalPhaseBlock;

export type SolutionProposalSection = {
  key: SolutionProposalSectionKey;
  title: string;
  blocks: SolutionProposalBlock[];
};

export type DigitalSolutionProposalContent = {
  version: 2;
  sections: SolutionProposalSection[];
};

export type SolutionProposalDocument = {
  coverHeading: string;
  solutionTitle: string;
  client: string;
  sections: SolutionProposalSection[];
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
  commercialInputs: SolutionCommercialInputs;
  evidenceAnalysis: CombinedDatasetAnalysis | null;
};

export type SolutionReviewBrainOutput = {
  solutionReview: SolutionReview;
};

export type DigitalSolutionProposalBrainInput = Omit<
  SolutionReviewBrainInput,
  "commercialInputs"
> & {
  solutionReview: SolutionReview;
};

export type DigitalSolutionProposalBrainOutput = {
  proposalContent: DigitalSolutionProposalContent;
};
