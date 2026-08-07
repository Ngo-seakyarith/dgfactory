import { saveAuditLog } from "@/lib/audit";
import {
  normalizeOpportunity,
  type Opportunity,
  type OpportunityStatus,
} from "@/lib/crm";
import {
  findOpportunityByLinkedPackageId,
  listOpportunities,
  saveOpportunity,
} from "@/lib/crm-storage";
import type { TrainingPackage } from "@/features/training-packages";
import { getTrainingPackage } from "@/features/training-packages/storage/training-storage";
import type { DeliveryProject, DeliveryStatus } from "@/features/delivery";
import {
  ensureDeliveryProjectForPackage,
  saveDeliveryProject,
} from "@/features/delivery/storage/delivery-storage";

function opportunityFromPackage(pkg: TrainingPackage): Opportunity {
  if (!pkg.clientId) {
    throw new Error("Link the package to a client before adding it to the pipeline.");
  }

  return normalizeOpportunity({
    clientId: pkg.clientId,
    title: pkg.title,
    trainingNeed: pkg.promise,
    estimatedValue: pkg.pricingOutputs?.finalPrice ?? 0,
    status: "Proposal Draft",
    probabilityPercent: 50,
    linkedPackageId: pkg.id,
    notes: "Created automatically from the training package.",
  });
}

function opportunityStatusForDelivery(
  status: DeliveryStatus,
): OpportunityStatus | null {
  return status === "Proposal Sent" ? "Proposal Sent" : null;
}

function mergedOpportunityStatus(
  current: OpportunityStatus,
  target: OpportunityStatus,
): OpportunityStatus | null {
  if (current === target) {
    return null;
  }

  if (
    target === "Proposal Sent" &&
    (current === "Lead" || current === "Discovery" || current === "Proposal Draft")
  ) {
    return "Proposal Sent";
  }

  return null;
}

export async function ensureOpportunityForPackage(
  pkg: TrainingPackage,
  actor: string,
) {
  const existing = await findOpportunityByLinkedPackageId(pkg.id);

  if (existing) {
    const patch: Partial<Opportunity> = {};
    if (!existing.clientId && pkg.clientId) {
      patch.clientId = pkg.clientId;
    }
    if (!existing.estimatedValue && pkg.pricingOutputs?.finalPrice) {
      patch.estimatedValue = pkg.pricingOutputs.finalPrice;
    }

    if (Object.keys(patch).length) {
      const saved = await saveOpportunity({ ...existing, ...patch });
      return { opportunity: saved.opportunity, created: false as const };
    }

    return { opportunity: existing, created: false as const };
  }

  let saved: Awaited<ReturnType<typeof saveOpportunity>>;
  try {
    saved = await saveOpportunity(opportunityFromPackage(pkg));
  } catch (error) {
    const concurrentlyCreated = await findOpportunityByLinkedPackageId(pkg.id);
    if (concurrentlyCreated) {
      return { opportunity: concurrentlyCreated, created: false as const };
    }
    throw error;
  }
  await saveAuditLog({
    actor,
    action: "opportunity_created_from_package",
    entityType: "opportunity",
    entityId: saved.opportunity.id,
    metadata: { title: saved.opportunity.title, packageId: pkg.id },
  });

  return { opportunity: saved.opportunity, created: true as const };
}

async function applyDeliveryStatusToOpportunity(
  opportunity: Opportunity,
  project: DeliveryProject,
  actor: string,
) {
  const target = opportunityStatusForDelivery(project.deliveryStatus);
  const next = target ? mergedOpportunityStatus(opportunity.status, target) : null;

  if (!next) {
    return { opportunity, changed: false as const };
  }

  const saved = await saveOpportunity({
    ...opportunity,
    status: next,
  });
  await saveAuditLog({
    actor,
    action: "opportunity_status_synced_from_delivery",
    entityType: "opportunity",
    entityId: opportunity.id,
    metadata: {
      deliveryProjectId: project.id,
      previousStatus: opportunity.status,
      status: next,
    },
  });

  return { opportunity: saved.opportunity, changed: true as const };
}

export async function linkDeliveryToOpportunity(
  project: DeliveryProject,
  opportunity: Opportunity,
) {
  const wonUpgrade =
    opportunity.status === "Won" &&
    (project.deliveryStatus === "Syllabus Sent" ||
      project.deliveryStatus === "Proposal Sent")
      ? ("Preparing" as const)
      : null;

  if (project.opportunityId === opportunity.id && !wonUpgrade) {
    return project;
  }

  const saved = await saveDeliveryProject({
    ...project,
    opportunityId: opportunity.id,
    deliveryStatus: wonUpgrade ?? project.deliveryStatus,
  });
  return saved.project;
}

export async function ensureDeliveryForWonOpportunity(
  opportunity: Opportunity,
  actor: string,
) {
  if (opportunity.status !== "Won" || !opportunity.linkedPackageId) {
    return null;
  }

  const pkg = await getTrainingPackage(opportunity.linkedPackageId);
  const ensured = await ensureDeliveryProjectForPackage(pkg);
  const project = await linkDeliveryToOpportunity(ensured.project, opportunity);

  if (ensured.created) {
    await saveAuditLog({
      actor,
      action: "delivery_created_from_opportunity",
      entityType: "delivery_project",
      entityId: project.id,
      metadata: {
        title: project.title,
        opportunityId: opportunity.id,
        packageId: opportunity.linkedPackageId,
      },
    });
  }

  return { project, created: ensured.created };
}

export async function syncDeliveryProjectBond(
  project: DeliveryProject,
  actor: string,
) {
  const opportunities = await listOpportunities();
  const opportunity =
    (project.opportunityId
      ? opportunities.find((item) => item.id === project.opportunityId)
      : undefined) ??
    (project.packageId
      ? opportunities.find((item) => item.linkedPackageId === project.packageId)
      : undefined) ??
    null;

  if (!opportunity) {
    return { project, opportunity: null };
  }

  let bonded = project;
  if (project.opportunityId !== opportunity.id) {
    const saved = await saveDeliveryProject({
      ...project,
      opportunityId: opportunity.id,
    });
    bonded = saved.project;
  }

  const result = await applyDeliveryStatusToOpportunity(opportunity, bonded, actor);
  return { project: bonded, opportunity: result.opportunity };
}
