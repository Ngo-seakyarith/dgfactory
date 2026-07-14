import {
  calculatePipelineMetrics,
  formatCrmMoney,
  type Client,
  type FollowUpDraft,
  type Opportunity,
} from "@/lib/crm";
import { listClients, listOpportunities } from "@/lib/crm-storage";
import { listDeliveryProjects, listDeliveryTasks } from "@/lib/delivery-storage";
import { getQualityDashboardMetrics } from "@/lib/evaluation-storage";
import { listPromptImprovementSuggestions } from "@/lib/evaluation-storage";
import { listTrainingPackages } from "@/features/training-packages/storage/training-storage";
import { listKnowledgeDocuments } from "@/lib/knowledge-storage";
import { listAdaptiveGrowthData } from "@/lib/adaptive-growth-storage";
import { calculateOfferFitness } from "@/lib/adaptive-growth/fitness";
import { mutationStrategies } from "@/lib/brain/agents";
import { routeBrainTask } from "@/lib/brain/routing/router";
import { saveApprovalRequest } from "@/lib/approvals";
import { buildPilotReport, calculatePilotMetrics } from "@/lib/pilot";
import { getPilotSnapshot } from "@/lib/pilot-storage";
import { saveLoopRun } from "@/lib/loops/storage";
import { loopTypeLabel, normalizeLoopRun, type LoopRun, type LoopType } from "@/lib/loops/types";

type LoopResult = {
  output: Record<string, unknown>;
  summary: string;
  recommendations: string[];
};

type ApprovalRequiredAction = {
  actionType: string;
  riskLevel: "Low" | "Medium" | "High";
  reason: string;
  payload: Record<string, unknown>;
};

type RunLoopInput = {
  loopType: LoopType;
  input?: Record<string, unknown>;
};

const inactiveStatuses = new Set(["Won", "Lost", "Dormant"]);

