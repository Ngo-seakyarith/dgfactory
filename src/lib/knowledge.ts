export const knowledgeDocumentTypes = [
  "Framework",
  "Proposal",
  "Case Study",
  "Exercise",
  "Pricing Note",
  "Sector Insight",
  "Client Note",
  "SOP",
  "Prompt Template",
  "Other",
] as const;

export type KnowledgeDocumentType = (typeof knowledgeDocumentTypes)[number];

export const knowledgeVisibilityOptions = ["Internal", "Client-safe"] as const;

export type KnowledgeVisibility = (typeof knowledgeVisibilityOptions)[number];

export type KnowledgeDocument = {
  id: string;
  title: string;
  type: KnowledgeDocumentType;
  content: string;
  tags: string[];
  source: string;
  visibility: KnowledgeVisibility;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeChunk = {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  embedding: number[] | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type KnowledgeRetrievalResult = {
  document: KnowledgeDocument;
  chunk?: KnowledgeChunk;
  score: number;
  matchedTerms: string[];
};

export type KnowledgeSourceNote = {
  id: string;
  title: string;
  type: KnowledgeDocumentType;
  visibility: KnowledgeVisibility;
  score: number;
  source: string;
};

export function isKnowledgeDocumentType(
  value: unknown,
): value is KnowledgeDocumentType {
  return (
    typeof value === "string" &&
    knowledgeDocumentTypes.includes(value as KnowledgeDocumentType)
  );
}

export function isKnowledgeVisibility(
  value: unknown,
): value is KnowledgeVisibility {
  return (
    typeof value === "string" &&
    knowledgeVisibilityOptions.includes(value as KnowledgeVisibility)
  );
}

export function normalizeTags(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 24);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 24);
  }

  return [];
}

export function normalizeKnowledgeDocument(
  value: Partial<KnowledgeDocument>,
): KnowledgeDocument {
  const now = new Date().toISOString();

  return {
    id: value.id || crypto.randomUUID(),
    title: String(value.title ?? "").trim(),
    type: isKnowledgeDocumentType(value.type) ? value.type : "Other",
    content: String(value.content ?? "").trim(),
    tags: normalizeTags(value.tags),
    source: String(value.source ?? "").trim(),
    visibility: isKnowledgeVisibility(value.visibility)
      ? value.visibility
      : "Internal",
    createdAt: value.createdAt || now,
    updatedAt: value.updatedAt || now,
  };
}

export function normalizeKnowledgeChunk(
  value: Partial<KnowledgeChunk>,
): KnowledgeChunk {
  const now = new Date().toISOString();

  return {
    id: value.id || crypto.randomUUID(),
    documentId: String(value.documentId ?? "").trim(),
    chunkIndex: Number.isFinite(Number(value.chunkIndex))
      ? Number(value.chunkIndex)
      : 0,
    content: String(value.content ?? "").trim(),
    embedding: Array.isArray(value.embedding) ? value.embedding : null,
    metadata:
      value.metadata && typeof value.metadata === "object" && !Array.isArray(value.metadata)
        ? value.metadata
        : {},
    createdAt: value.createdAt || now,
  };
}

export function createKnowledgeChunks(document: KnowledgeDocument): KnowledgeChunk[] {
  const parts = document.content
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  const chunks = parts.length ? parts : [document.content];

  return chunks.map((content, index) =>
    normalizeKnowledgeChunk({
      documentId: document.id,
      chunkIndex: index,
      content,
      metadata: {
        title: document.title,
        type: document.type,
        tags: document.tags,
        visibility: document.visibility,
        source: document.source,
      },
    }),
  );
}

export const seedKnowledgeDocuments: KnowledgeDocument[] = [
  normalizeKnowledgeDocument({
    id: "00000000-0000-0000-0000-000000000101",
    title: "DG Academy Positioning",
    type: "SOP",
    visibility: "Client-safe",
    tags: ["DG Academy", "positioning", "proposal"],
    source: "Seed",
    content:
      "DG Academy helps leaders and teams turn AI awareness into practical business capability. Programs are designed to be executive-friendly, hands-on, locally relevant, and focused on workflow adoption rather than abstract technology theory.",
  }),
  normalizeKnowledgeDocument({
    id: "00000000-0000-0000-0000-000000000102",
    title: "AI Skills for Managers Framework",
    type: "Framework",
    visibility: "Client-safe",
    tags: ["AI skills", "managers", "framework"],
    source: "Seed",
    content:
      "The AI Skills for Managers framework covers AI opportunity spotting, prompt structure, workflow redesign, data and privacy awareness, human review checkpoints, and a 30-day implementation plan. Managers should leave with language, practice, and a clear next step.",
  }),
  normalizeKnowledgeDocument({
    id: "00000000-0000-0000-0000-000000000103",
    title: "Cambodia SME AI Adoption Notes",
    type: "Sector Insight",
    visibility: "Internal",
    tags: ["Cambodia", "SME", "AI adoption"],
    source: "Seed",
    content:
      "Cambodian SMEs often need AI examples connected to sales follow-up, customer service, inventory, finance admin, HR communication, and owner-led decision-making. Keep examples practical, low-cost, and careful about data privacy. Avoid implying immediate automation maturity.",
  }),
  normalizeKnowledgeDocument({
    id: "00000000-0000-0000-0000-000000000104",
    title: "Executive Training Methodology",
    type: "Framework",
    visibility: "Client-safe",
    tags: ["executive", "methodology", "training design"],
    source: "Seed",
    content:
      "Executive training should start with business relevance, move quickly into examples, create space for peer discussion, and end with decision-ready next steps. The best sessions balance strategic framing with practical tools leaders can sponsor immediately.",
  }),
  normalizeKnowledgeDocument({
    id: "00000000-0000-0000-0000-000000000105",
    title: "Prompt Structure Framework",
    type: "Exercise",
    visibility: "Client-safe",
    tags: ["prompting", "exercise", "AI workflow"],
    source: "Seed",
    content:
      "A reusable prompt structure is: role, business goal, context, source material, constraints, output format, quality criteria, and review step. Participants should practice improving prompts by adding context and evaluation criteria rather than only changing wording.",
  }),
];

export function knowledgeSourceNotesFromResults(
  results: KnowledgeRetrievalResult[],
) {
  const seen = new Set<string>();

  return results
    .filter((result) => {
      if (seen.has(result.document.id)) {
        return false;
      }
      seen.add(result.document.id);
      return true;
    })
    .map<KnowledgeSourceNote>((result) => ({
      id: result.document.id,
      title: result.document.title,
      type: result.document.type,
      visibility: result.document.visibility,
      score: result.score,
      source: result.document.source,
    }));
}
