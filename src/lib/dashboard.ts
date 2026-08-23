import {
  calculatePipelineMetrics,
  formatCrmMoney,
  isInactiveOpportunityStatus,
} from "@/lib/crm";
import { listOpportunities } from "@/lib/crm-storage";
import { listDeliveryProjects } from "@/features/delivery/storage/delivery-storage";
import { listTrainingPackages } from "@/features/training-packages/storage/training-storage";

function startOfMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function parseDate(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function getDashboardMetrics() {
  const [opportunities, packages, deliveryProjects] = await Promise.all([
    listOpportunities(),
    listTrainingPackages(),
    listDeliveryProjects(),
  ]);
  const pipeline = calculatePipelineMetrics(opportunities);
  const activeOpportunities = opportunities.filter(
    (opportunity) => !isInactiveOpportunityStatus(opportunity.status),
  );
  const monthStart = startOfMonth();
  const packagesCreatedThisMonth = packages.filter((pkg) => {
    const createdAt = parseDate(pkg.createdAt);
    return !!createdAt && createdAt >= monthStart;
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next30 = new Date(today);
  next30.setDate(today.getDate() + 30);
  const upcomingDeliveryProjects = deliveryProjects.filter((project) => {
    const trainingDate = parseDate(project.trainingDate);
    return (
      !!trainingDate &&
      trainingDate >= today &&
      trainingDate <= next30 &&
      project.deliveryStatus !== "Delivered" &&
      project.deliveryStatus !== "Lost" &&
      project.deliveryStatus !== "Dormant"
    );
  });
  const pendingFollowUps = opportunities.filter((opportunity) => {
    const followUpDate = parseDate(opportunity.nextFollowUpDate);
    return (
      !!followUpDate &&
      followUpDate <= next30 &&
      !isInactiveOpportunityStatus(opportunity.status)
    );
  });
  return {
    activeOpportunities: activeOpportunities.length,
    pipelineValue: pipeline.totalEstimatedValue,
    pipelineValueFormatted: formatCrmMoney(pipeline.totalEstimatedValue),
    packagesCreatedThisMonth: packagesCreatedThisMonth.length,
    upcomingDeliveryProjects: upcomingDeliveryProjects.length,
    pendingFollowUps: pendingFollowUps.length,
    activeOpportunityList: activeOpportunities.slice(0, 5),
    upcomingDeliveryList: upcomingDeliveryProjects.slice(0, 5),
    pendingFollowUpList: pendingFollowUps.slice(0, 5),
  };
}