function daysAgo(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function daysAhead(days: number) {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  date.setDate(date.getDate() + days);
  return date;
}

function parseDate(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function clientNameFor(opportunity: Opportunity, clients: Client[]) {
  return (
    clients.find((client) => client.id === opportunity.clientId)?.name ||
    "Client"
  );
}

function opportunitySummary(opportunity: Opportunity, clients: Client[]) {
  return {
    id: opportunity.id,
    title: opportunity.title || "Untitled opportunity",
    client: clientNameFor(opportunity, clients),
    status: opportunity.status,
    estimatedValue: opportunity.estimatedValue,
    probabilityPercent: opportunity.probabilityPercent,
    nextFollowUpDate: opportunity.nextFollowUpDate,
    updatedAt: opportunity.updatedAt,
  };
}

function requiresAdaptiveApproval(action: ApprovalRequiredAction) {
  const text = JSON.stringify(action.payload).toLowerCase();
  return (
    text.includes("killed") ||
    text.includes("scaling") ||
    text.includes("productized") ||
    text.includes("client visible") ||
    action.actionType.includes("STATUS_CHANGE") ||
    action.actionType.includes("CLIENT_VISIBLE")
  );
}

async function createAdaptiveLoopApprovals(
  loopType: LoopType,
  actions: ApprovalRequiredAction[],
) {
  const riskyActions = actions.filter(requiresAdaptiveApproval);
  const approvals = [];

  for (const action of riskyActions) {
    const saved = await saveApprovalRequest({
      requestedBy: `Scheduled loop: ${loopType}`,
      actionType: action.actionType,
      payload: {
        ...action.payload,
        loopType,
        safety:
          "This is a recommendation only. No status, visibility, export, or external action has been executed.",
      },
      riskLevel: action.riskLevel,
      status: "Pending",
      humanNote: action.reason,
    });
    approvals.push(saved.approval);
  }

  return approvals;
}

function summarizeSignalCandidate(source: string, title: string, description: string) {
  return {
    title,
    description,
    sourceType: source,
    status: "Suggested",
  };
}

function latestMetricForExperiment(
  experimentId: string,
  metrics: Awaited<ReturnType<typeof listAdaptiveGrowthData>>["metrics"],
) {
  return (
    metrics
      .filter((metric) => metric.experimentId === experimentId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
  );
}

function isActiveOpportunity(opportunity: Opportunity) {
  return !inactiveStatuses.has(opportunity.status);
}

function getStuckOpportunities(opportunities: Opportunity[]) {
  const threshold = daysAgo(14);

  return opportunities.filter((opportunity) => {
    const updatedAt = parseDate(opportunity.updatedAt);
    return isActiveOpportunity(opportunity) && !!updatedAt && updatedAt < threshold;
  });
}

async function runWeeklyPipelineReview(): Promise<LoopResult> {
  const [clients, opportunities] = await Promise.all([
    listClients(),
    listOpportunities(),
  ]);
  const metrics = calculatePipelineMetrics(opportunities);
  const active = opportunities.filter(isActiveOpportunity);
  const stuck = getStuckOpportunities(opportunities);
  const proposalStatuses = new Set(["Proposal Draft", "Proposal Sent", "Negotiation"]);
  const proposalValue = opportunities
    .filter((opportunity) => proposalStatuses.has(opportunity.status))
    .reduce((total, opportunity) => total + opportunity.estimatedValue, 0);

  const recommendations = [
    stuck.length
      ? `Follow up on ${stuck.length} stuck active opportunit${stuck.length === 1 ? "y" : "ies"} this week.`
      : "Keep active opportunities moving with clear next follow-up dates.",
    metrics.upcomingFollowUps.length
      ? `Prepare outreach for ${metrics.upcomingFollowUps.length} upcoming follow-up${metrics.upcomingFollowUps.length === 1 ? "" : "s"}.`
      : "Add follow-up dates to active opportunities without a next action.",
    proposalValue
      ? `Review proposal-stage value of ${formatCrmMoney(proposalValue)} and confirm decision owners.`
      : "Move qualified discovery opportunities into proposal draft when scope is clear.",
  ];

  return {
    output: {
      activeOpportunities: active.map((item) => opportunitySummary(item, clients)),
      stuckOpportunities: stuck.map((item) => opportunitySummary(item, clients)),
      upcomingFollowUps: metrics.upcomingFollowUps.map((item) =>
        opportunitySummary(item, clients),
      ),
      proposalValue,
      proposalValueFormatted: formatCrmMoney(proposalValue),
      weightedPipelineValue: metrics.weightedPipelineValue,
      weightedPipelineValueFormatted: formatCrmMoney(metrics.weightedPipelineValue),
      recommendedNextActions: recommendations,
    },
    summary: `${active.length} active opportunities, ${stuck.length} stuck, ${formatCrmMoney(proposalValue)} in proposal-stage value.`,
    recommendations,
  };
}

async function runWeeklyContentIdeas(): Promise<LoopResult> {
  const [clients, opportunities] = await Promise.all([
    listClients(),
    listOpportunities(),
  ]);
  const sectors = [
    ...new Set(clients.map((client) => client.sector).filter(Boolean)),
  ].slice(0, 3);
  const priorityNeed =
    opportunities.find((opportunity) => isActiveOpportunity(opportunity))
      ?.trainingNeed || "AI adoption and practical productivity";
  const sectorLine = sectors.length ? sectors.join(", ") : "Cambodia SMEs and corporate teams";

  const output = {
    linkedInPostIdeas: [
      `What Cambodian managers should do before buying AI tools: start with workflow clarity.`,
      `Three practical AI governance habits for ${sectorLine}.`,
      `From prompt experiments to business capability: how DG Academy structures AI training.`,
      `Why middle managers are the missing layer in AI adoption.`,
      `A simple 30-day plan after an AI skills workshop.`,
    ],
    trainingProductIdeas: [
      "AI Skills for Managers: practical workflow sprint",
      `Sector AI Use Case Lab for ${sectorLine}`,
      "Executive AI Governance and Adoption Masterclass",
    ],
    frontierFlashTopics: [
      "What changed in AI this week for business leaders",
      "A practical AI workflow example DG Academy would teach",
      `AI risk and readiness note for ${sectorLine}`,
    ],
    recommendedCampaign: `Run a two-week campaign around "${priorityNeed}" with one executive post, one client-safe case example, one workshop offer, and one follow-up call script.`,
  };

  return {
    output,
    summary: "Generated weekly content ideas for LinkedIn, training products, Frontier Flash, and one campaign.",
    recommendations: [
      "Choose one sector focus for the week before publishing.",
      "Turn the best LinkedIn post into a short client email for warm opportunities.",
      "Use the campaign idea only as a draft; do not send externally without approval.",
    ],
  };
}

async function runMonthlyRevenueSummary(): Promise<LoopResult> {
  const [opportunities, deliveryProjects] = await Promise.all([
    listOpportunities(),
    listDeliveryProjects(),
  ]);
  const won = opportunities.filter((opportunity) => opportunity.status === "Won");
  const pendingProposals = opportunities.filter((opportunity) =>
    ["Proposal Draft", "Proposal Sent", "Negotiation"].includes(opportunity.status),
  );
  const deliveryCompleted = deliveryProjects.filter((project) =>
    ["Delivered", "Report Sent", "Completed"].includes(project.deliveryStatus),
  );
  const estimatedRevenue = won.reduce(
    (total, opportunity) => total + opportunity.estimatedValue,
    0,
  );

  const recommendations = [
    pendingProposals.length
      ? `Review ${pendingProposals.length} pending proposal${pendingProposals.length === 1 ? "" : "s"} before month-end.`
      : "Create new qualified proposal opportunities for the next month.",
    deliveryCompleted.length
      ? "Convert completed deliveries into testimonials, referrals, or advanced training offers."
      : "Confirm delivery dates for won work so revenue can move into execution.",
    "Compare estimated value with actual invoice data before financial reporting.",
  ];

  return {
    output: {
      wonOpportunities: won.map((item) => ({
        id: item.id,
        title: item.title,
        estimatedValue: item.estimatedValue,
      })),
      estimatedRevenue,
      estimatedRevenueFormatted: formatCrmMoney(estimatedRevenue),
      deliveryCompleted: deliveryCompleted.map((project) => ({
        id: project.id,
        title: project.title,
        status: project.deliveryStatus,
        trainingDate: project.trainingDate,
      })),
      pendingProposals: pendingProposals.map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        estimatedValue: item.estimatedValue,
      })),
      recommendations,
    },
    summary: `${won.length} won opportunities, ${formatCrmMoney(estimatedRevenue)} estimated revenue, ${pendingProposals.length} pending proposals.`,
    recommendations,
  };
}

