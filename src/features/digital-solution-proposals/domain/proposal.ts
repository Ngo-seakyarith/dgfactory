import type {
  CombinedDatasetAnalysis,
  DigitalSolutionProposal,
  DigitalSolutionProposalContent,
  LegacyDigitalSolutionProposalContent,
  SolutionCommercialInputs,
  SolutionProposalBlock,
  SolutionProposalBrief,
  SolutionProposalDocument,
  SolutionProposalSection,
  SolutionProposalSectionKey,
  SolutionReview,
  SolutionType,
} from "./types";
import { solutionProposalSectionKeys } from "./types";

export const emptySolutionProposalBrief: SolutionProposalBrief = {
  businessBackground: "",
  currentWorkflowAndChallenges: "",
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
  hostingAndRecurringCosts: "",
  paymentTerms: "",
  proposalValidity: "30 days",
};

export function normalizeSolutionCommercialInputs(
  value: Partial<SolutionCommercialInputs> | null | undefined,
): SolutionCommercialInputs {
  const rawCurrency = String(value?.currency ?? "USD").trim();
  const amountEnteredAsCurrency = /^\d+(?:\.\d+)?$/.test(rawCurrency)
    ? Number(rawCurrency)
    : 0;
  const lineItems = Array.isArray(value?.lineItems)
    ? value.lineItems
        .map((item) => ({
          id: String(item?.id || crypto.randomUUID()),
          description: String(item?.description ?? "").trim(),
          amount: Number(item?.amount) || 0,
        }))
        .filter((item) => item.description || item.amount > 0)
    : [];

  if (amountEnteredAsCurrency > 0 && !lineItems.length) {
    lineItems.push({
      id: "professional-fee",
      description: "Professional fee",
      amount: amountEnteredAsCurrency,
    });
  }

  return {
    currency: amountEnteredAsCurrency > 0 ? "USD" : rawCurrency || "USD",
    lineItems,
    vatStatus:
      value?.vatStatus === "Including VAT" ? "Including VAT" : "Excluding VAT",
    hostingAndRecurringCosts: String(value?.hostingAndRecurringCosts ?? ""),
    paymentTerms: String(value?.paymentTerms ?? ""),
    proposalValidity: String(value?.proposalValidity ?? "30 days"),
  };
}

export function calculateSolutionCommercialTotal(inputs: SolutionCommercialInputs) {
  return inputs.lineItems.reduce(
    (total, item) => total + (Number.isFinite(item.amount) ? item.amount : 0),
    0,
  );
}

const legacySectionTitles: Record<
  Exclude<SolutionProposalSectionKey, "commercial_terms">,
  string
> = {
  executive_summary: "Executive Summary",
  client_situation: "Client Situation",
  project_objectives: "Project Objectives",
  recommended_solution: "Recommended Digital Solution",
  solution_scope: "Solution Scope",
  user_experience: "User Experience",
  architecture_integrations: "Architecture and Integrations",
  security_governance: "Security and Governance",
  implementation: "Implementation Approach",
  deliverables: "Project Deliverables",
  client_responsibilities: "Client Responsibilities",
  assumptions_risks: "Assumptions, Risks, and Items to Validate",
  next_steps: "Recommended Next Steps",
};

function textItems(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];
}

function bulletSection(
  key: Exclude<SolutionProposalSectionKey, "commercial_terms">,
  items: unknown,
): SolutionProposalSection | null {
  const values = textItems(items);
  return values.length
    ? {
        key,
        title: legacySectionTitles[key],
        blocks: [{ type: "bullet_list", items: values }],
      }
    : null;
}

