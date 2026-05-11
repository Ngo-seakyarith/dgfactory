import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const tempDir = mkdtempSync(join(tmpdir(), "dg-brain-test-"));
const tempLib = join(tempDir, "src", "lib");
const openAiStubDir = join(tempDir, "node_modules", "openai");
const supabaseStubDir = join(tempDir, "node_modules", "@supabase", "supabase-js");

mkdirSync(openAiStubDir, { recursive: true });
mkdirSync(supabaseStubDir, { recursive: true });
writeFileSync(
  join(openAiStubDir, "package.json"),
  JSON.stringify({ type: "module", main: "index.mjs" }),
  "utf8",
);
writeFileSync(
  join(openAiStubDir, "index.mjs"),
  "export default class OpenAI { constructor() { this.chat = { completions: { create: async () => ({ choices: [] }) } }; } }\n",
  "utf8",
);
writeFileSync(
  join(supabaseStubDir, "package.json"),
  JSON.stringify({ type: "module", main: "index.mjs" }),
  "utf8",
);
writeFileSync(
  join(supabaseStubDir, "index.mjs"),
  "export function createClient() { return null; }\n",
  "utf8",
);

const files = [
  "pricing.ts",
  "auth.ts",
  "crm.ts",
  "delivery.ts",
  "training-packages.ts",
  "supabase/server.ts",
  "prompt-templates.ts",
  "prompt-template-storage.ts",
  "orchestrator/commands.ts",
  "loops/types.ts",
  "loops/storage.ts",
  "brain/evals/types.ts",
  "brain/evals/benchmarks.ts",
  "brain/evals/rubrics.ts",
  "security/exportSafety.ts",
  "security/orchestratorSafety.ts",
  "security/redTeamTests.ts",
  "client-portal/token.ts",
  "client-portal/safe-renderer.ts",
  "productization.ts",
  "adaptive-growth.ts",
  "adaptive-growth/fitness.ts",
  "improvements.ts",
  "evaluations.ts",
  "safety/approvalRules.ts",
  "safety/riskClassifier.ts",
  "safety/autonomy.ts",
  "brain/schemas/index.ts",
  "brain/modelConfig.ts",
  "brain/agents/masterAgent.ts",
  "brain/agents/index.ts",
  "brain/client.ts",
  "brain/router.ts",
  "brain/tools/index.ts",
  "brain/workflows/packageWorkflow.ts",
  "brain/workflows/adaptiveGrowthWorkflow.ts",
];

function moduleUrl(relativePath) {
  return pathToFileURL(join(tempLib, relativePath)).href;
}

function resolveAlias(specifier) {
  const aliases = {
    "@/lib/pricing": "pricing.mjs",
    "@/lib/auth": "auth.mjs",
    "@/lib/crm": "crm.mjs",
    "@/lib/delivery": "delivery.mjs",
    "@/lib/training-packages": "training-packages.mjs",
    "@/lib/supabase/server": "supabase/server.mjs",
    "@/lib/prompt-templates": "prompt-templates.mjs",
    "@/lib/prompt-template-storage": "prompt-template-storage.mjs",
    "@/lib/orchestrator/commands": "orchestrator/commands.mjs",
    "@/lib/loops/types": "loops/types.mjs",
    "@/lib/loops/storage": "loops/storage.mjs",
    "@/lib/brain/evals/types": "brain/evals/types.mjs",
    "@/lib/brain/evals/benchmarks": "brain/evals/benchmarks.mjs",
    "@/lib/brain/evals/rubrics": "brain/evals/rubrics.mjs",
    "@/lib/security/exportSafety": "security/exportSafety.mjs",
    "@/lib/security/orchestratorSafety": "security/orchestratorSafety.mjs",
    "@/lib/security/redTeamTests": "security/redTeamTests.mjs",
    "@/lib/client-portal/token": "client-portal/token.mjs",
    "@/lib/client-portal/safe-renderer": "client-portal/safe-renderer.mjs",
    "@/lib/productization": "productization.mjs",
    "@/lib/adaptive-growth": "adaptive-growth.mjs",
    "@/lib/adaptive-growth/fitness": "adaptive-growth/fitness.mjs",
    "@/lib/improvements": "improvements.mjs",
    "@/lib/evaluations": "evaluations.mjs",
    "@/lib/safety/approvalRules": "safety/approvalRules.mjs",
    "@/lib/safety/riskClassifier": "safety/riskClassifier.mjs",
    "@/lib/safety/autonomy": "safety/autonomy.mjs",
    "@/lib/brain/schemas": "brain/schemas/index.mjs",
    "@/lib/brain/schemas/index": "brain/schemas/index.mjs",
    "@/lib/brain/modelConfig": "brain/modelConfig.mjs",
    "@/lib/brain/agents/masterAgent": "brain/agents/masterAgent.mjs",
    "@/lib/brain/agents": "brain/agents/index.mjs",
    "@/lib/brain/client": "brain/client.mjs",
    "@/lib/brain/router": "brain/router.mjs",
    "@/lib/brain/tools": "brain/tools/index.mjs",
    "@/lib/brain/workflows/packageWorkflow": "brain/workflows/packageWorkflow.mjs",
    "@/lib/brain/workflows/adaptiveGrowthWorkflow": "brain/workflows/adaptiveGrowthWorkflow.mjs",
  };

  return aliases[specifier] ? moduleUrl(aliases[specifier]) : specifier;
}