async function runQualityImprovementReview(): Promise<LoopResult> {
  const metrics = await getQualityDashboardMetrics();
  const recommendations = [
    metrics.lowestScoringOutputTypes.length
      ? `Review ${metrics.lowestScoringOutputTypes[0].outputType} first because it has the lowest average score.`
      : "Create new evaluations so quality trends become visible.",
    metrics.pendingImprovementSuggestions.length
      ? `Approve or reject ${metrics.pendingImprovementSuggestions.length} pending prompt improvement suggestion${metrics.pendingImprovementSuggestions.length === 1 ? "" : "s"}.`
      : "Ask AI QA to evaluate recent packages and generate prompt suggestions.",
    "Protect internal margin and pricing logic from client-facing exports during every quality review.",
  ];

  return {
    output: {
      averageQaScore: metrics.averageQaScore,
      lowestScoringPackages: metrics.lowestScoringOutputTypes,
      repeatedWeaknesses: metrics.mostCommonWeaknesses,
      suggestedPromptImprovements: metrics.pendingImprovementSuggestions.slice(0, 8),
      recommendedTrainingProductImprovements: [
        "Add stronger client-specific examples to low-scoring proposals.",
        "Add implementation exercises where workbook scores are weak.",
        "Clarify measurable business outcomes in syllabus and proposal templates.",
      ],
    },
    summary: `Average QA score is ${metrics.averageQaScore || 0}. ${metrics.pendingImprovementSuggestions.length} prompt suggestions are pending.`,
    recommendations,
  };
}

async function runDeliveryReadinessCheck(): Promise<LoopResult> {
  const [projects, tasks] = await Promise.all([
    listDeliveryProjects(),
    listDeliveryTasks(),
  ]);
  const today = daysAgo(0);
  const upcomingLimit = daysAhead(30);
  const upcomingProjects = projects.filter((project) => {
    const date = parseDate(project.trainingDate);
    return (
      !!date &&
      date >= today &&
      date <= upcomingLimit &&
      !["Completed", "Cancelled"].includes(project.deliveryStatus)
    );
  });

  const projectReadiness = upcomingProjects.map((project) => {
    const projectTasks = tasks.filter((task) => task.deliveryProjectId === project.id);
    const openTasks = projectTasks.filter((task) => task.status !== "Done");
    const materialTasks = projectTasks.filter((task) => task.category === "Materials");
    const materialOpen = materialTasks.filter((task) => task.status !== "Done");

    return {
      id: project.id,
      title: project.title,
      status: project.deliveryStatus,
      trainingDate: project.trainingDate,
      missingTasks: openTasks.map((task) => ({
        id: task.id,
        title: task.title,
        category: task.category,
        dueDate: task.dueDate,
        owner: task.owner,
      })),
      materialsReadiness: materialTasks.length
        ? `${materialTasks.length - materialOpen.length}/${materialTasks.length} material tasks done`
        : "No materials tasks found",
      riskNotes: openTasks.length
        ? `${openTasks.length} open delivery task${openTasks.length === 1 ? "" : "s"} remain.`
        : "No open delivery tasks for this project.",
    };
  });

  const totalOpenTasks = projectReadiness.reduce(
    (total, project) => total + project.missingTasks.length,
    0,
  );
  const recommendations = [
    upcomingProjects.length
      ? `Review ${upcomingProjects.length} upcoming delivery project${upcomingProjects.length === 1 ? "" : "s"} for readiness.`
      : "No delivery projects are scheduled in the next 30 days.",
    totalOpenTasks
      ? `Close or assign ${totalOpenTasks} open delivery task${totalOpenTasks === 1 ? "" : "s"}.`
      : "Keep confirmed delivery materials and logistics records up to date.",
    "Do not send participant emails until the client sponsor has approved the final logistics.",
  ];

  return {
    output: {
      upcomingDeliveryProjects: projectReadiness,
      missingTasks: projectReadiness.flatMap((project) => project.missingTasks),
      materialsReadiness: projectReadiness.map((project) => ({
        projectId: project.id,
        title: project.title,
        readiness: project.materialsReadiness,
      })),
      riskNotes: projectReadiness.map((project) => project.riskNotes),
    },
    summary: `${upcomingProjects.length} upcoming delivery projects and ${totalOpenTasks} open tasks found.`,
    recommendations,
  };
}

async function runStaleOpportunityFollowUp(): Promise<LoopResult> {
  const [clients, opportunities] = await Promise.all([
    listClients(),
    listOpportunities(),
  ]);
  const stale = getStuckOpportunities(opportunities);
  const drafts = await Promise.all(stale.map(async (opportunity) => {
    const clientName = clientNameFor(opportunity, clients);
    const input = {
      clientName,
      status: opportunity.status,
      trainingNeed: opportunity.trainingNeed,
      lastNotes: opportunity.notes,
      nextFollowUpDate: opportunity.nextFollowUpDate,
    };
    const result = await routeBrainTask<typeof input, FollowUpDraft>({
      taskType: "follow_up",
      input,
    });
    const draft = result.output;

    return {
      opportunity: opportunitySummary(opportunity, clients),
      draftFollowUpEmail: draft.followUpEmail,
      draftShortMessage: draft.shortMessage,
      suggestedNextStep: draft.suggestedNextStep,
      recommendedPriority:
        opportunity.status === "Proposal Sent" || opportunity.status === "Negotiation"
          ? "High"
          : "Medium",
    };
  }));

  const recommendations = [
    stale.length
      ? `Review ${stale.length} stale opportunit${stale.length === 1 ? "y" : "ies"} and approve any outreach before sending.`
      : "No stale active opportunities found.",
    "Confirm whether each stale opportunity should move forward, pause, or become dormant.",
    "Generated follow-up copy is draft-only and must not be sent automatically.",
  ];

  return {
    output: {
      staleOpportunities: stale.map((item) => opportunitySummary(item, clients)),
      draftFollowUpMessages: drafts,
    },
    summary: `${stale.length} opportunities have no update in the last 14 days.`,
    recommendations,
  };
}

