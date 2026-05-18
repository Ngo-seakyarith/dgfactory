import {
  saveAdaptiveGrowthRecord,
  listAdaptiveGrowthData,
} from "@/lib/adaptive-growth-storage";
import { routeBrainTask } from "@/lib/brain/router";
import type {
  OfferReplicationInput,
  OfferReplicationOutput,
} from "@/lib/brain/agents";
import { saveKnowledgeDocument } from "@/lib/knowledge-storage";
import type { KnowledgeDocumentType } from "@/lib/knowledge";
import { getTrainingPackage } from "@/lib/training-storage";
import type {
  LearningGenomeItem,
  SelectionDecision,
} from "@/lib/adaptive-growth";

export type ReplicateWinningOfferInput = {
  offerVariantId: string;
  selectionDecisionId: string;
  packageId?: string | null;
  feedback?: string;
  includePackageAssets?: boolean;
  includeSalesAssets?: boolean;
  includeDeliveryAssets?: boolean;
};

export type ReplicateWinningOfferResult = {
  replicationSummary: string;
  createdGenomeItems: LearningGenomeItem[];
  createdTemplates: Array<{
    id: string;
    title: string;
    type: KnowledgeDocumentType;
    visibility: "Internal" | "Client-safe";
  }>;
  recommendedExpansionPaths: string[];
  mode: "deterministic" | "openai";
  model: string;
  notice?: string;
};

function knowledgeTypeForGenome(type: string): KnowledgeDocumentType {
  const map: Record<string, KnowledgeDocumentType> = {
    "Winning Pattern": "Framework",
    "Failed Pattern": "Sector Insight",
    "Proposal Language": "Proposal",
    "Pricing Insight": "Pricing Note",
    "Client Objection": "Sector Insight",
    "Sector Insight": "Sector Insight",
    "Delivery Lesson": "SOP",
    "Prompt Improvement": "Prompt Template",
    "Sales Message": "Proposal",
    "Training Activity": "Exercise",
  };

  return map[type] ?? "Other";
}

function shouldReplicateDecision(decision: SelectionDecision) {
  return ["Scale", "Productize", "Bundle", "Partner"].includes(decision.decision);
}

function failedPatternForDecision(decision: SelectionDecision) {
  return decision.decision === "Kill" || decision.decision === "Park";
}

function normalizeInclude(value: unknown, defaultValue = true) {
  return typeof value === "boolean" ? value : defaultValue;
}

