import type {
  AnalystReview,
  CombinedDatasetAnalysis,
  IntelligentSystemProposal,
  IntelligentSystemProposalContent,
  SystemCommercialInputs,
  SystemProposalBrief,
} from "./types";

export const emptySystemProposalBrief: SystemProposalBrief = {
  clientId: null,
  clientName: "",
  projectTitle: "",
  businessGoal: "",
  currentProcess: "",
  desiredOutcomes: "",
  constraints: "",
  integrations: "",
};

export const emptySystemCommercialInputs: SystemCommercialInputs = {
  currency: "USD",
  lineItems: [],
  vatStatus: "Excluding VAT",
  paymentTerms: "",
  proposalValidity: "30 days",
};

export function calculateSystemCommercialTotal(inputs: SystemCommercialInputs) {
  return inputs.lineItems.reduce(
    (total, item) => total + (Number.isFinite(item.amount) ? item.amount : 0),
    0,
  );
}

export function formatSystemCommercialSummary(inputs: SystemCommercialInputs) {
  const validItems = inputs.lineItems.filter(
    (item) => item.description.trim() && item.amount > 0,
  );
  if (!validItems.length) return "No commercial pricing was supplied.";

  const total = calculateSystemCommercialTotal(inputs);
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

export function systemProposalContentToMarkdown(
  content: IntelligentSystemProposalContent,
  commercialInputs: SystemCommercialInputs,
) {
  const modules = content.modules
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
  const commercial = formatSystemCommercialSummary(commercialInputs);

  return [
    `# ${content.coverHeading}`,
    `## ${content.solutionTitle}`,
    `**Prepared for:** ${content.client}`,
    section("Executive Summary", content.executiveSummary),
    section("Client Situation", content.clientSituation),
    section("Evidence from the Supplied Data", content.evidenceFindings),
    section("Project Objectives", content.objectives),
    section("Recommended Intelligent System", content.recommendedSystem),
    section("Proposed System Modules", modules),
    section("User Workflows", content.userWorkflows),
    section("Dashboards and AI Capabilities", content.dashboardsAndAi),
    section("Data Flow and Integrations", content.dataFlowAndIntegrations),
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

export function createSystemProposal(
  brief: Partial<SystemProposalBrief> = {},
  createdBy: string | null = null,
): IntelligentSystemProposal {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    brief: { ...emptySystemProposalBrief, ...brief },
    status: "Draft",
    files: [],
    combinedAnalysis: null,
    analystReview: null,
    proposalContent: null,
    commercialInputs: emptySystemCommercialInputs,
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeAnalystReview(value: AnalystReview): AnalystReview {
  return {
    executiveSummary: String(value.executiveSummary ?? "").trim(),
    detectedProcesses: value.detectedProcesses?.filter(Boolean) ?? [],
    dataQualityFindings: value.dataQualityFindings?.filter(
      (item) => item?.title && item?.detail,
    ) ?? [],
    candidateKpis: value.candidateKpis?.filter(Boolean) ?? [],
    opportunities: value.opportunities?.filter(
      (item) => item?.title && item?.capability,
    ) ?? [],
    risks: value.risks?.filter(Boolean) ?? [],
    questions: value.questions?.filter(Boolean) ?? [],
    userNotes: String(value.userNotes ?? "").trim(),
  };
}

export function safeAnalysisForBrain(analysis: CombinedDatasetAnalysis) {
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