async function runPromptImprovementReview(): Promise<LoopResult> {
  const suggestions = await listPromptImprovementSuggestions();
  const pending = suggestions.filter((suggestion) => suggestion.status === "Suggested");
  const approved = suggestions.filter((suggestion) => suggestion.status === "Approved");
  const implemented = suggestions.filter(
    (suggestion) => suggestion.status === "Implemented",
  );
  const recommendations = [
    pending.length
      ? `Review ${pending.length} suggested prompt change${pending.length === 1 ? "" : "s"} for approval or rejection.`
      : "No pending prompt suggestions; run AI evaluation on recent outputs.",
    approved.length
      ? `Convert ${approved.length} approved prompt suggestion${approved.length === 1 ? "" : "s"} into draft prompt templates.`
      : "Keep approved prompt changes separate from implementation until a human reviewer confirms them.",
    "Do not activate any prompt automatically from this loop.",
  ];

  return {
    output: {
      pendingSuggestions: pending.slice(0, 10),
      approvedSuggestions: approved.slice(0, 10),
      implementedSuggestions: implemented.slice(0, 10),
      suggestedNextReviewActions: recommendations,
    },
    summary: `${pending.length} pending, ${approved.length} approved, and ${implemented.length} implemented prompt improvements.`,
    recommendations,
  };
}

async function runPilotWeeklyReview(): Promise<LoopResult> {
  const snapshot = await getPilotSnapshot();
  const metrics = await calculatePilotMetrics(snapshot);
  const report = buildPilotReport({ metrics });
  const blockers = metrics.topIssues.filter((issue) =>
    issue.severity === "Critical" || issue.severity === "High",
  );
  const atRiskGoals = metrics.pilotGoals.filter((goal) => goal.status === "At Risk");
  const recommendations = [
    blockers.length
      ? `Resolve ${blockers.length} high-priority pilot blocker${blockers.length === 1 ? "" : "s"} before expanding usage.`
      : "No critical/high pilot blockers are currently reported.",
    atRiskGoals.length
      ? `Focus next week on ${atRiskGoals.map((goal) => goal.title).slice(0, 2).join(" and ")}.`
      : "Pilot goals are moving; keep collecting real proposal and delivery usage.",
    "Create Codex tasks from the top issues and repeated feedback themes.",
  ];

  return {
    output: {
      pilotUsage: {
        packagesCreated: metrics.packagesCreated,
        proposalsExported: metrics.proposalsExported,
        opportunitiesCreated: metrics.opportunitiesCreated,
        deliveryProjectsCreated: metrics.deliveryProjectsCreated,
        feedbackRecordsSubmitted: metrics.feedbackRecordsSubmitted,
      },
      blockers,
      qualityIssues: {
        averageQaScore: metrics.averageQaScore,
        qaReviewsCompleted: metrics.qaReviewsCompleted,
        issuesReported: metrics.issuesReported,
      },
      nextActions: recommendations,
      recommendedCodexTasks: [
        "Turn the top pilot issue into a scoped bug-fix story.",
        "Improve the lowest-rated pilot feature from feedback records.",
        "Add one missing metric or report field requested by Sopheap during the pilot.",
      ],
      pilotReport: report,
    },
    summary: `Pilot weekly review: ${metrics.packagesCreated} packages, ${metrics.proposalsExported} proposal exports, ${metrics.issuesReported} issues, QA average ${metrics.averageQaScore}.`,
    recommendations,
  };
}

async function runWeeklyMarketSensing(): Promise<LoopResult> {
  const [clients, opportunities, knowledgeDocuments, growthData] = await Promise.all([
    listClients(),
    listOpportunities(),
    listKnowledgeDocuments(),
    listAdaptiveGrowthData(),
  ]);
  const activeOpportunities = opportunities.filter(isActiveOpportunity);
  const sectorCounts = new Map<string, number>();

  clients.forEach((client) => {
    if (client.sector) {
      sectorCounts.set(client.sector, (sectorCounts.get(client.sector) ?? 0) + 1);
    }
  });
  activeOpportunities.forEach((opportunity) => {
    const client = clients.find((item) => item.id === opportunity.clientId);
    if (client?.sector) {
      sectorCounts.set(client.sector, (sectorCounts.get(client.sector) ?? 0) + 2);
    }
  });

  const topSectors = [...sectorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sector, count]) => ({ sector, evidenceCount: count }));
  const recentSignals = growthData.signals.slice(0, 8);
  const trainingFeedback = knowledgeDocuments
    .filter((document) =>
      ["Training Feedback", "Sector Insight", "Client Note"].some((term) =>
        [document.type, document.title, document.tags.join(" ")].join(" ").includes(term),
      ),
    )
    .slice(0, 6);
  const suggestedSignals = [
    ...topSectors.map((item) =>
      summarizeSignalCandidate(
        "CRM",
        `${item.sector} demand pattern`,
        `${item.evidenceCount} CRM/client signals suggest ${item.sector} may be worth deeper AI training offer testing.`,
      ),
    ),
    ...activeOpportunities.slice(0, 3).map((opportunity) =>
      summarizeSignalCandidate(
        "Opportunity",
        opportunity.title || "Active opportunity signal",
        opportunity.trainingNeed || opportunity.notes || "Active client need from pipeline.",
      ),
    ),
  ].slice(0, 8);
  const topOpportunityAreas = [
    ...topSectors.map((item) => `${item.sector}: test practical AI capability offers.`),
    activeOpportunities[0]?.trainingNeed
      ? `Pipeline need: ${activeOpportunities[0].trainingNeed}`
      : "AI adoption readiness for Cambodia managers.",
  ].slice(0, 5);
  const recommendedOfferMutations = suggestedSignals.slice(0, 4).map((signal, index) => ({
    signalTitle: signal.title,
    mutationStrategy: mutationStrategies[index % mutationStrategies.length],
    recommendation: `Generate 5 small variants from "${signal.title}" and test the top 2 with warm contacts.`,
  }));
  const recommendations = [
    suggestedSignals.length
      ? `Review ${suggestedSignals.length} suggested market signal${suggestedSignals.length === 1 ? "" : "s"} before adding them.`
      : "Add manual market signals from recent client conversations.",
    recommendedOfferMutations.length
      ? "Run weekly_offer_mutation for the top signals before creating experiments."
      : "Collect more market evidence before mutating offers.",
    "Do not publish or send any market outreach from this loop without approval.",
  ];

  return {
    output: {
      summarizedMarketSignals: recentSignals,
      suggestedNewSignals: suggestedSignals,
      topOpportunityAreas,
      recommendedOfferMutations,
      inputSources: {
        activeOpportunities: activeOpportunities.length,
        clients: clients.length,
        knowledgeBaseItems: knowledgeDocuments.length,
        trainingFeedbackItems: trainingFeedback.length,
      },
      approvalRequiredActions: [],
    },
    summary: `${suggestedSignals.length} suggested signals, ${topOpportunityAreas.length} opportunity areas, ${recommendedOfferMutations.length} mutation recommendations.`,
    recommendations,
  };
}

