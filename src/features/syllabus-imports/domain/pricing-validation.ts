import type { PricingInputs } from "@/features/training-packages/domain/pricing";

export function getSyllabusPricingError(pricing: PricingInputs) {
  if (pricing.numberOfParticipants <= 0) {
    return "Enter a participant count greater than zero.";
  }
  if (pricing.professionalFee <= 0) {
    return "Enter a professional fee greater than zero.";
  }
  return "";
}
