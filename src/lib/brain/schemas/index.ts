export type JsonSchema = {
  type?: string;
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  additionalProperties?: boolean;
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

const stringArraySchema: JsonSchema = {
  type: "array",
  items: { type: "string" },
};

const analystFindingSchema: JsonSchema = {
  type: "object",
  required: ["title", "detail", "evidence", "severity"],
  properties: {
    title: { type: "string" },
    detail: { type: "string" },
    evidence: { type: "string" },
    severity: { type: "string", enum: ["low", "medium", "high"] },
  },
};

const systemOpportunitySchema: JsonSchema = {
  type: "object",
  required: [
    "title",
    "problem",
    "evidence",
    "capability",
    "expectedValue",
    "confidence",
  ],
  properties: {
    title: { type: "string" },
    problem: { type: "string" },
    evidence: { type: "string" },
    capability: { type: "string" },
    expectedValue: { type: "string" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
  },
};

export const dataDiscoveryOutputSchema: JsonSchema = {
  type: "object",
  required: ["analystReview"],
  properties: {
    analystReview: {
      type: "object",
      required: [
        "executiveSummary",
        "detectedProcesses",
        "dataQualityFindings",
        "candidateKpis",
        "opportunities",
        "risks",
        "questions",
        "userNotes",
      ],
      properties: {
        executiveSummary: { type: "string" },
        detectedProcesses: stringArraySchema,
        dataQualityFindings: { type: "array", items: analystFindingSchema },
        candidateKpis: stringArraySchema,
        opportunities: { type: "array", items: systemOpportunitySchema },
        risks: stringArraySchema,
        questions: stringArraySchema,
        userNotes: { type: "string" },
      },
    },
  },
};

const systemModuleSchema: JsonSchema = {
  type: "object",
  required: ["name", "purpose", "inputs", "outputs", "userValue"],
  properties: {
    name: { type: "string" },
    purpose: { type: "string" },
    inputs: stringArraySchema,
    outputs: stringArraySchema,
    userValue: { type: "string" },
  },
};

const implementationPhaseSchema: JsonSchema = {
  type: "object",
  required: ["name", "duration", "activities", "deliverables"],
  properties: {
    name: { type: "string" },
    duration: { type: "string" },
    activities: stringArraySchema,
    deliverables: stringArraySchema,
  },
};

export const intelligentSystemProposalOutputSchema: JsonSchema = {
  type: "object",
  required: ["proposalContent"],
  properties: {
    proposalContent: {
      type: "object",
      required: [
        "coverHeading",
        "solutionTitle",
        "client",
        "executiveSummary",
        "clientSituation",
        "evidenceFindings",
        "objectives",
        "recommendedSystem",
        "modules",
        "userWorkflows",
        "dashboardsAndAi",
        "dataFlowAndIntegrations",
        "securityAndGovernance",
        "implementationPhases",
        "deliverables",
        "clientResponsibilities",
        "assumptions",
        "risks",
        "nextSteps",
      ],
      properties: {
        coverHeading: { type: "string" },
        solutionTitle: { type: "string" },
        client: { type: "string" },
        executiveSummary: stringArraySchema,
        clientSituation: stringArraySchema,
        evidenceFindings: stringArraySchema,
        objectives: stringArraySchema,
        recommendedSystem: stringArraySchema,
        modules: { type: "array", items: systemModuleSchema },
        userWorkflows: stringArraySchema,
        dashboardsAndAi: stringArraySchema,
        dataFlowAndIntegrations: stringArraySchema,
        securityAndGovernance: stringArraySchema,
        implementationPhases: { type: "array", items: implementationPhaseSchema },
        deliverables: stringArraySchema,
        clientResponsibilities: stringArraySchema,
        assumptions: stringArraySchema,
        risks: stringArraySchema,
        nextSteps: stringArraySchema,
      },
    },
  },
};

export const proposalContentSchema: JsonSchema = {
  type: "object",
  required: [
    "coverTitle",
    "coverSubtitle",
    "certificationLabel",
    "courseTitle",
    "client",
    "courseOverview",
    "courseObjectives",
    "expectedLearningOutcomes",
    "contentOutlines",
    "whoShouldAttend",
    "trainingMethodology",
    "trainingTools",
    "trainingEvaluation",
    "schedule",
    "trainer",
    "professionalFee",
    "signatory",
  ],
  properties: {
    coverTitle: { type: "string" },
    coverSubtitle: { type: "string" },
    certificationLabel: { type: "string" },
    courseTitle: { type: "string" },
    client: { type: "string" },
    courseOverview: stringArraySchema,
    courseObjectives: stringArraySchema,
    expectedLearningOutcomes: stringArraySchema,
    contentOutlines: stringArraySchema,
    whoShouldAttend: stringArraySchema,
    trainingMethodology: stringArraySchema,
    trainingTools: stringArraySchema,
    trainingEvaluation: stringArraySchema,
    schedule: {
      type: "object",
      required: ["duration", "date", "time", "venue", "participants"],
      properties: {
        duration: { type: "string" },
        date: { type: "string" },
        time: { type: "string" },
        venue: { type: "string" },
        participants: { type: "string" },
      },
    },
    trainer: {
      type: "object",
      required: [
        "name",
        "title",
        "imageUrl",
        "bio",
        "experience",
        "qualifications",
      ],
      properties: {
        name: { type: "string" },
        title: { type: "string" },
        imageUrl: { type: "string" },
        bio: stringArraySchema,
        experience: stringArraySchema,
        qualifications: stringArraySchema,
      },
    },
    professionalFee: {
      type: "object",
      required: [
        "included",
        "totalFee",
        "vatStatus",
        "clientResponsibilities",
        "billingArrangement",
        "paymentInstructions",
        "acceptanceText",
      ],
      properties: {
        included: stringArraySchema,
        totalFee: { type: "string" },
        vatStatus: { type: "string" },
        clientResponsibilities: stringArraySchema,
        billingArrangement: { type: "string" },
        paymentInstructions: { type: "string" },
        acceptanceText: { type: "string" },
      },
    },
    signatory: {
      type: "object",
      required: ["name", "title", "date"],
      properties: {
        name: { type: "string" },
        title: { type: "string" },
        date: { type: "string" },
      },
    },
  },
};

export const trainingPackageOutputSchema: JsonSchema = {
  type: "object",
  required: ["proposalContent"],
  properties: {
    proposalContent: proposalContentSchema,
  },
};

export const proposalAgentOutputSchema: JsonSchema = {
  type: "object",
  required: ["proposalContent"],
  properties: {
    proposalContent: proposalContentSchema,
  },
};

export const textOutputSchema: JsonSchema = {
  type: "object",
  required: ["content"],
  properties: {
    content: { type: "string" },
  },
};

const slideDeckSlideSchema: JsonSchema = {
  type: "object",
  required: [
    "layout",
    "title",
    "intro",
    "statement",
    "bullets",
    "leftTitle",
    "leftItems",
    "rightTitle",
    "rightItems",
    "speakerNotes",
  ],
  properties: {
    layout: {
      type: "string",
      enum: [
        "section",
        "statement",
        "bullets",
        "numbered",
        "two-column",
        "practice",
        "closing",
      ],
    },
    title: { type: "string" },
    intro: { type: "string" },
    statement: { type: "string" },
    bullets: stringArraySchema,
    leftTitle: { type: "string" },
    leftItems: stringArraySchema,
    rightTitle: { type: "string" },
    rightItems: stringArraySchema,
    speakerNotes: { type: "string" },
  },
};

export const slideDeckOutputSchema: JsonSchema = {
  type: "object",
  required: ["deck"],
  properties: {
    deck: {
      type: "object",
      required: ["version", "title", "slides"],
      properties: {
        version: { type: "integer", minimum: 1, maximum: 1 },
        title: { type: "string" },
        slides: { type: "array", items: slideDeckSlideSchema },
      },
    },
  },
};

const workbookActivitySchema: JsonSchema = {
  type: "object",
  required: [
    "title",
    "purpose",
    "instructions",
    "reflectionQuestions",
    "expectedOutput",
    "responseLines",
  ],
  properties: {
    title: { type: "string" },
    purpose: { type: "string" },
    instructions: stringArraySchema,
    reflectionQuestions: stringArraySchema,
    expectedOutput: { type: "string" },
    responseLines: { type: "integer", minimum: 3, maximum: 8 },
  },
};

export const workbookOutputSchema: JsonSchema = {
  type: "object",
  required: ["workbook"],
  properties: {
    workbook: {
      type: "object",
      required: ["version", "title", "welcome", "howToUse", "modules", "actionPlan"],
      properties: {
        version: { type: "integer", minimum: 1, maximum: 1 },
        title: { type: "string" },
        welcome: { type: "string" },
        howToUse: stringArraySchema,
        modules: {
          type: "array",
          items: {
            type: "object",
            required: ["title", "introduction", "keyPoints", "activities", "applicationPrompt"],
            properties: {
              title: { type: "string" },
              introduction: { type: "string" },
              keyPoints: stringArraySchema,
              activities: { type: "array", items: workbookActivitySchema },
              applicationPrompt: { type: "string" },
            },
          },
        },
        actionPlan: {
          type: "object",
          required: ["introduction", "prompts", "responseLines"],
          properties: {
            introduction: { type: "string" },
            prompts: stringArraySchema,
            responseLines: { type: "integer", minimum: 3, maximum: 8 },
          },
        },
      },
    },
  },
};

export const facilitatorGuideOutputSchema: JsonSchema = {
  type: "object",
  required: ["guide"],
  properties: {
    guide: {
      type: "object",
      required: [
        "version",
        "title",
        "purpose",
        "trainerPreparation",
        "agenda",
        "sections",
        "materialsChecklist",
        "likelyQuestions",
        "contingencies",
        "closingChecklist",
      ],
      properties: {
        version: { type: "integer", minimum: 1, maximum: 1 },
        title: { type: "string" },
        purpose: { type: "string" },
        trainerPreparation: stringArraySchema,
        agenda: {
          type: "array",
          items: {
            type: "object",
            required: ["timing", "duration", "session", "objective", "method"],
            properties: {
              timing: { type: "string" },
              duration: { type: "string" },
              session: { type: "string" },
              objective: { type: "string" },
              method: { type: "string" },
            },
          },
        },
        sections: {
          type: "array",
          items: {
            type: "object",
            required: [
              "title",
              "timing",
              "objective",
              "keyMessages",
              "runSteps",
              "debriefQuestions",
              "expectedOutputs",
              "transition",
            ],
            properties: {
              title: { type: "string" },
              timing: { type: "string" },
              objective: { type: "string" },
              keyMessages: stringArraySchema,
              runSteps: stringArraySchema,
              debriefQuestions: stringArraySchema,
              expectedOutputs: stringArraySchema,
              transition: { type: "string" },
            },
          },
        },
        materialsChecklist: stringArraySchema,
        likelyQuestions: {
          type: "array",
          items: {
            type: "object",
            required: ["question", "answer"],
            properties: {
              question: { type: "string" },
              answer: { type: "string" },
            },
          },
        },
        contingencies: {
          type: "array",
          items: {
            type: "object",
            required: ["situation", "response"],
            properties: {
              situation: { type: "string" },
              response: { type: "string" },
            },
          },
        },
        closingChecklist: stringArraySchema,
      },
    },
  },
};

export const promptLibraryOutputSchema: JsonSchema = {
  type: "object",
  required: ["library"],
  properties: {
    library: {
      type: "object",
      required: ["version", "title", "introduction", "usageGuidance", "sections", "responsibleUseChecks"],
      properties: {
        version: { type: "integer", minimum: 1, maximum: 1 },
        title: { type: "string" },
        introduction: { type: "string" },
        usageGuidance: stringArraySchema,
        sections: {
          type: "array",
          items: {
            type: "object",
            required: ["title", "description", "prompts"],
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              prompts: {
                type: "array",
                items: {
                  type: "object",
                  required: ["title", "whenToUse", "prompt", "adaptationTips", "reviewChecks"],
                  properties: {
                    title: { type: "string" },
                    whenToUse: { type: "string" },
                    prompt: { type: "string" },
                    adaptationTips: stringArraySchema,
                    reviewChecks: stringArraySchema,
                  },
                },
              },
            },
          },
        },
        responsibleUseChecks: stringArraySchema,
      },
    },
  },
};

export const evaluationQuestionsOutputSchema: JsonSchema = {
  type: "object",
  required: ["questions"],
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        required: ["type", "label", "required"],
        properties: {
          type: { type: "string", enum: ["rating", "choice", "text"] },
          label: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          required: { type: "boolean" },
        },
      },
    },
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