async function runWeeklyOfferMutation(): Promise<LoopResult> {
  const growthData = await listAdaptiveGrowthData();
  const topSignals = growthData.signals
    .filter((signal) => signal.status !== "Archived")
    .sort((a, b) => Number(b.urgencyScore ?? 0) - Number(a.urgencyScore ?? 0))
    .slice(0, 5);
  const existingTitles = new Set(
    growthData.offers.map((offer) => offer.title.toLowerCase()),
  );
  const suggestedOfferVariants = topSignals.flatMap((signal, signalIndex) =>
    mutationStrategies.slice(0, 3).map((strategy, index) => ({
      sourceSignalId: signal.id,
      sourceSignal: signal.title,
      title: `${signal.title}: ${strategy.replace(" mutation", "")} test ${index + 1}`,
      targetAudience: signal.audience || "Managers",
      sector: signal.sector || "Cambodia corporate market",
      format: index === 0 ? "Briefing" : index === 1 ? "Workshop" : "Online Cohort",
      promise: `Test a small ${signal.sector || "market"} offer around ${signal.title}.`,
      mutationStrategy: strategy,
      duplicateRisk: existingTitles.has(signal.title.toLowerCase()),
      priority: signalIndex === 0 && index < 2 ? "High" : "Medium",
    })),
  );
  const weakOrDuplicateIdeas = suggestedOfferVariants
    .filter((variant) => variant.duplicateRisk)
    .map((variant) => variant.title);
  const topTests = suggestedOfferVariants
    .filter((variant) => !variant.duplicateRisk)
    .slice(0, 3)
    .map((variant) => ({
      title: variant.title,
      testMethod: "Pitch to 3 warm contacts or post one LinkedIn test and measure inquiries.",
      successCriteria: "At least 2 inquiries or 1 discovery meeting within 14 days.",
    }));
  const recommendations = [
    suggestedOfferVariants.length
      ? `Review ${suggestedOfferVariants.length} suggested variants and save only the strongest.`
      : "Create or review market signals before mutating offers.",
    topTests.length
      ? "Select the top 3 tests manually; this loop has not created offers or experiments."
      : "Avoid generating variants until stronger signals exist.",
    weakOrDuplicateIdeas.length
      ? `Avoid ${weakOrDuplicateIdeas.length} weak or duplicate idea${weakOrDuplicateIdeas.length === 1 ? "" : "s"}.`
      : "Check the learning genome for failed patterns before saving variants.",
  ];

  return {
    output: {
      suggestedOfferVariants,
      top3RecommendedTests: topTests,
      weakDuplicateIdeasToAvoid: weakOrDuplicateIdeas,
      approvalRequiredActions: [],
    },
    summary: `${suggestedOfferVariants.length} draft variants suggested from ${topSignals.length} signal${topSignals.length === 1 ? "" : "s"}.`,
    recommendations,
  };
}

async function runWeeklyExperimentReview(): Promise<LoopResult> {
  const growthData = await listAdaptiveGrowthData();
  const running = growthData.experiments.filter(
    (experiment) => experiment.status === "Running",
  );
  const experimentsNeedingAction = running.map((experiment) => {
    const metric = latestMetricForExperiment(experiment.id, growthData.metrics);
    const missingData = [
      metric ? "" : "metrics record",
      metric && !metric.inquiries ? "inquiries" : "",
      metric && !metric.proposalsSent ? "proposals sent" : "",
      metric && metric.clientInterestScore === null ? "client interest score" : "",
    ].filter(Boolean);
    return {
      experiment,
      latestMetrics: metric,
      missingData,
      suggestedFollowUp: missingData.length
        ? "Add missing metrics before selection review."
        : "Move to selection review if the test window is complete.",
      riskWarning:
        !metric || missingData.length
          ? "Selection may be premature without enough evidence."
          : "No major metric gap detected.",
    };
  });
  const recommendations = [
    experimentsNeedingAction.length
      ? `Review ${experimentsNeedingAction.length} running experiment${experimentsNeedingAction.length === 1 ? "" : "s"}.`
      : "No running experiments found; create tests from high-confidence offers.",
    "Update metrics before making scale, kill, or productize decisions.",
    "Follow-up drafts from experiments must be approved before external sending.",
  ];

  return {
    output: {
      experimentsNeedingAction,
      missingData: experimentsNeedingAction.flatMap((item) =>
        item.missingData.map((missing) => ({
          experimentId: item.experiment.id,
          missing,
        })),
      ),
      suggestedFollowUps: experimentsNeedingAction.map((item) => ({
        experimentId: item.experiment.id,
        suggestion: item.suggestedFollowUp,
      })),
      riskWarnings: experimentsNeedingAction.map((item) => item.riskWarning),
      approvalRequiredActions: [],
    },
    summary: `${experimentsNeedingAction.length} running experiments reviewed.`,
    recommendations,
  };
}