export async function replicateWinningOffer({
  offerVariantId,
  selectionDecisionId,
  packageId,
  feedback,
  includePackageAssets = true,
  includeSalesAssets = true,
  includeDeliveryAssets = true,
}: ReplicateWinningOfferInput): Promise<ReplicateWinningOfferResult> {
  const data = await listAdaptiveGrowthData();
  const offer = data.offers.find((item) => item.id === offerVariantId);
  const selectionDecision = data.decisions.find(
    (item) => item.id === selectionDecisionId,
  );

  if (!offer) {
    throw new Error("Offer variant not found.");
  }

  if (!selectionDecision) {
    throw new Error("Selection decision not found.");
  }

  const experiment =
    (selectionDecision.experimentId
      ? data.experiments.find((item) => item.id === selectionDecision.experimentId)
      : null) ??
    data.experiments
      .filter((item) => item.offerVariantId === offer.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ??
    null;
  const metrics = experiment
    ? data.metrics
        .filter((item) => item.experimentId === experiment.id)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
    : null;
  const packageContent =
    includePackageAssets && packageId ? await getTrainingPackage(packageId) : null;

  const routeResult = shouldReplicateDecision(selectionDecision)
    ? await routeBrainTask<OfferReplicationInput, OfferReplicationOutput>({
        taskType: "offer_replication",
        input: {
          offer,
          selectionDecision,
          experiment,
          metrics,
          packageContent,
          feedback,
          includePackageAssets: normalizeInclude(includePackageAssets),
          includeSalesAssets: normalizeInclude(includeSalesAssets),
          includeDeliveryAssets: normalizeInclude(includeDeliveryAssets),
        },
        retries: 1,
      })
    : {
        mode: "deterministic" as const,
        model: "deterministic",
        output: {
          replication_summary: `${offer.title} was ${selectionDecision.decision}. Store the failure pattern so DG Academy does not repeat the weak signal without stronger evidence.`,
          reusable_training_template: "",
          proposal_template: "",
          pricing_note: "",
          sales_message: "",
          delivery_checklist: [],
          learning_genome_items: [
            {
              title: `Failed pattern: ${offer.title}`,
              type: "Failed Pattern",
              content: [
                `Offer: ${offer.title}`,
                `Decision: ${selectionDecision.decision}`,
                `Fitness score: ${selectionDecision.fitnessScore}/100`,
                selectionDecision.rationale
                  ? `Rationale: ${selectionDecision.rationale}`
                  : "",
                selectionDecision.nextAction
                  ? `Next action: ${selectionDecision.nextAction}`
                  : "",
                feedback ? `Additional feedback: ${feedback}` : "",
              ]
                .filter(Boolean)
                .join("\n"),
              confidence_score: Math.max(40, selectionDecision.fitnessScore),
            },
          ],
          recommended_expansion_paths: [
            "Do not repeat this offer until the audience, pain point, price, or channel changes materially.",
            "Search the learning genome before generating similar variants.",
          ],
        },
      };

  const createdGenomeItems: LearningGenomeItem[] = [];

  for (const draft of routeResult.output.learning_genome_items) {
    if (
      !includeSalesAssets &&
      (draft.type === "Sales Message" || draft.type === "Proposal Language")
    ) {
      continue;
    }

    if (!includeDeliveryAssets && draft.type === "Training Activity") {
      continue;
    }

    const saved = await saveAdaptiveGrowthRecord("genome", {
      title: draft.title,
      type: draft.type,
      content: draft.content,
      sourceOfferVariantId: offer.id,
      sourceExperimentId: experiment?.id ?? null,
      tags: [
        "replicated",
        offer.sector,
        offer.format,
        selectionDecision.decision,
      ].filter(Boolean),
      confidenceScore: draft.confidence_score,
      status: failedPatternForDecision(selectionDecision) ? "Active" : "Active",
    });
    createdGenomeItems.push(saved.record as LearningGenomeItem);
  }

  const templateDrafts = [
    {
      title: `Reusable training template: ${offer.title}`,
      type: "SOP" as KnowledgeDocumentType,
      content: routeResult.output.reusable_training_template,
      enabled: includePackageAssets,
    },
    {
      title: `Proposal template: ${offer.title}`,
      type: "Proposal" as KnowledgeDocumentType,
      content: routeResult.output.proposal_template,
      enabled: includeSalesAssets,
    },
    {
      title: `Pricing note: ${offer.title}`,
      type: "Pricing Note" as KnowledgeDocumentType,
      content: routeResult.output.pricing_note,
      enabled: true,
    },
    {
      title: `Sales message: ${offer.title}`,
      type: "Proposal" as KnowledgeDocumentType,
      content: routeResult.output.sales_message,
      enabled: includeSalesAssets,
    },
    {
      title: `Delivery checklist: ${offer.title}`,
      type: "SOP" as KnowledgeDocumentType,
      content: routeResult.output.delivery_checklist
        .map((item) => `- ${item}`)
        .join("\n"),
      enabled: includeDeliveryAssets,
    },
  ];
  const createdTemplates = [];

  for (const template of templateDrafts) {
    if (!template.enabled || !template.content.trim()) {
      continue;
    }

    const saved = await saveKnowledgeDocument({
      title: template.title,
      type: template.type,
      content: template.content,
      tags: ["replication-template", offer.sector, offer.format].filter(Boolean),
      source: `Offer replication: ${offer.title}`,
      visibility: "Internal",
    });

    createdTemplates.push({
      id: saved.document.id,
      title: saved.document.title,
      type: saved.document.type,
      visibility: saved.document.visibility,
    });
  }

  for (const genome of createdGenomeItems) {
    await saveKnowledgeDocument({
      title: `Learning genome: ${genome.title}`,
      type: knowledgeTypeForGenome(genome.type),
      content: genome.content,
      tags: ["learning-genome", ...genome.tags],
      source: `Learning genome item: ${genome.id}`,
      visibility: "Internal",
    });
  }

  return {
    replicationSummary: routeResult.output.replication_summary,
    createdGenomeItems,
    createdTemplates,
    recommendedExpansionPaths: routeResult.output.recommended_expansion_paths,
    mode: routeResult.mode,
    model: routeResult.model,
  };
}
