import {
  calculatePricing,
  normalizePricingInputs,
  pricingSummaryToMarkdown,
  type PricingInputs,
} from "@/lib/pricing";

export function buildDeterministicPricingFacts(
  pricingInputs: Partial<PricingInputs> | undefined,
) {
  const inputs = normalizePricingInputs(pricingInputs);
  const outputs = calculatePricing(inputs);

  return {
    inputs,
    outputs,
    summary: pricingSummaryToMarkdown(inputs, outputs),
  };
}