async function runWeeklySelectionReview(): Promise<LoopResult> {
  const growthData = await listAdaptiveGrowthData();
  const completed = growthData.experiments.filter(
    (experiment) => experiment.status === "Completed",
  );
  const reviewed = completed.map((experiment) => {
    const offer = growthData.offers.find((item) => item.id === experiment.offerVariantId);
    const metric = latestMetricForExperiment(experiment.id, growthData.metrics);
    const signal = offer?.signalId
      ? growthData.signals.find((item) => item.id === offer.signalId) ?? null
      : null;
    const fitness = calculateOfferFitness({
      offer,
      signal,
      experiment,
      metrics: metric,
    });
    return { offer, experiment, metric, fitness };
  });
  const scaleCandidates = reviewed.filter((item) => item.fitness.recommendation === "Scale");
  const iterateCandidates = reviewed.filter((item) => item.fitness.recommendation === "Iterate" || item.fitness.recommendation === "Productize");
  const killCandidates = reviewed.filter((item) => item.fitness.recommendation === "Kill" || item.fitness.recommendation === "Park");
  const approvalRequiredActions: ApprovalRequiredAction[] = [
    ...scaleCandidates.map((item) => ({
      actionType: "ADAPTIVE_GROWTH_STATUS_CHANGE",
      riskLevel: "Medium" as const,
      reason: "Scaling status changes require human approval.",
      payload: {
        offerVariantId: item.offer?.id,
        experimentId: item.experiment.id,
        recommendedStatus: "Scaling",
        fitnessScore: item.fitness.fitnessScore,
        recommendation: item.fitness.recommendation,
      },
    })),
    ...killCandidates.map((item) => ({
      actionType: "ADAPTIVE_GROWTH_STATUS_CHANGE",
      riskLevel: "Medium" as const,
      reason: "Killed/Parked status changes require human approval.",
      payload: {
        offerVariantId: item.offer?.id,
        experimentId: item.experiment.id,
        recommendedStatus: item.fitness.recommendation === "Kill" ? "Killed" : "Parked",
        fitnessScore: item.fitness.fitnessScore,
        recommendation: item.fitness.recommendation,
      },
    })),
    ...iterateCandidates
      .filter((item) => item.fitness.recommendation === "Productize")
      .map((item) => ({
        actionType: "ADAPTIVE_GROWTH_STATUS_CHANGE",
        riskLevel: "Medium" as const,
        reason: "Productized status changes require human approval.",
        payload: {
          offerVariantId: item.offer?.id,
          experimentId: item.experiment.id,
          recommendedStatus: "Productized",
          fitnessScore: item.fitness.fitnessScore,
          recommendation: item.fitness.recommendation,
        },
      })),
  ];
  const approvals = await createAdaptiveLoopApprovals("weekly_selection_review", approvalRequiredActions);
  const recommendations = [
    scaleCandidates.length
      ? `${scaleCandidates.length} scale candidate${scaleCandidates.length === 1 ? "" : "s"} need human approval before status changes.`
      : "No scale candidates found from completed experiments.",
    iterateCandidates.length
      ? `${iterateCandidates.length} offer${iterateCandidates.length === 1 ? "" : "s"} should iterate or productize after review.`
      : "No iterate/productize candidates found.",
    killCandidates.length
      ? `${killCandidates.length} weak candidate${killCandidates.length === 1 ? "" : "s"} should be parked or killed only after approval.`
      : "No kill candidates found.",
  ];

  return {
    output: {
      scaleCandidates,
      iterateCandidates,
      killCandidates,
      rationale: reviewed.map((item) => ({
        offerTitle: item.offer?.title ?? "Unknown offer",
        score: item.fitness.fitnessScore,
        recommendation: item.fitness.recommendation,
        rationale: item.fitness.rationale,
      })),
      suggestedSelectionDecisions: reviewed.map((item) => ({
        offerVariantId: item.offer?.id,
        experimentId: item.experiment.id,
        decision: item.fitness.recommendation,
        fitnessScore: item.fitness.fitnessScore,
      })),
      approvalRequiredActions,
      createdApprovalRequests: approvals,
    },
    summary: `${reviewed.length} completed experiments reviewed: ${scaleCandidates.length} scale, ${iterateCandidates.length} iterate/productize, ${killCandidates.length} park/kill.`,
    recommendations,
  };
}

