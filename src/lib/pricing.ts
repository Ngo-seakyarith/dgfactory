export type PricingInputs = {
  currency: string;
  numberOfParticipants: number;
  numberOfTrainingDays: number;
  numberOfTrainers: number;
  trainerDayRate: number;
  venueCost: number;
  foodAndBeverageCostPerPerson: number;
  materialCostPerPerson: number;
  adminCost: number;
  marketingCost: number;
  travelCost: number;
  otherCost: number;
  targetProfitMarginPercent: number;
  discountPercent: number;
  taxPercent: number;
};

export type PricingOutputs = {
  trainerCost: number;
  participantVariableCost: number;
  totalDirectCost: number;
  targetProfit: number;
  subtotalBeforeDiscount: number;
  discountAmount: number;
  subtotalAfterDiscount: number;
  taxAmount: number;
  finalPrice: number;
  pricePerParticipant: number;
  estimatedProfit: number;
  estimatedProfitMargin: number;
  warnings: string[];
};

export const defaultPricingInputs: PricingInputs = {
  currency: "USD",
  numberOfParticipants: 20,
  numberOfTrainingDays: 1,
  numberOfTrainers: 1,
  trainerDayRate: 500,
  venueCost: 0,
  foodAndBeverageCostPerPerson: 0,
  materialCostPerPerson: 5,
  adminCost: 0,
  marketingCost: 0,
  travelCost: 0,
  otherCost: 0,
  targetProfitMarginPercent: 35,
  discountPercent: 0,
  taxPercent: 0,
};

const numericFields: Array<keyof Omit<
  PricingInputs,
  "currency"
>> = [
  "numberOfParticipants",
  "numberOfTrainingDays",
  "numberOfTrainers",
  "trainerDayRate",
  "venueCost",
  "foodAndBeverageCostPerPerson",
  "materialCostPerPerson",
  "adminCost",
  "marketingCost",
  "travelCost",
  "otherCost",
  "targetProfitMarginPercent",
  "discountPercent",
  "taxPercent",
];