function compile(relativePath) {
  const sourcePath = new URL(`../src/lib/${relativePath}`, import.meta.url);
  const source = readFileSync(sourcePath, "utf8").replace(
    /from "(@\/lib\/[^"]+)"/g,
    (_match, specifier) => `from "${resolveAlias(specifier)}"`,
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const outputPath = join(tempLib, relativePath.replace(/\.ts$/, ".mjs"));

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, compiled.outputText, "utf8");
}

files.forEach(compile);
delete process.env.OPENAI_API_KEY;

const { calculatePricing } = await import(moduleUrl("pricing.mjs"));
const { getAgentForTask, routeBrainTask } = await import(moduleUrl("brain/router.mjs"));
const { getBrainModelStatus } = await import(moduleUrl("brain/modelConfig.mjs"));
const { resolveAgentPrompt } = await import(moduleUrl("brain/client.mjs"));
const { validateAgainstSchema, qaReviewOutputSchema } = await import(
  moduleUrl("brain/schemas/index.mjs")
);
const { runPackageWorkflow, regeneratePackageSection } = await import(
  moduleUrl("brain/workflows/packageWorkflow.mjs")
);
const { runAdaptiveGrowthWorkflow } = await import(
  moduleUrl("brain/workflows/adaptiveGrowthWorkflow.mjs")
);
const {
  calculateQualityMetrics,
  createMockEvaluation,
  createSuggestionsFromEvaluation,
  normalizeOutputEvaluation,
} = await import(moduleUrl("evaluations.mjs"));
const {
  activatePromptTemplate,
  createDraftPromptTemplate,
  getActivePromptTemplate,
  rollbackPromptTemplate,
  savePromptTemplate,
} = await import(moduleUrl("prompt-template-storage.mjs"));
const {
  isOrchestratorCommand,
  normalizeApprovalRequest,
  redactForLog,
  requiresHumanApproval,
} = await import(moduleUrl("orchestrator/commands.mjs"));
const {
  isLoopType,
  loopTypeLabel,
} = await import(moduleUrl("loops/types.mjs"));
const {
  listLoopRuns,
  saveLoopRun,
} = await import(moduleUrl("loops/storage.mjs"));
const {
  createSeedEvalData,
} = await import(moduleUrl("brain/evals/benchmarks.mjs"));
const {
  validateClientExportSafety,
} = await import(moduleUrl("security/exportSafety.mjs"));
const {
  validateOrchestratorCommandSafety,
} = await import(moduleUrl("security/orchestratorSafety.mjs"));
const {
  runSecurityRedTeamScenarios,
} = await import(moduleUrl("security/redTeamTests.mjs"));
const {
  createPortalToken,
  hashPortalToken,
} = await import(moduleUrl("client-portal/token.mjs"));
const {
  buildClientSafePackageDocument,
  sanitizeClientText,
} = await import(moduleUrl("client-portal/safe-renderer.mjs"));
const {
  calculateProductRoi,
  buildProductBriefMarkdown,
} = await import(moduleUrl("productization.mjs"));
const {
  calculateFitnessScore,
  calculateGrowthDashboardMetrics,
  normalizeMarketSignal,
  normalizeOfferVariant,
  normalizeSelectionDecision,
} = await import(moduleUrl("adaptive-growth.mjs"));
const {
  calculateOfferFitness,
  recommendSelection,
} = await import(moduleUrl("adaptive-growth/fitness.mjs"));
const {
  buildCodexPrompt,
  improvementToRalphStory,
  normalizeImprovementOpportunity,
} = await import(moduleUrl("improvements.mjs"));
const {
  roleHasPermission,
  isUserRole,
} = await import(moduleUrl("auth.mjs"));
const {
  actionRequiresApproval,
} = await import(moduleUrl("safety/approvalRules.mjs"));
const {
  classifyRiskyAction,
} = await import(moduleUrl("safety/riskClassifier.mjs"));
const {
  canExecuteLowRiskInternalAction,
  canRunScheduledLowRiskLoops,
  getAutonomySettings,
  saveAutonomySettings,
} = await import(moduleUrl("safety/autonomy.mjs"));

