import type {
  CombinedDatasetAnalysis,
  DigitalSolutionProposal,
  DigitalSolutionProposalContent,
  SolutionCommercialInputs,
  SolutionProposalBrief,
  SolutionReview,
  SolutionType,
} from "./types";

export const emptySolutionProposalBrief: SolutionProposalBrief = {
  businessBackground: "",
  currentProblem: "",
  currentProcess: "",
  projectGoal: "",
  desiredOutcomes: "",
  targetUsers: "",
  userRoles: "",
  requiredFeatures: "",
  keyWorkflows: "",
  adminRequirements: "",
  contentRequirements: "",
  designDirection: "",
  languages: "",
  deviceRequirements: "",
  integrations: "",
  securityRequirements: "",
  domainAndHosting: "",
  timeline: "",
  budgetConstraints: "",
  trainingAndMaintenance: "",
  successMeasures: "",
  existingAssets: "",
  constraints: "",
};

export const emptySolutionCommercialInputs: SolutionCommercialInputs = {
  currency: "USD",
  lineItems: [],
  vatStatus: "Excluding VAT",
  paymentTerms: "",
  proposalValidity: "30 days",
};

export function calculateSolutionCommercialTotal(inputs: SolutionCommercialInputs) {
  return inputs.lineItems.reduce(
    (total, item) => total + (Number.isFinite(item.amount) ? item.amount : 0),
    0,
  );
}

export function formatSolutionCommercialSummary(inputs: SolutionCommercialInputs) {
  const validItems = inputs.lineItems.filter(
    (item) => item.description.trim() && item.amount > 0,
  );
  if (!validItems.length) return "No commercial pricing was supplied.";

  const total = calculateSolutionCommercialTotal(inputs);
  return [
    ...validItems.map(
      (item) =>
        `${item.description.trim()}: ${inputs.currency} ${item.amount.toFixed(2)}`,
    ),
    `Total: ${inputs.currency} ${total.toFixed(2)} (${inputs.vatStatus.toLowerCase()})`,
    inputs.paymentTerms ? `Payment terms: ${inputs.paymentTerms}` : "",
    inputs.proposalValidity ? `Proposal validity: ${inputs.proposalValidity}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function bullets(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

function section(title: string, body: string | string[]) {
  const value = Array.isArray(body) ? bullets(body) : body;
  return value.trim() ? `## ${title}\n\n${value.trim()}` : "";
}

export function solutionProposalContentToMarkdown(
  content: DigitalSolutionProposalContent,
  commercialInputs: SolutionCommercialInputs,
) {
  const modules = content.solutionModules
    .map((module, index) =>
      [
        `### ${index + 1}. ${module.name}`,
        module.purpose,
        module.inputs.length ? `**Inputs:** ${module.inputs.join(", ")}` : "",
        module.outputs.length ? `**Outputs:** ${module.outputs.join(", ")}` : "",
        module.userValue ? `**User value:** ${module.userValue}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    )
    .join("\n\n");
  const phases = content.implementationPhases
    .map((phase, index) =>
      [
        `### Phase ${index + 1}: ${phase.name}`,
        phase.duration ? `**Duration:** ${phase.duration}` : "",
        phase.activities.length ? `**Activities**\n${bullets(phase.activities)}` : "",
        phase.deliverables.length
          ? `**Deliverables**\n${bullets(phase.deliverables)}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    )
    .join("\n\n");
  const commercial = formatSolutionCommercialSummary(commercialInputs);

  return [
    `# ${content.coverHeading}`,
    `## ${content.solutionTitle}`,
    `**Prepared for:** ${content.client}`,
    section("Executive Summary", content.executiveSummary),
    section("Client Situation", content.clientSituation),
    section("Discovery Findings", content.discoveryFindings),
    section("Project Objectives", content.projectObjectives),
    section("Recommended Digital Solution", content.recommendedSolution),
    section("Solution Modules", modules),
    section("User Journeys", content.userJourneys),
    section("Interfaces and User Experience", content.interfacesAndExperiences),
    section("Architecture and Integrations", content.architectureAndIntegrations),
    section("Security and Governance", content.securityAndGovernance),
    section("Implementation Approach", phases),
    section("Project Deliverables", content.deliverables),
    section("Client Responsibilities", content.clientResponsibilities),
    section("Assumptions", content.assumptions),
    section("Risks and Items to Validate", content.risks),
    commercial !== "No commercial pricing was supplied."
      ? section("Professional Fee", commercial)
      : "",
    section("Recommended Next Steps", content.nextSteps),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function createSolutionProposal(
  values: {
    clientId?: string | null;
    clientName?: string;
    title?: string;
    solutionType?: SolutionType;
    brief?: Partial<SolutionProposalBrief>;
  } = {},
  createdBy: string | null = null,
): DigitalSolutionProposal {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    clientId: values.clientId ?? null,
    clientName: values.clientName ?? "",
    title: values.title ?? "",
    solutionType: values.solutionType ?? "Web Application",
    brief: { ...emptySolutionProposalBrief, ...values.brief },
    status: "Draft",
    files: [],
    evidenceAnalysis: null,
    solutionReview: null,
    proposalContent: null,
    commercialInputs: emptySolutionCommercialInputs,
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeSolutionReview(value: SolutionReview): SolutionReview {
  return {
    evidenceBasis:
      value.evidenceBasis === "Brief and source data"
        ? "Brief and source data"
        : "Brief only",
    executiveSummary: String(value.executiveSummary ?? "").trim(),
    confirmedRequirements: value.confirmedRequirements?.filter(Boolean) ?? [],
    userGroups: value.userGroups?.filter(Boolean) ?? [],
    keyWorkflows: value.keyWorkflows?.filter(Boolean) ?? [],
    recommendedCapabilities:
      value.recommendedCapabilities?.filter(
        (item) => item?.title && item?.capability,
      ) ?? [],
    evidenceFindings:
      value.evidenceFindings?.filter((item) => item?.title && item?.detail) ?? [],
    technicalConsiderations: value.technicalConsiderations?.filter(Boolean) ?? [],
    assumptions: value.assumptions?.filter(Boolean) ?? [],
    risks: value.risks?.filter(Boolean) ?? [],
    questions: value.questions?.filter(Boolean) ?? [],
    userNotes: String(value.userNotes ?? "").trim(),
  };
}

export function safeEvidenceForBrain(analysis: CombinedDatasetAnalysis | null) {
  if (!analysis) return null;
  return {
    ...analysis,
    profiles: analysis.profiles.map((profile) => ({
      ...profile,
      sheets: profile.sheets
        .filter((sheet) => sheet.included)
        .map((sheet) => ({
          ...sheet,
          columns: sheet.columns.map((column) => ({
            ...column,
            sampleValues: column.sensitive ? [] : column.sampleValues,
            numericSummary: column.sensitive ? null : column.numericSummary,
            dateSummary: column.sensitive ? null : column.dateSummary,
          })),
          maskedSampleRows: sheet.maskedSampleRows.map((row) =>
            Object.fromEntries(
              Object.entries(row).map(([key, value]) => {
                const column = sheet.columns.find((item) => item.name === key);
                return [key, column?.sensitive ? "[REDACTED]" : value];
              }),
            ),
          ),
        })),
    })),
  };
}
