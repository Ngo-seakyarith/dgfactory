import { saveClient } from "@/lib/crm-storage";
import { saveDeliveryProject, saveDeliveryTask } from "@/lib/delivery-storage";
import { createDefaultDeliveryTasks } from "@/lib/delivery";
import { saveKnowledgeDocument } from "@/lib/knowledge-storage";
import {
  buildPackageFromParts,
  createMockTrainingOutputs,
  type TrainingPackageInput,
} from "@/lib/training-packages";
import { defaultPricingInputs, type PricingInputs } from "@/lib/pricing";
import { saveTrainingPackage } from "@/lib/training-storage";
import { saveOpportunity } from "@/lib/crm-storage";
import { saveOutputEvaluation } from "@/lib/evaluation-storage";

export async function seedDemoData(actor: string) {
  const client = await saveClient({
    name: "[DEMO] Phnom Penh Growth Bank",
    sector: "Financial Services",
    contactPerson: "Executive Sponsor",
    email: "sponsor@example.com",
    phone: "+855 00 000 000",
    notes: `Demo client created by ${actor}. Replace before production use.`,
  });
  const input: TrainingPackageInput = {
    courseTitle: "[DEMO] AI Skills for Managers",
    audience: "25 mid-level and senior managers",
    duration: "2 days",
    client: client.client.name,
    promise:
      "Managers leave with practical AI use cases, governance habits, and a 30-day adoption plan.",
    context:
      "Cambodian banking operations, customer service, compliance, and productivity workflows.",
    tone: "Executive, practical, commercially sharp",
  };
  const demoPricingInputs: PricingInputs = {
    ...defaultPricingInputs,
    currency: "USD",
    trainingFormat: "In-house",
    pricingTemplate: "Corporate In-House Training",
    numberOfParticipants: 25,
    numberOfTrainingDays: 2,
    numberOfTrainers: 1,
    trainerDayRate: 650,
    venueCost: 0,
    foodAndBeverageCostPerPerson: 18,
    materialCostPerPerson: 8,
    adminCost: 150,
    marketingCost: 100,
    travelCost: 75,
    otherCost: 0,
    targetProfitMarginPercent: 40,
    discountPercent: 5,
    taxPercent: 0,
    fundingNoteEnabled: true,
    fundingNoteText:
      "Client may review eligibility for SDF / HRD-style co-funding where applicable. Approval is not guaranteed.",
  };
  const pkg = buildPackageFromParts({
    input,
    outputs: createMockTrainingOutputs(input, demoPricingInputs),
    pricingInputs: demoPricingInputs,
    generationMode: "mock",
  });
  const savedPackage = await saveTrainingPackage(pkg);
  const opportunity = await saveOpportunity({
    clientId: client.client.id,
    title: "[DEMO] AI Skills for Managers rollout",
    trainingNeed: "Build practical AI capability for managers with governance awareness.",
    estimatedValue: 4500,
    status: "Proposal Sent",
    probabilityPercent: 55,
    expectedCloseDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21)
      .toISOString()
      .slice(0, 10),
    nextFollowUpDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5)
      .toISOString()
      .slice(0, 10),
    linkedPackageId: savedPackage.package.id,
    notes:
      "DEMO RECORD. Sample proposal pipeline for DG Capability Factory productization testing.",
  });
  const delivery = await saveDeliveryProject({
    opportunityId: opportunity.opportunity.id,
    packageId: savedPackage.package.id,
    clientId: client.client.id,
    title: "[DEMO] AI Skills for Managers delivery",
    deliveryStatus: "Planning",
    trainingDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 18)
      .toISOString()
      .slice(0, 10),
    location: "Phnom Penh",
    trainerName: "DG Academy trainer",
    participantCount: 25,
    notes:
      "DEMO RECORD. Confirm real logistics before using this structure with a client.",
  });

  for (const task of createDefaultDeliveryTasks(delivery.project.id)) {
    await saveDeliveryTask(task);
  }

  const knowledge = await saveKnowledgeDocument({
    title: "[DEMO] Cambodia AI Manager Training Note",
    type: "Sector Insight",
    content:
      "Cambodian managers benefit from AI training that connects use cases to workflow ownership, customer service, compliance checkpoints, and a practical 30-day plan.",
    tags: ["demo", "Cambodia", "AI managers"],
    source: "V3.5 demo seed",
    visibility: "Client-safe",
  });
  const qualityReport = await saveOutputEvaluation({
    packageId: savedPackage.package.id,
    outputType: "full_package",
    reviewerType: "AI_QA",
    score: 91,
    feedback:
      "DEMO QUALITY REPORT. Strong executive relevance, clear commercial framing, and usable delivery structure.",
    strengths: [
      "Clear DG Academy positioning for managers",
      "Practical Cambodia banking examples",
      "Pricing and delivery workflow are connected",
    ],
    weaknesses: [
      "Client procurement details should be confirmed before sending",
    ],
    improvementSuggestions: [
      "Add one client-specific case example after discovery",
      "Confirm participant seniority mix before final workbook export",
    ],
    risks: ["Demo data must be replaced before production client use"],
  });

  return {
    client: client.client,
    opportunity: opportunity.opportunity,
    package: savedPackage.package,
    deliveryProject: delivery.project,
    knowledgeDocument: knowledge.document,
    qualityReport: qualityReport.evaluation,
  };
}