async function runWeeklyReplicationReview(): Promise<LoopResult> {
  const [growthData, packages] = await Promise.all([
    listAdaptiveGrowthData(),
    listTrainingPackages(),
  ]);
  const latestDecisionByOffer = new Map<string, typeof growthData.decisions[number]>();
  growthData.decisions
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .forEach((decision) => {
      if (!latestDecisionByOffer.has(decision.offerVariantId)) {
        latestDecisionByOffer.set(decision.offerVariantId, decision);
      }
    });
  const winning = growthData.offers
    .map((offer) => ({
      offer,
      decision: latestDecisionByOffer.get(offer.id),
      packageAssets: packages.filter((pkg) =>
        [pkg.title, pkg.context, pkg.promise].join(" ").toLowerCase().includes(offer.title.toLowerCase().slice(0, 20)),
      ),
    }))
    .filter((item) => item.decision && ["Scale", "Productize", "Bundle", "Partner"].includes(item.decision.decision));
  const offersReadyToBecomeTemplates = winning.map((item) => ({
    offerVariantId: item.offer.id,
    title: item.offer.title,
    decision: item.decision?.decision,
    fitnessScore: item.decision?.fitnessScore,
    packageAssetsAvailable: item.packageAssets.length,
  }));
  const genomeItemsToCreate = winning.flatMap((item) => [
    `Winning Pattern: ${item.offer.title}`,
    `Proposal Language: ${item.offer.title}`,
    `Sales Message: ${item.offer.title}`,
    `Training Activity: ${item.offer.title}`,
  ]);
  const assetsToGenerate = winning.map((item) => ({
    offerVariantId: item.offer.id,
    assets: ["training template", "proposal template", "pricing note", "sales message", "delivery checklist"],
  }));
  const expansionPaths = winning.flatMap((item) => [
    `${item.offer.title}: executive masterclass`,
    `${item.offer.title}: online cohort`,
    `${item.offer.title}: partner channel version`,
  ]);
  const recommendations = [
    winning.length
      ? `Replicate ${winning.length} winning offer${winning.length === 1 ? "" : "s"} into genome items.`
      : "No winning offers are ready for replication.",
    "Use /adaptive-growth/genome to run replication; this loop does not create assets automatically.",
    "Keep replicated knowledge Internal until reviewed as Client-safe.",
  ];

  return {
    output: {
      offersReadyToBecomeTemplates,
      genomeItemsToCreate,
      assetsToGenerate,
      expansionPaths,
      approvalRequiredActions: [],
    },
    summary: `${winning.length} winning offers ready for replication review.`,
    recommendations,
  };
}

async function runMonthlyLearningGenomeUpdate(): Promise<LoopResult> {
  const [growthData, suggestions] = await Promise.all([
    listAdaptiveGrowthData(),
    listPromptImprovementSuggestions(),
  ]);
  const activeGenome = growthData.genomeItems.filter((item) => item.status === "Active");
  const failedPatterns = activeGenome.filter((item) => item.type === "Failed Pattern");
  const winningPatterns = activeGenome.filter((item) => item.type === "Winning Pattern");
  const promptSuggestions = suggestions.filter((suggestion) => suggestion.status === "Suggested");
  const repeatedMistakes = failedPatterns.slice(0, 5).map((item) => item.title);
  const recommendedCodexTasks = [
    winningPatterns.length
      ? "Turn the strongest winning pattern into a package template preset."
      : "Add winning pattern genome items from selected offers.",
    failedPatterns.length
      ? "Add a pre-generation warning when a new offer resembles a failed pattern."
      : "Record failed patterns from parked/killed offers.",
    promptSuggestions.length
      ? "Review pending prompt suggestions and create approved draft templates."
      : "Run QA/evaluation loops to find prompt improvement opportunities.",
  ];
  const recommendations = [
    `${activeGenome.length} active genome items reviewed.`,
    repeatedMistakes.length
      ? `Address repeated mistakes: ${repeatedMistakes.slice(0, 3).join("; ")}.`
      : "No active failed patterns yet; capture more learning from weak offers.",
    "Prompt/template updates require human approval and eval smoke checks.",
  ];

  return {
    output: {
      patternsLearned: winningPatterns.slice(0, 10),
      repeatedMistakes,
      recommendedPromptTemplateUpdates: promptSuggestions.slice(0, 8),
      recommendedCodexTasks,
      approvalRequiredActions: [],
    },
    summary: `${activeGenome.length} active genome items, ${winningPatterns.length} winning patterns, ${failedPatterns.length} failed patterns.`,
    recommendations,
  };
}