test("V3.6 model config defaults to GPT-5.5 and reports mock mode safely", () => {
  const status = getBrainModelStatus();

  assert.equal(status.intendedBrainModel, "gpt-5.5");
  assert.equal(status.apiKeyConfigured, false);
  assert.equal(status.mockMode, true);
  assert.equal(status.modelStatus, "mock");
});

test("router maps task types to specialist agents", () => {
  assert.equal(getAgentForTask("master_workflow").name, "masterAgent");
  assert.equal(getAgentForTask("course_package").name, "courseArchitectAgent");
  assert.equal(getAgentForTask("pricing_narrative").name, "pricingNarrativeAgent");
  assert.equal(getAgentForTask("delivery_report").name, "deliveryAgent");
  assert.equal(getAgentForTask("qa_review").name, "qaAgent");
  assert.equal(getAgentForTask("offer_replication").name, "replicationAgent");
  assert.equal(getAgentForTask("improvement_opportunity").name, "improvementOpportunityAgent");
  assert.equal(getAgentForTask("market_sensing").name, "marketSensingAgent");
  assert.equal(getAgentForTask("fitness_evaluation").name, "fitnessEvaluatorAgent");
  assert.equal(getAgentForTask("selection_recommendation").name, "selectionAgent");
  assert.equal(getAgentForTask("learning_genome").name, "learningGenomeAgent");
});

test("mock mode works without an API key", async () => {
  const result = await routeBrainTask({
    taskType: "course_package",
    input: {
      courseTitle: "AI Leadership Sprint",
      audience: "Senior managers",
      duration: "1 day",
      client: "Cambodia corporate market",
      promise: "Leave with practical AI use cases and a 30-day plan",
      context: "Banking and service workflow examples",
      tone: "Executive and practical",
    },
  });

  assert.equal(result.mode, "mock");
  assert.match(result.output.syllabus, /AI Leadership Sprint/);
  assert.ok(Array.isArray(result.output.qualityChecklist));
});

test("schema validation catches bad output", () => {
  const validation = validateAgainstSchema(
    {
      score: 101,
      strengths: "good",
      weaknesses: [],
      missingSections: [],
      risks: [],
      recommendedImprovements: [],
      clientReadiness: "ready",
    },
    qaReviewOutputSchema,
  );

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.length >= 3);
});

test("QA review returns expected structure in mock mode", async () => {
  const result = await routeBrainTask({
    taskType: "qa_review",
    input: {
      packageContent:
        "# Syllabus\n# Proposal\n# Workbook\n# Pricing\n# Follow-up\nClient-ready content.",
      client: "DG Test Client",
      audience: "Executives",
      context: "Internal test context",
    },
  });

  assert.equal(result.mode, "mock");
  assert.equal(typeof result.output.score, "number");
  assert.ok(Array.isArray(result.output.recommendedImprovements));
  assert.match(result.output.clientReadiness, /low|medium|high/);
});

test("V3.6 master agent routes workflows without doing specialist work", async () => {
  const result = await routeBrainTask({
    taskType: "master_workflow",
    input: {
      goal: "Evaluate offer fitness for a tested workshop.",
      workflow: "evaluate_offer_fitness",
    },
  });

  assert.equal(result.mode, "mock");
  assert.equal(result.output.workflow, "evaluate_offer_fitness");
  assert.ok(result.output.specialistAgents.includes("fitnessEvaluatorAgent"));
  assert.ok(result.output.deterministicTools.includes("calculateOfferFitness"));
});

test("micro-offer mutation agent returns selectable variants in mock mode", async () => {
  const result = await routeBrainTask({
    taskType: "offer_mutation",
    input: {
      sourceIdea: "Cambodian bank managers need practical AI adoption training",
      sector: "Banking",
      audience: "Middle managers",
      desiredFormat: "Workshop",
      numberOfVariants: 5,
      mutationStrategy: "Audience mutation",
      constraints: "Keep offers testable within two weeks.",
    },
  });

  assert.equal(result.mode, "mock");
  assert.equal(result.output.variants.length, 5);
  assert.ok(result.output.variants.every((variant) => variant.test_method));
  assert.ok(result.output.variants.every((variant) => variant.confidence_score >= 0));
  assert.ok(result.output.recommended_top_3.length <= 3);
  assert.match(result.output.rationale, /mutation|offers|reusable/i);
});

