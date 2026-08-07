import { saveAuditLog } from "@/lib/audit";
import {
  isWonOpportunityStatus,
  normalizeOpportunity,
  type Opportunity,
} from "@/lib/crm";
import {
  findOpportunityByLinkedPackageId,
  listOpportunities,
  saveOpportunity,
} from "@/lib/crm-storage";
import type { TrainingPackage } from "@/features/training-packages";
import { getTrainingPackage } from "@/features/training-packages/storage/training-storage";
import type { DeliveryProject } from "@/features/delivery";
import {
  ensureDeliveryProjectForPackage,
  findDeliveryProjectByPackageId,
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
    status: "Syllabus Sent",
    linkedPackageId: pkg.id,
    notes: "Created automatically from the training package.",
  });
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
  if (opportunity.status === project.deliveryStatus) {
    return { opportunity, changed: false as const };
  }

  const saved = await saveOpportunity({
    ...opportunity,
    status: project.deliveryStatus,
  });
  await saveAuditLog({
    actor,
    action: "opportunity_status_synced_from_delivery",
    entityType: "opportunity",
    entityId: opportunity.id,
    metadata: {
      deliveryProjectId: project.id,
      previousStatus: opportunity.status,
      status: project.deliveryStatus,
    },
  });

  return { opportunity: saved.opportunity, changed: true as const };
}

export async function linkDeliveryToOpportunity(
  project: DeliveryProject,
  opportunity: Opportunity,
) {
  if (
    project.opportunityId === opportunity.id &&
    project.deliveryStatus === opportunity.status
  ) {
    return project;
  }

  const saved = await saveDeliveryProject({
    ...project,
    opportunityId: opportunity.id,
    deliveryStatus: opportunity.status,
  });
  return saved.project;
}

export async function syncOpportunityToDelivery(
  opportunity: Opportunity,
  actor: string,
) {
  if (!opportunity.linkedPackageId) {
    return null;
  }

  let existing = await findDeliveryProjectByPackageId(opportunity.linkedPackageId);
  let created = false;
  if (!existing && isWonOpportunityStatus(opportunity.status)) {
    const pkg = await getTrainingPackage(opportunity.linkedPackageId);
    const ensured = await ensureDeliveryProjectForPackage(pkg);
    existing = ensured.project;
    created = ensured.created;
  }

  if (!existing) {
    return null;
  }

  const project = await linkDeliveryToOpportunity(existing, opportunity);

  if (created) {
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

  return { project, created };
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
