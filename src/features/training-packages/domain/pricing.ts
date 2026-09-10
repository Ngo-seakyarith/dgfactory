export type PricingInputs = {
  numberOfParticipants: number;
  professionalFee: number;
  vatStatus: string;
};

export type PricingOutputs = {
  finalPrice: number;
  pricePerParticipant: number;
  warnings: string[];
};

export const defaultPricingInputs: PricingInputs = {
  numberOfParticipants: 0,
  professionalFee: 0,
  vatStatus: "Excluding VAT",
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizePricingInputs(
  value?: Partial<PricingInputs> | null,
): PricingInputs {
  return {
    numberOfParticipants: toNumber(value?.numberOfParticipants),
    professionalFee: toNumber(value?.professionalFee),
    vatStatus:
      value?.vatStatus === "Including VAT" ? "Including VAT" : "Excluding VAT",
  };
}

export function calculatePricing(
  rawInputs?: Partial<PricingInputs> | null,
): PricingOutputs {
  const inputs = normalizePricingInputs(rawInputs);
  const warnings: string[] = [];

  if (inputs.numberOfParticipants < 0) {
    warnings.push("Participant count should not be negative.");
  }
  if (inputs.professionalFee < 0) {
    warnings.push("Professional fee should not be negative.");
  }

  const finalPrice = Math.max(inputs.professionalFee, 0);
  const pricePerParticipant =
    inputs.numberOfParticipants > 0
      ? finalPrice / inputs.numberOfParticipants
      : 0;

  return { finalPrice, pricePerParticipant, warnings };
}

export function getCommercialSetupError(inputs: PricingInputs) {
  if (inputs.numberOfParticipants <= 0) {
    return "Enter a participant count greater than zero.";
  }
  if (inputs.professionalFee <= 0) {
    return "Enter a professional fee greater than zero.";
  }
  return "";
}

export function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function pricingSummaryToMarkdown(
  inputs: PricingInputs,
  outputs: PricingOutputs,
) {
  return [
    "# Commercial Setup",
    "",
    `Participants: ${inputs.numberOfParticipants}`,
    `Professional fee: ${formatMoney(outputs.finalPrice)}`,
    `VAT wording: ${inputs.vatStatus}`,
    `Price per participant: ${formatMoney(outputs.pricePerParticipant)}`,
  ].join("\n");
}