test("replication agent extracts reusable assets in mock mode", async () => {
  const result = await routeBrainTask({
    taskType: "offer_replication",
    input: {
      offer: {
        title: "AI Skills for Managers",
        targetAudience: "Managers",
        sector: "Banking",
        format: "Workshop",
        duration: "1 day",
        promise: "Managers leave with practical AI workflow actions.",
      },
      selectionDecision: {
        decision: "Scale",
        fitnessScore: 82,
        rationale: "Strong market pull and reusable structure.",
      },
      includePackageAssets: true,
      includeSalesAssets: true,
      includeDeliveryAssets: true,
    },
  });

  assert.equal(result.mode, "mock");
  assert.match(result.output.replication_summary, /AI Skills for Managers/);
  assert.ok(result.output.learning_genome_items.length >= 4);
  assert.ok(result.output.delivery_checklist.length >= 3);
  assert.ok(result.output.recommended_expansion_paths.length >= 5);
});

test("V3.6 adaptive growth workflow keeps fitness deterministic", async () => {
  const result = await runAdaptiveGrowthWorkflow({
    workflow: "selection",
    goal: "Recommend what to do with this offer.",
    offer: { title: "AI Skills for Managers", priceAssumption: 6000 },
    signal: { urgencyScore: 80 },
    metrics: {
      impressions: 100,
      inquiries: 12,
      meetings: 4,
      proposalsSent: 4,
      dealsWon: 2,
      revenue: 12000,
      estimatedMargin: 45,
      deliveryQualityScore: 88,
      clientInterestScore: 85,
      strategicFitScore: 90,
      reusabilityScore: 86,
    },
    proposedAction: "change_offer_status_scaling",
  });

  assert.equal(result.deterministicResult.fitnessScore, 80);
  assert.equal(result.deterministicResult.recommendation, "Scale");
  assert.equal(result.requiresApproval, true);
  assert.equal(result.risk.riskLevel, "Medium");
});

test("improvement opportunity agent returns Codex-ready prompt in mock mode", async () => {
  const result = await routeBrainTask({
    taskType: "improvement_opportunity",
    input: {
      sourceType: "OpenClaw Loop",
      sourceSummary:
        "weekly_selection_review creates approval requests but users need clearer task handoff.",
    },
  });

  assert.equal(result.mode, "mock");
  assert.match(result.output.title, /OpenClaw Loop/);
  assert.ok(result.output.acceptance_criteria.length >= 3);
  assert.match(result.output.codex_prompt, /npm run build/);
});

test("Ralph story conversion keeps one-story safety constraints", () => {
  const opportunity = normalizeImprovementOpportunity({
    id: "11111111-1111-1111-1111-111111111111",
    sourceType: "Learning Genome",
    title: "Add failed-pattern warning",
    description: "Warn users when a new offer resembles a failed pattern.",
    category: "Product Feature",
    priority: 2,
    status: "Approved",
    recommendedAction: "Add a warning to Adaptive Growth offer generation.",
    acceptanceCriteria: ["Warning appears before saving repeated weak offers."],
    suggestedFiles: ["src/components/adaptive-growth-components.tsx"],
  });
  const story = improvementToRalphStory(opportunity);
  const prompt = buildCodexPrompt(opportunity);

  assert.equal(story.id, "improvement-11111111");
  assert.equal(story.passes, false);
  assert.ok(story.testCommands.includes("npm run build"));
  assert.match(prompt, /Do not deploy/);
});

test("multi-agent package workflow completes in mock mode and attaches QA score", async () => {
  const result = await runPackageWorkflow({
    courseTitle: "AI Leadership Sprint",
    audience: "Senior managers",
    duration: "1 day",
    client: "Cambodia corporate market",
    promise: "Leave with practical AI use cases and a 30-day plan",
    context: "Banking and service workflow examples",
    tone: "Executive and practical",
  });

  assert.equal(result.state.status, "completed");
  assert.ok(result.output.syllabus.includes("AI Leadership Sprint"));
  assert.equal(typeof result.qaReview.score, "number");
  assert.equal(result.state.qaScore, result.qaReview.score);
  assert.ok(result.traceSummary.length >= 8);
});

test("failed workflow step returns useful error state", async () => {
  await assert.rejects(
    async () =>
      runPackageWorkflow({
        courseTitle: "AI Leadership Sprint",
        audience: "Senior managers",
        duration: "1 day",
        client: "Cambodia corporate market",
        promise: "Leave with practical AI use cases and a 30-day plan",
        context: "Banking and service workflow examples",
        tone: "Executive and practical",
        forceFailStep: "Slides",
      }),
    (error) => {
      assert.match(error.message, /Slides/);
      assert.equal(error.workflowState.status, "failed");
      assert.equal(error.workflowState.currentStep, "Slides");
      return true;
    },
  );
});