function normalizeBlock(value: unknown): SolutionProposalBlock | null {
  if (!value || typeof value !== "object") return null;
  const block = value as Record<string, unknown>;
  if (block.type === "paragraph") {
    const text = String(block.text ?? "").trim();
    return text ? { type: "paragraph", text } : null;
  }
  if (block.type === "bullet_list" || block.type === "numbered_list") {
    const items = textItems(block.items);
    return items.length ? { type: block.type, items } : null;
  }
  if (block.type === "capabilities" && Array.isArray(block.items)) {
    const items = block.items.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const capability = item as Record<string, unknown>;
      const name = String(capability.name ?? "").trim();
      const description = String(capability.description ?? "").trim();
      const valueText = String(capability.value ?? "").trim();
      return name && description
        ? [{ name, description, value: valueText }]
        : [];
    });
    return items.length ? { type: "capabilities", items } : null;
  }
  if (block.type === "implementation_phases" && Array.isArray(block.items)) {
    const items = block.items.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const phase = item as Record<string, unknown>;
      const name = String(phase.name ?? "").trim();
      if (!name) return [];
      return [
        {
          name,
          duration: String(phase.duration ?? "").trim(),
          activities: textItems(phase.activities),
          deliverables: textItems(phase.deliverables),
        },
      ];
    });
    return items.length ? { type: "implementation_phases", items } : null;
  }
  return null;
}

function normalizeVersionTwoContent(
  value: Record<string, unknown>,
): DigitalSolutionProposalContent | null {
  if (value.version !== 2 || !Array.isArray(value.sections)) return null;
  const validKeys = new Set<string>([
    ...Object.keys(legacySectionTitles),
    "commercial_terms",
  ]);
  const sections = value.sections.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const section = item as Record<string, unknown>;
    const key = String(section.key ?? "") as SolutionProposalSectionKey;
    const title = String(section.title ?? "").trim();
    const blocks = Array.isArray(section.blocks)
      ? section.blocks.map(normalizeBlock).filter((block): block is SolutionProposalBlock => Boolean(block))
      : [];
    return validKeys.has(key) && title && blocks.length
      ? [{ key, title, blocks }]
      : [];
  });
  return sections.length ? { version: 2, sections } : null;
}

function convertLegacyContent(
  value: LegacyDigitalSolutionProposalContent,
): DigitalSolutionProposalContent | null {
  const sections: Array<SolutionProposalSection | null> = [
    bulletSection("executive_summary", value.executiveSummary),
    bulletSection("client_situation", [
      ...textItems(value.clientSituation),
      ...textItems(value.discoveryFindings),
    ]),
    bulletSection("project_objectives", value.projectObjectives),
    bulletSection("recommended_solution", value.recommendedSolution),
    Array.isArray(value.solutionModules) && value.solutionModules.length
      ? {
          key: "solution_scope",
          title: legacySectionTitles.solution_scope,
          blocks: [
            {
              type: "capabilities",
              items: value.solutionModules.map((module) => ({
                name: String(module.name ?? "").trim(),
                description: [
                  String(module.purpose ?? "").trim(),
                  textItems(module.inputs).length
                    ? `Inputs: ${textItems(module.inputs).join(", ")}.`
                    : "",
                  textItems(module.outputs).length
                    ? `Outputs: ${textItems(module.outputs).join(", ")}.`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" "),
                value: String(module.userValue ?? "").trim(),
              })),
            },
          ],
        }
      : null,
    bulletSection("user_experience", [
      ...textItems(value.userJourneys),
      ...textItems(value.interfacesAndExperiences),
    ]),
    bulletSection("architecture_integrations", value.architectureAndIntegrations),
    bulletSection("security_governance", value.securityAndGovernance),
    Array.isArray(value.implementationPhases) && value.implementationPhases.length
      ? {
          key: "implementation",
          title: legacySectionTitles.implementation,
          blocks: [{ type: "implementation_phases", items: value.implementationPhases }],
        }
      : null,
    bulletSection("deliverables", value.deliverables),
    bulletSection("client_responsibilities", value.clientResponsibilities),
    bulletSection("assumptions_risks", [
      ...textItems(value.assumptions),
      ...textItems(value.risks),
    ]),
    bulletSection("next_steps", value.nextSteps),
  ];
  const normalized = sections.filter(
    (section): section is SolutionProposalSection => Boolean(section),
  );
  return normalized.length ? { version: 2, sections: normalized } : null;
}

