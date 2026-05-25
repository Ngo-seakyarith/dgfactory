export type JsonSchema = {
  type?: string;
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  enum?: string[];
  minimum?: number;
  maximum?: number;
};

export type SchemaValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateAgainstSchema(
  value: unknown,
  schema: JsonSchema,
  path = "output",
): SchemaValidationResult {
  const errors: string[] = [];

  function add(message: string) {
    errors.push(`${path}: ${message}`);
  }

  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      add("expected object");
      return { valid: false, errors };
    }

    const record = value as Record<string, unknown>;

    for (const key of schema.required ?? []) {
      if (record[key] === undefined || record[key] === null) {
        errors.push(`${path}.${key}: required`);
      }
    }

    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
      if (record[key] !== undefined && record[key] !== null) {
        const child = validateAgainstSchema(record[key], childSchema, `${path}.${key}`);
        errors.push(...child.errors);
      }
    }
  }

  if (schema.type === "array") {
    if (!Array.isArray(value)) {
      add("expected array");
      return { valid: false, errors };
    }

    if (schema.items) {
      value.forEach((item, index) => {
        const child = validateAgainstSchema(item, schema.items!, `${path}[${index}]`);
        errors.push(...child.errors);
      });
    }
  }

  if (schema.type === "string") {
    if (typeof value !== "string") {
      add("expected string");
    } else if (schema.enum && !schema.enum.includes(value)) {
      add(`expected one of ${schema.enum.join(", ")}`);
    }
  }

  if (schema.type === "number" || schema.type === "integer") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      add("expected number");
    } else {
      if (schema.minimum !== undefined && value < schema.minimum) {
        add(`expected minimum ${schema.minimum}`);
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        add(`expected maximum ${schema.maximum}`);
      }
      if (schema.type === "integer" && !Number.isInteger(value)) {
        add("expected integer");
      }
    }
  }

  if (schema.type === "boolean" && typeof value !== "boolean") {
    add("expected boolean");
  }

  return { valid: errors.length === 0, errors };
}

export const qualityChecklistItemSchema: JsonSchema = {
  type: "object",
  required: ["category", "item", "status"],
  properties: {
    category: { type: "string" },
    item: { type: "string" },
    status: { type: "string", enum: ["ready", "review"] },
  },
};

export const trainingPackageOutputSchema: JsonSchema = {
  type: "object",
  required: ["syllabus", "proposal"],
  properties: {
    syllabus: { type: "string" },
    proposal: { type: "string" },
  },
};

export const textOutputSchema: JsonSchema = {
  type: "object",
  required: ["content"],
  properties: {
    content: { type: "string" },
  },
};

export const followUpOutputSchema: JsonSchema = {
  type: "object",
  required: ["followUpEmail", "shortMessage", "suggestedNextStep"],
  properties: {
    followUpEmail: { type: "string" },
    shortMessage: { type: "string" },
    suggestedNextStep: { type: "string" },
  },
};

export const deliveryDraftOutputSchema: JsonSchema = {
  type: "object",
  required: ["title", "body", "suggestedNextStep"],
  properties: {
    title: { type: "string" },
    body: { type: "string" },
    suggestedNextStep: { type: "string" },
  },
};

export const qaReviewOutputSchema: JsonSchema = {
  type: "object",
  required: [
    "score",
    "strengths",
    "weaknesses",
    "missingSections",
    "risks",
    "recommendedImprovements",
    "clientReadiness",
  ],
  properties: {
    score: { type: "integer", minimum: 1, maximum: 100 },
    strengths: { type: "array", items: { type: "string" } },
    weaknesses: { type: "array", items: { type: "string" } },
    missingSections: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    recommendedImprovements: { type: "array", items: { type: "string" } },
    clientReadiness: { type: "string", enum: ["low", "medium", "high"] },
  },
};

export const suggestedPromptChangeSchema: JsonSchema = {
  type: "object",
  required: [
    "targetAgent",
    "currentPromptSummary",
    "suggestedChange",
    "reason",
  ],
  properties: {
    targetAgent: { type: "string" },
    currentPromptSummary: { type: "string" },
    suggestedChange: { type: "string" },
    reason: { type: "string" },
  },
};

export const outputEvaluationResultSchema: JsonSchema = {
  type: "object",
  required: [
    "score",
    "strengths",
    "weaknesses",
    "risks",
    "improvementSuggestions",
    "suggestedPromptChanges",
  ],
  properties: {
    score: { type: "integer", minimum: 1, maximum: 100 },
    strengths: { type: "array", items: { type: "string" } },
    weaknesses: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    improvementSuggestions: { type: "array", items: { type: "string" } },
    suggestedPromptChanges: {
      type: "array",
      items: suggestedPromptChangeSchema,
    },
  },
};