async function runQuarterlyExpansionStrategy(): Promise<LoopResult> {
  const [growthData, clients, opportunities] = await Promise.all([
    listAdaptiveGrowthData(),
    listClients(),
    listOpportunities(),
  ]);
  const sectorRevenue = new Map<string, number>();
  opportunities.forEach((opportunity) => {
    const client = clients.find((item) => item.id === opportunity.clientId);
    const sector = client?.sector || "General";
    sectorRevenue.set(sector, (sectorRevenue.get(sector) ?? 0) + opportunity.estimatedValue);
  });
  const sectorsToEnter = [...sectorRevenue.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sector, value]) => ({ sector, estimatedPipelineValue: value }));
  const latestDecisionByOffer = new Map<string, typeof growthData.decisions[number]>();
  growthData.decisions
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .forEach((decision) => {
      if (!latestDecisionByOffer.has(decision.offerVariantId)) {
        latestDecisionByOffer.set(decision.offerVariantId, decision);
      }
    });
  const offersToScale = growthData.offers.filter((offer) =>
    ["Scale", "Productize"].includes(latestDecisionByOffer.get(offer.id)?.decision ?? ""),
  );
  const offersToRetire = growthData.offers.filter((offer) =>
    ["Kill", "Park"].includes(latestDecisionByOffer.get(offer.id)?.decision ?? ""),
  );
  const approvalRequiredActions: ApprovalRequiredAction[] = [
    ...offersToScale.map((offer) => ({
      actionType: "ADAPTIVE_GROWTH_STATUS_CHANGE",
      riskLevel: "Medium" as const,
      reason: "Scaling/Productized strategy changes require human approval.",
      payload: {
        offerVariantId: offer.id,
        recommendedStatus: latestDecisionByOffer.get(offer.id)?.decision === "Productize" ? "Productized" : "Scaling",
        strategyContext: "quarterly_expansion_strategy",
      },
    })),
    ...offersToRetire.map((offer) => ({
      actionType: "ADAPTIVE_GROWTH_STATUS_CHANGE",
      riskLevel: "Medium" as const,
      reason: "Retiring or killing offers requires human approval.",
      payload: {
        offerVariantId: offer.id,
        recommendedStatus: latestDecisionByOffer.get(offer.id)?.decision === "Kill" ? "Killed" : "Parked",
        strategyContext: "quarterly_expansion_strategy",
      },
    })),
  ];
  const approvals = await createAdaptiveLoopApprovals("quarterly_expansion_strategy", approvalRequiredActions);
  const recommendations = [
    sectorsToEnter.length
      ? `Prioritize ${sectorsToEnter[0].sector} as the leading sector bet next quarter.`
      : "Collect more CRM evidence before choosing sector bets.",
    offersToScale.length
      ? `${offersToScale.length} offers are candidates to scale or productize after approval.`
      : "No clear scale candidates yet; run more experiments.",
    offersToRetire.length
      ? `${offersToRetire.length} offers should be parked or killed after approval.`
      : "No retire candidates identified.",
  ];

  return {
    output: {
      sectorsToEnter,
      offersToScale,
      offersToRetire,
      partnerOpportunities: sectorsToEnter.map((item) => `Find one association or channel partner in ${item.sector}.`),
      productizationRecommendations: offersToScale.map((offer) => `${offer.title}: create demo, proposal snippet, and delivery checklist.`),
      strategicBetsForNextQuarter: sectorsToEnter.slice(0, 3).map((item) => `${item.sector} AI capability package`),
      approvalRequiredActions,
      createdApprovalRequests: approvals,
    },
    summary: `${sectorsToEnter.length} sectors, ${offersToScale.length} scale/productize offers, ${offersToRetire.length} retire candidates reviewed.`,
    recommendations,
  };
}

async function runLoopByType(loopType: LoopType): Promise<LoopResult> {
  if (loopType === "weekly_pipeline_review") {
    return runWeeklyPipelineReview();
  }

  if (loopType === "weekly_content_ideas") {
    return runWeeklyContentIdeas();
  }

  if (loopType === "monthly_revenue_summary") {
    return runMonthlyRevenueSummary();
  }

  if (loopType === "quality_improvement_review") {
    return runQualityImprovementReview();
  }

  if (loopType === "delivery_readiness_check") {
    return runDeliveryReadinessCheck();
  }

  if (loopType === "stale_opportunity_follow_up") {
    return runStaleOpportunityFollowUp();
  }

  if (loopType === "pilot_weekly_review") {
    return runPilotWeeklyReview();
  }

  if (loopType === "weekly_market_sensing") {
    return runWeeklyMarketSensing();
  }

  if (loopType === "weekly_offer_mutation") {
    return runWeeklyOfferMutation();
  }

  if (loopType === "weekly_experiment_review") {
    return runWeeklyExperimentReview();
  }

  if (loopType === "weekly_selection_review") {
    return runWeeklySelectionReview();
  }

  if (loopType === "weekly_replication_review") {
    return runWeeklyReplicationReview();
  }

  if (loopType === "monthly_learning_genome_update") {
    return runMonthlyLearningGenomeUpdate();
  }

  if (loopType === "quarterly_expansion_strategy") {
    return runQuarterlyExpansionStrategy();
  }

  return runPromptImprovementReview();
}

export async function runBusinessLoop({ loopType, input = {} }: RunLoopInput) {
  const startedAt = new Date().toISOString();
  const running = normalizeLoopRun({
    loopType,
    status: "Running",
    input,
    summary: `${loopTypeLabel(loopType)} started.`,
    createdAt: startedAt,
  });

  await saveLoopRun(running);

  try {
    const result = await runLoopByType(loopType);
    const completed: LoopRun = normalizeLoopRun({
      ...running,
      status: "Completed",
      output: result.output,
      summary: result.summary,
      recommendations: result.recommendations,
      completedAt: new Date().toISOString(),
    });
    const saved = await saveLoopRun(completed);

    return saved.run;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : `${loopTypeLabel(loopType)} failed.`;
    const failed: LoopRun = normalizeLoopRun({
      ...running,
      status: "Failed",
      output: { error: message },
      summary: message,
      recommendations: [
        "Check database connectivity and loop input, then run the loop again.",
      ],
      completedAt: new Date().toISOString(),
    });
    const saved = await saveLoopRun(failed);

    return saved.run;
  }
}

export async function getLoopDashboardSnapshot() {
  const [packages, opportunities, deliveryProjects, quality] = await Promise.all([
    listTrainingPackages(),
    listOpportunities(),
    listDeliveryProjects(),
    getQualityDashboardMetrics(),
  ]);

  return {
    packages: packages.length,
    opportunities: opportunities.length,
    deliveryProjects: deliveryProjects.length,
    averageQaScore: quality.averageQaScore,
  };
}