test("regenerate section returns replacement content", async () => {
  const result = await regeneratePackageSection({
    section: "workbook",
    packageInput: {
      courseTitle: "AI Leadership Sprint",
      audience: "Senior managers",
      duration: "1 day",
      client: "Cambodia corporate market",
      promise: "Leave with practical AI use cases and a 30-day plan",
      context: "Banking and service workflow examples",
      tone: "Executive and practical",
    },
    currentPackage: {
      syllabus: "old syllabus",
      proposal: "old proposal",
      commercialProposal: "old commercial",
      deckOutline: "old deck",
      workbook: "old workbook",
      followUpEmail: "old email",
      qualityChecklist: [],
    },
  });

  assert.equal(result.section, "workbook");
  assert.match(result.content, /Workbook/);
  assert.equal(result.mode, "mock");
});

test("mock output evaluation returns expected structure", () => {
  const result = createMockEvaluation({
    output:
      "# Client Proposal\nDG Academy will support Cambodia executives with a practical AI plan.",
    outputType: "proposal",
    targetAudience: "executives",
    clientContext: "Cambodia executives",
  });

  assert.equal(typeof result.score, "number");
  assert.ok(Array.isArray(result.strengths));
  assert.ok(Array.isArray(result.suggestedPromptChanges));
  assert.equal(result.suggestedPromptChanges[0].targetAgent, "proposalAgent");
});

test("quality metrics identify low scores and pending suggestions", () => {
  const evaluation = normalizeOutputEvaluation({
    outputType: "proposal",
    score: 62,
    reviewerType: "AI_QA",
    weaknesses: ["Client context is not clear"],
  });
  const suggestions = createSuggestionsFromEvaluation(evaluation, [
    {
      targetAgent: "proposalAgent",
      currentPromptSummary: "Current prompt asks for proposal language.",
      suggestedChange: "Require one client-specific example.",
      reason: "Low proposal score.",
    },
  ]);
  const metrics = calculateQualityMetrics([evaluation], suggestions);

  assert.equal(metrics.averageQaScore, 62);
  assert.equal(metrics.lowestScoringOutputTypes[0].outputType, "proposal");
  assert.equal(metrics.pendingImprovementSuggestions.length, 1);
});

test("brain prompt loading falls back to code-defined instructions", async () => {
  const agent = getAgentForTask("proposal");
  const prompt = await resolveAgentPrompt({
    agent,
    input: { client: "Fallback Client" },
  });

  assert.equal(prompt.source, "code");
  assert.match(prompt.systemPrompt, /Corporate training proposal writer/);
});

test("brain prompt loading uses active prompt template when available", async () => {
  const agent = getAgentForTask("proposal");
  await savePromptTemplate({
    agentName: agent.name,
    version: 100,
    title: "Test active proposal prompt",
    systemPrompt: "SYSTEM TEMPLATE FOR PROPOSAL",
    userPromptTemplate: "USER TEMPLATE {{input_json}}",
    outputSchema: { type: "object", properties: {} },
    status: "Active",
  });
  const prompt = await resolveAgentPrompt({
    agent,
    input: { client: "Template Client" },
  });

  assert.equal(prompt.source, "template");
  assert.equal(prompt.templateVersion, 100);
  assert.equal(prompt.systemPrompt, "SYSTEM TEMPLATE FOR PROPOSAL");
  assert.match(prompt.userPrompt, /Template Client/);
});

test("prompt template draft approval and rollback flow works locally", async () => {
  const active = await savePromptTemplate({
    agentName: "testPromptAgent",
    version: 1,
    title: "Test prompt v1",
    systemPrompt: "Original prompt",
    userPromptTemplate: "{{input_json}}",
    outputSchema: { type: "object", properties: {} },
    status: "Active",
  });
  const draft = await createDraftPromptTemplate({
    sourceTemplateId: active.template.id,
    systemPrompt: "Improved prompt",
    reason: "Test improvement",
  });

  assert.equal(draft.template.status, "Draft");
  assert.equal(draft.template.version, 2);

  const approved = await activatePromptTemplate({
    id: draft.template.id,
    approvedBy: "Test Reviewer",
  });
  const activeAfterApproval = await getActivePromptTemplate("testPromptAgent");

  assert.equal(approved.template.status, "Active");
  assert.equal(activeAfterApproval.version, 2);

  const rollback = await rollbackPromptTemplate({
    agentName: "testPromptAgent",
    version: 1,
    approvedBy: "Test Reviewer",
  });
  const activeAfterRollback = await getActivePromptTemplate("testPromptAgent");

  assert.equal(rollback.template.version, 1);
  assert.equal(activeAfterRollback.version, 1);
});

