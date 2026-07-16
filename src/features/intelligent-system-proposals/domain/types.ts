export const systemProposalStatuses = [
  "Draft",
  "Analyzing",
  "Analysis Ready",
  "Generated",
  "Failed",
] as const;

export type SystemProposalStatus = (typeof systemProposalStatuses)[number];
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

export type AnalystFinding = {
  title: string;
  detail: string;
  evidence: string;
  severity: "low" | "medium" | "high";
};

export type SystemOpportunity = {
  title: string;
  problem: string;
  evidence: string;
  capability: string;
  expectedValue: string;
  confidence: "low" | "medium" | "high";
};

export type AnalystReview = {
  executiveSummary: string;
  detectedProcesses: string[];
  dataQualityFindings: AnalystFinding[];
  candidateKpis: string[];
  opportunities: SystemOpportunity[];
  risks: string[];
  questions: string[];
  userNotes: string;
};

export type SystemProposalBrief = {
  clientId: string | null;
  clientName: string;
  projectTitle: string;
  businessGoal: string;
  currentProcess: string;
  desiredOutcomes: string;
  constraints: string;
  integrations: string;
};

export type SystemCommercialLineItem = {
  id: string;
  description: string;
  amount: number;
};

export type SystemCommercialInputs = {
  currency: string;
  lineItems: SystemCommercialLineItem[];
  vatStatus: "Including VAT" | "Excluding VAT";
  paymentTerms: string;
  proposalValidity: string;
};

export type SystemProposalModule = {
  name: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
  userValue: string;
};

export type SystemImplementationPhase = {
  name: string;
  duration: string;
  activities: string[];
  deliverables: string[];
};

export type IntelligentSystemProposalContent = {
  coverHeading: string;
  solutionTitle: string;
  client: string;
  executiveSummary: string[];
  clientSituation: string[];
  evidenceFindings: string[];
  objectives: string[];
  recommendedSystem: string[];
  modules: SystemProposalModule[];
  userWorkflows: string[];
  dashboardsAndAi: string[];
  dataFlowAndIntegrations: string[];
  securityAndGovernance: string[];
  implementationPhases: SystemImplementationPhase[];
  deliverables: string[];
  clientResponsibilities: string[];
  assumptions: string[];
  risks: string[];
  nextSteps: string[];
};

export type SystemSourceFile = {
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

export type IntelligentSystemProposal = {
  id: string;
  brief: SystemProposalBrief;
  status: SystemProposalStatus;
  files: SystemSourceFile[];
  combinedAnalysis: CombinedDatasetAnalysis | null;
  analystReview: AnalystReview | null;
  proposalContent: IntelligentSystemProposalContent | null;
  commercialInputs: SystemCommercialInputs;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DataDiscoveryBrainInput = {
  brief: SystemProposalBrief;
  analysis: CombinedDatasetAnalysis;
};

export type DataDiscoveryBrainOutput = {
  analystReview: AnalystReview;
};

export type SystemProposalBrainInput = {
  brief: SystemProposalBrief;
  analysis: CombinedDatasetAnalysis;
  analystReview: AnalystReview;
  commercialSummary: string;
};

export type SystemProposalBrainOutput = {
  proposalContent: IntelligentSystemProposalContent;
};