export const offerMutationVariantSchema: JsonSchema = {
  type: "object",
  required: [
    "title",
    "target_audience",
    "sector",
    "format",
    "duration",
    "promise",
    "pain_point",
    "why_now",
    "test_method",
    "suggested_price_range",
    "expected_buying_trigger",
    "risk",
    "confidence_score",
  ],
  properties: {
    title: { type: "string" },
    target_audience: { type: "string" },
    sector: { type: "string" },
    format: { type: "string" },
    duration: { type: "string" },
    promise: { type: "string" },
    pain_point: { type: "string" },
    why_now: { type: "string" },
    test_method: { type: "string" },
    suggested_price_range: { type: "string" },
    expected_buying_trigger: { type: "string" },
    risk: { type: "string" },
    confidence_score: { type: "integer", minimum: 1, maximum: 100 },
  },
};

export const offerMutationOutputSchema: JsonSchema = {
  type: "object",
  required: ["variants", "recommended_top_3", "rationale"],
  properties: {
    variants: { type: "array", items: offerMutationVariantSchema },
    recommended_top_3: { type: "array", items: { type: "string" } },
    rationale: { type: "string" },
  },
};

export const replicationGenomeItemSchema: JsonSchema = {
  type: "object",
  required: ["title", "type", "content", "confidence_score"],
  properties: {
    title: { type: "string" },
    type: { type: "string" },
    content: { type: "string" },
    confidence_score: { type: "integer", minimum: 1, maximum: 100 },
  },
};

export const offerReplicationOutputSchema: JsonSchema = {
  type: "object",
  required: [
    "replication_summary",
    "reusable_training_template",
    "proposal_template",
    "pricing_note",
    "sales_message",
    "delivery_checklist",
    "learning_genome_items",
    "recommended_expansion_paths",
  ],
  properties: {
    replication_summary: { type: "string" },
    reusable_training_template: { type: "string" },
    proposal_template: { type: "string" },
    pricing_note: { type: "string" },
    sales_message: { type: "string" },
    delivery_checklist: { type: "array", items: { type: "string" } },
    learning_genome_items: { type: "array", items: replicationGenomeItemSchema },
    recommended_expansion_paths: { type: "array", items: { type: "string" } },
  },
};

export const improvementOpportunityOutputSchema: JsonSchema = {
  type: "object",
  required: [
    "title",
    "description",
    "category",
    "priority",
    "rationale",
    "suggested_files_modules",
    "acceptance_criteria",
    "codex_prompt",
  ],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    category: { type: "string" },
    priority: { type: "integer", minimum: 1, maximum: 5 },
    rationale: { type: "string" },
    suggested_files_modules: { type: "array", items: { type: "string" } },
    acceptance_criteria: { type: "array", items: { type: "string" } },
    codex_prompt: { type: "string" },
  },
};

export const adaptiveGrowthRecommendationsOutputSchema: JsonSchema = {
  type: "object",
  required: [
    "what_to_test_next",
    "what_to_kill",
    "what_to_scale",
    "what_to_replicate",
    "what_to_learn",
    "what_codex_should_improve_next",
    "uncertainty_notes",
  ],
  properties: {
    what_to_test_next: { type: "array", items: { type: "string" } },
    what_to_kill: { type: "array", items: { type: "string" } },
    what_to_scale: { type: "array", items: { type: "string" } },
    what_to_replicate: { type: "array", items: { type: "string" } },
    what_to_learn: { type: "array", items: { type: "string" } },
    what_codex_should_improve_next: { type: "array", items: { type: "string" } },
    uncertainty_notes: { type: "array", items: { type: "string" } },
  },
};

export const masterAgentOutputSchema: JsonSchema = {
  type: "object",
  required: [
    "workflow",
    "specialistAgents",
    "deterministicTools",
    "requiresApproval",
    "riskLevel",
    "nextStep",
  ],
  properties: {
    workflow: { type: "string" },
    specialistAgents: { type: "array", items: { type: "string" } },
    deterministicTools: { type: "array", items: { type: "string" } },
    requiresApproval: { type: "boolean" },
    riskLevel: { type: "string", enum: ["Low", "Medium", "High"] },
    nextStep: { type: "string" },
  },
};
