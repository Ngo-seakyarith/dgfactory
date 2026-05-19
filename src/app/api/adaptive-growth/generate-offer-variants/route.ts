import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import { routeBrainTask } from "@/lib/brain/router";
import {
  mutationStrategies,
  type MutationStrategy,
  type OfferMutationInput,
  type OfferMutationOutput,
} from "@/lib/brain/agents";
import { listAdaptiveGrowthData } from "@/lib/adaptive-growth-storage";
import {
  formatKnowledgeForBrain,
  retrieveKnowledge,
} from "@/lib/knowledge/retrieve";
import { knowledgeSourceNotesFromResults } from "@/lib/knowledge";
import { requirePermission } from "@/lib/route-guards";

function isMutationStrategy(value: unknown): value is MutationStrategy {
  return (
    typeof value === "string" &&
    mutationStrategies.includes(value as MutationStrategy)
  );
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "manage_proposals");

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      signal_id?: string;
      base_idea?: string;
      sector?: string;
      audience?: string;
      desired_format?: string;
      constraints?: string;
      number_of_variants?: number;
      mutation_strategy?: string;
    };
    const data = await listAdaptiveGrowthData();
    const signal = body.signal_id
      ? data.signals.find((item) => item.id === body.signal_id)
      : null;
    const sourceIdea =
      body.base_idea?.trim() ||
      signal?.description ||
      signal?.title ||
      "";

    if (!sourceIdea) {
      return NextResponse.json(
        { error: "A base idea or market signal is required." },
        { status: 400 },
      );
    }

    const query = [
      sourceIdea,
      signal?.title,
      signal?.description,
      body.sector ?? signal?.sector,
      body.audience ?? signal?.audience,
      body.constraints,
    ]
      .filter(Boolean)
      .join(" ");
    const knowledgeResults = await retrieveKnowledge({
      query,
      filters: { visibility: "Any" },
      limit: 6,
    });
    const knowledgeContext = formatKnowledgeForBrain(knowledgeResults);
    const input: OfferMutationInput = {
      sourceIdea,
      signalTitle: signal?.title,
      signalDescription: signal?.description,
      sector: body.sector || signal?.sector || "",
      audience: body.audience || signal?.audience || "",
      desiredFormat: body.desired_format || "",
      constraints: body.constraints || "",
      numberOfVariants: Math.max(
        1,
        Math.min(20, Number(body.number_of_variants ?? 7)),
      ),
      mutationStrategy: isMutationStrategy(body.mutation_strategy)
        ? body.mutation_strategy
        : "Random creative mutation",
      knowledgeContext,
    };
    const result = await routeBrainTask<OfferMutationInput, OfferMutationOutput>({
      taskType: "offer_mutation",
      input,
      retries: 1,
    });

    await saveAuditLog({
      actor: auth.user.actor,
      action: "adaptive_growth_offer_variants_generated",
      entityType: signal ? "market_signal" : "adaptive_growth_idea",
      entityId: signal?.id ?? "",
      metadata: {
        mode: result.mode,
        model: result.model,
        variantCount: result.output.variants.length,
        mutationStrategy: input.mutationStrategy,
      },
    });

    return NextResponse.json({
      variants: result.output.variants,
      recommended_top_3: result.output.recommended_top_3,
      rationale: result.output.rationale,
      mode: result.mode,
      model: result.model,
      notice: result.notice,
      knowledgeUsed: knowledgeSourceNotesFromResults(knowledgeResults),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Offer variant generation failed.",
      },
      { status: 500 },
    );
  }
}
