import {
  calculatePricing,
  clientPricingSummaryToMarkdown,
  normalizePricingInputs,
  type PricingInputs,
} from "@/features/training-packages";

export function buildDeterministicPricingFacts(
  pricingInputs: Partial<PricingInputs> | undefined,
) {
  const inputs = normalizePricingInputs(pricingInputs);
  const outputs = calculatePricing(inputs);

  return {
    summary: clientPricingSummaryToMarkdown(inputs, outputs),
  };
}
