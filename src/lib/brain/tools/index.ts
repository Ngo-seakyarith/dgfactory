import {
  calculatePricing,
  clientPricingSummaryToMarkdown,
  normalizePricingInputs,
  type PricingInputs,
} from "@/lib/pricing";

export function buildDeterministicPricingFacts(
  pricingInputs: Partial<PricingInputs> | undefined,
) {
  const inputs = normalizePricingInputs(pricingInputs);
  const outputs = calculatePricing(inputs);

  return {
    summary: clientPricingSummaryToMarkdown(inputs, outputs),
  };
}