test("orchestrator command schema and approval safety helpers work", () => {
  assert.equal(isOrchestratorCommand("CREATE_PACKAGE"), true);
  assert.equal(isOrchestratorCommand("GET_IMPROVEMENT_SUMMARY"), true);
  assert.equal(isOrchestratorCommand("SEND_NOW"), false);
  assert.equal(requiresHumanApproval("REQUEST_EXPORT"), true);
  assert.equal(requiresHumanApproval("GET_PIPELINE_SUMMARY"), false);

  const approval = normalizeApprovalRequest({
    requestedBy: "OpenClaw",
    actionType: "REQUEST_EXPORT",
    payload: { packageId: "pkg_1" },
    riskLevel: "High",
  });

  assert.equal(approval.status, "Pending");
  assert.equal(approval.riskLevel, "High");
  assert.equal(redactForLog({ apiKey: "secret", client: "ACME" }).apiKey, "[redacted]");
});

test("scheduled loop types and local run storage work", async () => {
  assert.equal(isLoopType("weekly_pipeline_review"), true);
  assert.equal(isLoopType("pilot_weekly_review"), true);
  assert.equal(isLoopType("weekly_market_sensing"), true);
  assert.equal(isLoopType("weekly_selection_review"), true);
  assert.equal(isLoopType("quarterly_expansion_strategy"), true);
  assert.equal(isLoopType("send_customer_message"), false);
  assert.equal(loopTypeLabel("quality_improvement_review"), "Quality Improvement Review");
  assert.equal(loopTypeLabel("monthly_learning_genome_update"), "Monthly Learning Genome Update");
  assert.equal(loopTypeLabel("pilot_weekly_review"), "Pilot Weekly Review");

  const saved = await saveLoopRun({
    loopType: "weekly_pipeline_review",
    status: "Completed",
    input: { requestedBy: "test" },
    output: { activeOpportunities: [] },
    summary: "No active opportunities.",
    recommendations: ["Add one qualified follow-up date."],
    completedAt: new Date().toISOString(),
  });
  const runs = await listLoopRuns({ loopType: "weekly_pipeline_review" });

  assert.equal(saved.storage, "local");
  assert.equal(runs[0].loopType, "weekly_pipeline_review");
  assert.deepEqual(runs[0].recommendations, ["Add one qualified follow-up date."]);
});

test("V3 role permissions protect internal controls", () => {
  assert.equal(isUserRole("Admin"), true);
  assert.equal(isUserRole("Guest"), false);
  assert.equal(roleHasPermission("Admin", "view_internal_notes"), true);
  assert.equal(roleHasPermission("Admin", "approve_prompts"), true);
  assert.equal(roleHasPermission("Sales", "client_exports"), true);
  assert.equal(roleHasPermission("Sales", "view_internal_notes"), false);
  assert.equal(roleHasPermission("Trainer", "manage_delivery"), true);
  assert.equal(roleHasPermission("Viewer", "manage_prompts"), false);
});

test("V3.2 seeded eval datasets include agent benchmark examples", () => {
  const seed = createSeedEvalData();

  assert.equal(seed.datasets.length, 8);
  assert.equal(seed.examples.length, 24);
  assert.equal(
    seed.examples.filter((example) => example.datasetId === seed.datasets[0].id).length,
    3,
  );
  assert.ok(seed.datasets.some((dataset) => dataset.targetAgent === "qa_review"));
});

test("V3.3 export safety blocks internal margin exposure", () => {
  const pricingInputs = {
    currency: "USD",
    trainingFormat: "In-house",
    numberOfParticipants: 20,
    numberOfTrainingDays: 1,
    numberOfTrainers: 1,
    trainerDayRate: 500,
    venueCost: 0,
    foodAndBeverageCostPerPerson: 0,
    materialCostPerPerson: 5,
    adminCost: 0,
    marketingCost: 0,
    travelCost: 0,
    otherCost: 0,
    targetProfitMarginPercent: 35,
    discountPercent: 0,
    taxPercent: 0,
    fundingNoteEnabled: false,
    fundingNoteText: "",
    templateMode: "Custom",
  };
  const pricingOutputs = calculatePricing(pricingInputs);
  const safety = validateClientExportSafety({
    pkg: {
      id: "pkg",
      title: "AI Training",
      audience: "Managers",
      duration: "1 day",
      client: "Client",
      promise: "Practical outcomes",
      context: "",
      tone: "Executive",
      syllabus: "",
      proposal: "Client proposal with estimated profit and direct cost.",
      commercialProposal: "",
      deckOutline: "",
      workbook: "",
      followUpEmail: "",
      qualityChecklist: [],
      pricingInputs,
      pricingOutputs,
      knowledgeUsed: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      generationMode: "mock",
    },
    target: "proposal",
    includeInternalNotes: false,
    actorCanApproveInternal: false,
  });

  assert.equal(safety.allowed, false);
  assert.ok(safety.issues.some((issue) => issue.severity === "Critical"));
});

