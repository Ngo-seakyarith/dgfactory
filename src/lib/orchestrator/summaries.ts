import { calculatePipelineMetrics, formatCrmMoney } from "@/lib/crm";
import { listClients, listOpportunities } from "@/lib/crm-storage";
import { deliveryStatuses } from "@/lib/delivery";
import { listDeliveryProjects, listDeliveryTasks } from "@/lib/delivery-storage";
import { getQualityDashboardMetrics } from "@/lib/evaluation-storage";

export async function buildPipelineSummary() {
  const [clients, opportunities] = await Promise.all([
    listClients(),
    listOpportunities(),
  ]);
  const metrics = calculatePipelineMetrics(opportunities);

  return {
    totalClients: clients.length,
    totalOpportunities: metrics.totalOpportunities,
    totalEstimatedValue: metrics.totalEstimatedValue,
    totalEstimatedValueFormatted: formatCrmMoney(metrics.totalEstimatedValue),
    weightedPipelineValue: metrics.weightedPipelineValue,
    weightedPipelineValueFormatted: formatCrmMoney(metrics.weightedPipelineValue),
    proposalsSent: metrics.proposalsSent,
    wonOpportunities: metrics.wonOpportunities,
    lostOpportunities: metrics.lostOpportunities,
    upcomingFollowUps: metrics.upcomingFollowUps.slice(0, 8).map((opportunity) => ({
      id: opportunity.id,
      title: opportunity.title,
      nextFollowUpDate: opportunity.nextFollowUpDate,
      status: opportunity.status,
    })),
  };
}

export async function buildDeliverySummary() {
  const [projects, tasks] = await Promise.all([
    listDeliveryProjects(),
    listDeliveryTasks(),
  ]);
  const byStatus = deliveryStatuses.map((status) => ({
    status,
    count: projects.filter((project) => project.deliveryStatus === status).length,
  }));
  const openTasks = tasks.filter((task) => task.status !== "Done");

  return {
    totalDeliveryProjects: projects.length,
    byStatus,
    upcomingProjects: projects
      .filter((project) => project.trainingDate)
      .sort((a, b) => a.trainingDate.localeCompare(b.trainingDate))
      .slice(0, 8)
      .map((project) => ({
        id: project.id,
        title: project.title,
        trainingDate: project.trainingDate,
        deliveryStatus: project.deliveryStatus,
        trainerName: project.trainerName,
      })),
    openTasks: openTasks.length,
    overdueOrUndatedTasks: openTasks
      .filter((task) => !task.dueDate || new Date(task.dueDate) < new Date())
      .slice(0, 8)
      .map((task) => ({
        id: task.id,
        title: task.title,
        category: task.category,
        dueDate: task.dueDate,
      })),
  };
}

export async function buildQualitySummary() {
  const metrics = await getQualityDashboardMetrics();

  return {
    averageQaScore: metrics.averageQaScore,
    evaluationCount: metrics.evaluationCount,
    lowestScoringOutputTypes: metrics.lowestScoringOutputTypes,
    mostCommonWeaknesses: metrics.mostCommonWeaknesses,
    pendingImprovementSuggestions: metrics.pendingImprovementSuggestions.length,
    approvedImprovements: metrics.approvedImprovements.length,
    pendingSuggestions: metrics.pendingImprovementSuggestions.slice(0, 8).map((item) => ({
      id: item.id,
      targetAgent: item.targetAgent,
      suggestedChange: item.suggestedChange,
      status: item.status,
    })),
  };
}