export function normalizeDigitalSolutionProposalContent(
  value: unknown,
): DigitalSolutionProposalContent | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return (
    normalizeVersionTwoContent(record) ??
    convertLegacyContent(record as unknown as LegacyDigitalSolutionProposalContent)
  );
}

function commercialSection(
  inputs: SolutionCommercialInputs,
): SolutionProposalSection | null {
  const lineItems = inputs.lineItems.filter(
    (item) => item.description.trim() && item.amount > 0,
  );
  const recurringCosts = inputs.hostingAndRecurringCosts
    .split(/\r?\n/)
    .map((item) => item.replace(/^[-*\u2022]\s*/, "").trim())
    .filter(Boolean);
  const paymentTerms = inputs.paymentTerms.trim();
  if (!lineItems.length && !recurringCosts.length && !paymentTerms) return null;
  const total = calculateSolutionCommercialTotal(inputs);
  const items = [
    ...lineItems.map(
      (item) =>
        `${item.description.trim()}: ${inputs.currency} ${item.amount.toFixed(2)}`,
    ),
    lineItems.length
      ? `Total: ${inputs.currency} ${total.toFixed(2)} (${inputs.vatStatus.toLowerCase()})`
      : "",
    ...recurringCosts,
    paymentTerms ? `Payment terms: ${paymentTerms}` : "",
    inputs.proposalValidity.trim()
      ? `Proposal validity: ${inputs.proposalValidity.trim()}`
      : "",
  ].filter(Boolean);
  return items.length
    ? {
        key: "commercial_terms",
        title: "Commercial Terms",
        blocks: [{ type: "bullet_list", items }],
      }
    : null;
}

export function composeSolutionProposalDocument(
  proposal: DigitalSolutionProposal,
): SolutionProposalDocument | null {
  const content = normalizeDigitalSolutionProposalContent(proposal.proposalContent);
  if (!content) return null;
  const commercial = commercialSection(proposal.commercialInputs);
  const sections = content.sections.filter(
    (section) => section.key !== "commercial_terms",
  );
  if (commercial) sections.push(commercial);
  const sectionOrder = new Map(
    solutionProposalSectionKeys.map((key, index) => [key, index]),
  );
  sections.sort(
    (left, right) =>
      (sectionOrder.get(left.key) ?? Number.MAX_SAFE_INTEGER) -
      (sectionOrder.get(right.key) ?? Number.MAX_SAFE_INTEGER),
  );
  return {
    coverHeading: "Digital Solution Proposal",
    solutionTitle: proposal.title,
    client: proposal.clientName,
    sections,
  };
}

function blockToMarkdown(block: SolutionProposalBlock) {
  if (block.type === "paragraph") return block.text;
  if (block.type === "bullet_list") {
    return block.items.map((item) => `- ${item}`).join("\n");
  }
  if (block.type === "numbered_list") {
    return block.items.map((item, index) => `${index + 1}. ${item}`).join("\n");
  }
  if (block.type === "capabilities") {
    return block.items
      .map((item) =>
        [
          `### ${item.name}`,
          item.description,
          item.value ? `**Client value:** ${item.value}` : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
      )
      .join("\n\n");
  }
  return block.items
    .map((phase, index) =>
      [
        `### Phase ${index + 1}: ${phase.name}`,
        phase.duration ? `**Duration:** ${phase.duration}` : "",
        phase.activities.length
          ? `**Activities**\n${phase.activities.map((item) => `- ${item}`).join("\n")}`
          : "",
        phase.deliverables.length
          ? `**Deliverables**\n${phase.deliverables.map((item) => `- ${item}`).join("\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    )
    .join("\n\n");
}

export function solutionProposalDocumentToMarkdown(
  document: SolutionProposalDocument,
) {
  return [
    `# ${document.coverHeading}`,
    `## ${document.solutionTitle}`,
    `**Prepared for:** ${document.client}`,
    ...document.sections.map((section) =>
      [
        `## ${section.title}`,
        ...section.blocks.map(blockToMarkdown),
      ].join("\n\n"),
    ),
  ].join("\n\n");
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