test("V3.3 orchestrator safety detects unauthenticated and external actions", () => {
  const unauthenticated = validateOrchestratorCommandSafety({
    command: "CREATE_PACKAGE",
    payload: {},
    authenticated: false,
  });
  const external = validateOrchestratorCommandSafety({
    command: "CREATE_PACKAGE",
    payload: { instruction: "Send this by Telegram to customer now." },
    authenticated: true,
  });

  assert.equal(unauthenticated.allowed, false);
  assert.equal(external.allowed, false);
  assert.equal(external.requiresApproval, true);
});

test("V3.6 approval rules and autonomy settings protect risky actions", () => {
  assert.equal(actionRequiresApproval("export_with_internal_notes"), true);
  assert.equal(actionRequiresApproval("change_offer_status_killed"), true);
  assert.equal(actionRequiresApproval("low_risk_note_draft"), false);

  const risk = classifyRiskyAction({
    actionType: "export proposal",
    payload: { includeInternalNotes: true, text: "estimated profit margin" },
  });

  assert.equal(risk.requiresApproval, true);
  assert.equal(risk.riskLevel, "High");
  assert.equal(getAutonomySettings().autonomyLevel, "assisted");
  assert.equal(canExecuteLowRiskInternalAction("assisted"), false);
  assert.equal(canExecuteLowRiskInternalAction("supervised"), true);
  assert.equal(canRunScheduledLowRiskLoops("supervised"), false);
  assert.equal(canRunScheduledLowRiskLoops("bounded_auto"), true);
  assert.equal(saveAutonomySettings("manual").autonomyLevel, "manual");
});

test("V3.3 red-team scenarios return deterministic security results", () => {
  const results = runSecurityRedTeamScenarios();

  assert.ok(results.length >= 9);
  assert.ok(results.some((item) => item.category === "OpenClaw overreach"));
  assert.equal(results.every((item) => typeof item.passed === "boolean"), true);
});

test("V3.4 portal tokens are hard to guess and stored as hashes", () => {
  const token = createPortalToken();
  const hash = hashPortalToken(token);

  assert.ok(token.length >= 32);
  assert.notEqual(hash, token);
  assert.equal(hash, hashPortalToken(token));
});

test("V3.4 client-safe renderer strips internal information", () => {
  const cleaned = sanitizeClientText(`Client proposal
Internal notes: do not show
Estimated profit margin: 35%
Quality score: 92
Client-safe next step`);

  assert.match(cleaned, /Client proposal/);
  assert.match(cleaned, /Client-safe next step/);
  assert.doesNotMatch(cleaned, /Internal notes/);
  assert.doesNotMatch(cleaned, /profit margin/);

  const document = buildClientSafePackageDocument({
    documentType: "Proposal",
    pkg: {
      id: "pkg",
      title: "AI Skills",
      audience: "Managers",
      duration: "1 day",
      client: "Client",
      promise: "Practical AI adoption",
      context: "",
      tone: "Executive",
      syllabus: "Syllabus",
      proposal: "Proposal\nInternal-only margin note",
      commercialProposal: "Commercial terms\nDirect cost should stay hidden",
      deckOutline: "",
      workbook: "",
      followUpEmail: "",
      qualityChecklist: [],
      pricingInputs: {},
      pricingOutputs: {},
      knowledgeUsed: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      generationMode: "mock",
    },
  });

  assert.match(document, /Commercial terms/);
  assert.doesNotMatch(document, /Internal-only/);
  assert.doesNotMatch(document, /Direct cost/);
});

test("V3.5 product ROI calculator returns business estimates", () => {
  const roi = calculateProductRoi({
    proposalsPerMonth: 10,
    hoursPerProposal: 5,
    staffCostPerHour: 20,
    expectedTimeSavedPercent: 50,
    trainingsPerYear: 20,
    revenuePerTraining: 3000,
  });

  assert.equal(roi.monthlyHoursSaved, 25);
  assert.equal(roi.annualHoursSaved, 300);
  assert.equal(roi.annualCostSaved, 6000);
  assert.equal(roi.estimatedRevenueSupported, 60000);
  assert.match(roi.roiSummary, /Estimated annual impact/);
});