function toNumber(value: unknown, defaultValue: number) {
  if (value === "" || value === null || value === undefined) {
    return defaultValue;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

export function normalizePricingInputs(
  value?: Partial<PricingInputs> | null,
): PricingInputs {
  const normalized = {
    ...defaultPricingInputs,
    ...(value ?? {}),
  };

  numericFields.forEach((field) => {
    normalized[field] = toNumber(value?.[field], defaultPricingInputs[field]);
  });

  return {
    ...normalized,
    currency: String(normalized.currency || "USD").trim() || "USD",
  };
}

export function calculatePricing(
  rawInputs?: Partial<PricingInputs> | null,
): PricingOutputs {
  const inputs = normalizePricingInputs(rawInputs);
  const warnings = numericFields
    .filter((field) => inputs[field] < 0)
    .map((field) => `${field} should not be negative.`);
  if (inputs.targetProfitMarginPercent >= 100) {
    warnings.push("targetProfitMarginPercent must be less than 100.");
  }

  const trainerCost =
    inputs.numberOfTrainingDays * inputs.numberOfTrainers * inputs.trainerDayRate;
  const participantVariableCost =
    inputs.numberOfParticipants *
    (inputs.foodAndBeverageCostPerPerson + inputs.materialCostPerPerson);
  const totalDirectCost =
    trainerCost +
    inputs.venueCost +
    participantVariableCost +
    inputs.adminCost +
    inputs.marketingCost +
    inputs.travelCost +
    inputs.otherCost;
  const targetMarginPercent = Math.min(
    Math.max(inputs.targetProfitMarginPercent, 0),
    99.99,
  );
  const subtotalBeforeDiscount =
    totalDirectCost > 0
      ? totalDirectCost / (1 - targetMarginPercent / 100)
      : 0;
  const targetProfit = subtotalBeforeDiscount - totalDirectCost;
  const discountAmount = (subtotalBeforeDiscount * inputs.discountPercent) / 100;
  const subtotalAfterDiscount = subtotalBeforeDiscount - discountAmount;
  const taxAmount = (subtotalAfterDiscount * inputs.taxPercent) / 100;
  const finalPrice = subtotalAfterDiscount + taxAmount;
  const pricePerParticipant =
    inputs.numberOfParticipants > 0 ? finalPrice / inputs.numberOfParticipants : 0;
  const estimatedProfit = finalPrice - taxAmount - totalDirectCost;
  const estimatedProfitMargin =
    finalPrice > 0 ? (estimatedProfit / finalPrice) * 100 : 0;

  return {
    trainerCost,
    participantVariableCost,
    totalDirectCost,
    targetProfit,
    subtotalBeforeDiscount,
    discountAmount,
    subtotalAfterDiscount,
    taxAmount,
    finalPrice,
    pricePerParticipant,
    estimatedProfit,
    estimatedProfitMargin,
    warnings,
  };
}

export function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(value: number) {
  return `${(Number.isFinite(value) ? value : 0).toFixed(1)}%`;
}

export function pricingSummaryToMarkdown(
  inputs: PricingInputs,
  outputs: PricingOutputs,
) {
  return [
    "# Pricing Summary",
    "",
    `Participants: ${inputs.numberOfParticipants}`,
    `Training days: ${inputs.numberOfTrainingDays}`,
    `Recommended program fee: ${formatMoney(outputs.finalPrice, inputs.currency)}`,
    `Price per participant: ${formatMoney(outputs.pricePerParticipant, inputs.currency)}`,
    `Total direct cost: ${formatMoney(outputs.totalDirectCost, inputs.currency)}`,
    `Estimated profit: ${formatMoney(outputs.estimatedProfit, inputs.currency)}`,
    `Estimated profit margin: ${formatPercent(outputs.estimatedProfitMargin)}`,
    `Discount: ${formatMoney(outputs.discountAmount, inputs.currency)}`,
    `Tax: ${formatMoney(outputs.taxAmount, inputs.currency)}`,
    "",
    "## Cost Breakdown",
    `- Trainer cost: ${formatMoney(outputs.trainerCost, inputs.currency)}`,
    `- Venue cost: ${formatMoney(inputs.venueCost, inputs.currency)}`,
    `- Participant variable cost: ${formatMoney(outputs.participantVariableCost, inputs.currency)}`,
    `- Admin cost: ${formatMoney(inputs.adminCost, inputs.currency)}`,
    `- Marketing cost: ${formatMoney(inputs.marketingCost, inputs.currency)}`,
    `- Travel cost: ${formatMoney(inputs.travelCost, inputs.currency)}`,
    `- Other cost: ${formatMoney(inputs.otherCost, inputs.currency)}`,
  ].join("\n");
}

export function clientPricingSummaryToMarkdown(
  inputs: PricingInputs,
  outputs: PricingOutputs,
) {
  return [
    "# Client-Facing Pricing Facts",
    "",
    `Participants: ${inputs.numberOfParticipants}`,
    `Training days: ${inputs.numberOfTrainingDays}`,
    `Recommended program fee: ${formatMoney(outputs.finalPrice, inputs.currency)}`,
    `Price per participant: ${formatMoney(outputs.pricePerParticipant, inputs.currency)}`,
    outputs.discountAmount > 0
      ? `Discount included: ${formatMoney(outputs.discountAmount, inputs.currency)}`
      : "",
    outputs.taxAmount > 0
      ? `Tax/VAT included: ${formatMoney(outputs.taxAmount, inputs.currency)}`
      : "",
    "",
    clientPricingParagraph(inputs, outputs),
  ]
    .filter(Boolean)
    .join("\n");
}

export function clientPricingParagraph(
  inputs: PricingInputs,
  outputs: PricingOutputs,
) {
  return `The recommended investment for this program is ${formatMoney(
    outputs.finalPrice,
    inputs.currency,
  )}, based on ${inputs.numberOfParticipants} participants and ${
    inputs.numberOfTrainingDays
  } training day${inputs.numberOfTrainingDays === 1 ? "" : "s"}. This equals approximately ${formatMoney(
    outputs.pricePerParticipant,
    inputs.currency,
  )} per participant and includes the DG Academy training design, facilitation, participant materials, and agreed delivery preparation.`;
}

export function internalProfitabilityNote(
  inputs: PricingInputs,
  outputs: PricingOutputs,
) {
  const warnings =
    outputs.warnings.length > 0
      ? ` Pricing warnings: ${outputs.warnings.join(" ")}`
      : "";

  return `Internal only: estimated profit is ${formatMoney(
    outputs.estimatedProfit,
    inputs.currency,
  )}, with an estimated margin of ${formatPercent(
    outputs.estimatedProfitMargin,
  )} after discount and before tax remittance.${warnings}`;
}

export function buildCommercialProposalSection({
  title,
  client,
  inputs,
  outputs,
}: {
  title: string;
  client: string;
  inputs: PricingInputs;
  outputs: PricingOutputs;
}) {
  const discountNote =
    inputs.discountPercent > 0
      ? `A ${formatPercent(inputs.discountPercent)} commercial discount has already been reflected in the program fee.`
      : "No discount has been applied in this version of the offer.";

  return `# Commercial Proposal

## Investment
DG Academy proposes to deliver ${title} for ${client}.

## Program Fee
Recommended program fee: ${formatMoney(outputs.finalPrice, inputs.currency)}
Approximate price per participant: ${formatMoney(outputs.pricePerParticipant, inputs.currency)}

## What Is Included
- Program design and delivery preparation
- Trainer facilitation for ${inputs.numberOfTrainingDays} day${inputs.numberOfTrainingDays === 1 ? "" : "s"}
- Participant materials and practical templates
- Follow-up recommendations after delivery

## What Is Not Included
- Client venue, travel, or premium production costs unless listed in the commercial setup
- Additional coaching, implementation support, or custom system build work
- Taxes, regulatory filings, or funding approval administration beyond agreed documentation support

## Payment Terms
Payment terms to be confirmed in the final agreement.

## Validity Period
This proposal is valid for confirmation within the agreed proposal validity period.

## Discount Note
${discountNote}

## Next Steps
Confirm participant count, delivery date, venue or online setup, and decision-maker approval so DG Academy can finalize the delivery plan and invoice schedule.`;
}