test("V3.5 product brief contains the commercial offer structure", () => {
  const brief = buildProductBriefMarkdown();

  assert.match(brief, /DG Capability Factory/);
  assert.match(brief, /Starter/);
  assert.match(brief, /Professional/);
  assert.match(brief, /Enterprise/);
});

test("Adaptive Growth fitness and dashboard metrics are deterministic", () => {
  const signal = normalizeMarketSignal({
    title: "Banks asking for AI manager training",
    status: "New",
    urgencyScore: 80,
  });
  const offer = normalizeOfferVariant({
    title: "AI Skills for Managers",
    signalId: signal.id,
    status: "Scaling",
    promise: "Managers leave with practical use cases.",
  });
  const score = calculateFitnessScore({
    experimentId: "experiment-1",
    impressions: 100,
    inquiries: 12,
    proposalsSent: 3,
    dealsWon: 1,
    revenue: 4500,
    estimatedMargin: 45,
    deliveryQualityScore: 90,
    clientInterestScore: 85,
    strategicFitScore: 80,
    reusabilityScore: 90,
  });
  const decision = normalizeSelectionDecision({
    offerVariantId: offer.id,
    decision: "Scale",
    fitnessScore: score,
  });
  const metrics = calculateGrowthDashboardMetrics({
    signals: [signal],
    offers: [offer],
    experiments: [],
    metrics: [],
    decisions: [decision],
    genomeItems: [],
  });

  assert.equal(metrics.activeSignals, 1);
  assert.equal(metrics.offersSelectedToScale, 1);
  assert.equal(metrics.averageFitnessScore, score);
  assert.equal(metrics.topOffersByFitness[0].offer.title, "AI Skills for Managers");
});

test("Fitness Score Engine calculates full data scores deterministically", () => {
  const result = calculateOfferFitness({
    offer: {
      title: "AI Skills for Managers",
      priceAssumption: 6000,
    },
    signal: {
      urgencyScore: 80,
    },
    metrics: {
      impressions: 100,
      inquiries: 12,
      meetings: 4,
      proposalsSent: 4,
      dealsWon: 2,
      revenue: 12000,
      estimatedMargin: 45,
      deliveryQualityScore: 88,
      clientInterestScore: 85,
      strategicFitScore: 90,
      reusabilityScore: 86,
    },
  });

  assert.equal(result.isIncomplete, false);
  assert.equal(result.scoreCompletenessPercent, 100);
  assert.equal(result.fitnessScore, 80);
  assert.equal(result.recommendation, "Scale");
  assert.equal(result.componentScores.marketPullScore, 81);
});

test("Fitness Score Engine reports missing data without pretending precision", () => {
  const result = calculateOfferFitness({
    offer: {
      title: "Untested offer",
      priceAssumption: 2500,
    },
    metrics: {
      inquiries: 2,
    },
  });

  assert.equal(result.isIncomplete, true);
  assert.ok(result.scoreCompletenessPercent < 100);
  assert.ok(result.missingDataWarnings.length > 0);
  assert.equal(result.componentScores.deliveryQualityScore, null);
});

test("Fitness Score Engine handles zero data and recommends kill", () => {
  const result = calculateOfferFitness({
    metrics: {
      impressions: 0,
      inquiries: 0,
      meetings: 0,
      proposalsSent: 0,
      dealsWon: 0,
      revenue: 0,
    },
  });

  assert.equal(result.fitnessScore, 0);
  assert.equal(result.recommendation, "Kill");
  assert.equal(result.isIncomplete, true);
});

test("Fitness Score Engine maps scale and kill recommendation bands", () => {
  assert.equal(recommendSelection(84).recommendation, "Scale");
  assert.equal(recommendSelection(20).recommendation, "Kill");
  assert.equal(
    recommendSelection(70, { reusabilityScore: 80 }).recommendation,
    "Productize",
  );
  assert.equal(recommendSelection(70, { reusabilityScore: 30 }).recommendation, "Iterate");
});

test("Fitness Score Engine supports manual overrides", () => {
  const result = calculateOfferFitness({
    metrics: {
      inquiries: 1,
      proposalsSent: 1,
      dealsWon: 0,
    },
    manualOverrides: {
      strategicFitScore: 95,
      reusabilityScore: 90,
      deliveryQualityScore: 80,
    },
    manualFitnessOverride: 72,
  });

  assert.equal(result.fitnessScore, 72);
  assert.equal(result.manualOverrideUsed, true);
  assert.equal(result.componentScores.strategicFitScore, 95);
});
