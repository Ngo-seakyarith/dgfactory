export type TrainingFormat =
  | "In-house"
  | "Public workshop"
  | "Online"
  | "Hybrid";

export type PricingTemplateMode =
  | "SME Workshop"
  | "Corporate In-House Training"
  | "Executive Masterclass"
  | "Online Cohort"
  | "Custom";

export type PricingInputs = {
  currency: string;
  trainingFormat: TrainingFormat;
  pricingTemplate: PricingTemplateMode;
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
  fundingNoteEnabled: boolean;
  fundingNoteText: string;
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
  trainingFormat: "In-house",
  pricingTemplate: "Custom",
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
  fundingNoteEnabled: false,
  fundingNoteText:
    "Funding eligibility may depend on the client, program scope, participant profile, and current SDF/HRD-style rules. DG Academy can support documentation after the client confirms the applicable scheme.",
};

export const pricingPresets: Record<PricingTemplateMode, Partial<PricingInputs>> = {
  "SME Workshop": {
    pricingTemplate: "SME Workshop",
    trainingFormat: "Public workshop",
    numberOfParticipants: 25,
    numberOfTrainingDays: 1,
    numberOfTrainers: 1,
    trainerDayRate: 450,
    venueCost: 250,
    foodAndBeverageCostPerPerson: 12,
    materialCostPerPerson: 5,
    adminCost: 120,
    marketingCost: 180,
    targetProfitMarginPercent: 32,
  },
  "Corporate In-House Training": {
    pricingTemplate: "Corporate In-House Training",
    trainingFormat: "In-house",
    numberOfParticipants: 30,
    numberOfTrainingDays: 2,
    numberOfTrainers: 1,
    trainerDayRate: 650,
    venueCost: 0,
    foodAndBeverageCostPerPerson: 0,
    materialCostPerPerson: 8,
    adminCost: 250,
    travelCost: 150,
    targetProfitMarginPercent: 40,
  },
  "Executive Masterclass": {
    pricingTemplate: "Executive Masterclass",
    trainingFormat: "In-house",
    numberOfParticipants: 15,
    numberOfTrainingDays: 1,
    numberOfTrainers: 1,
    trainerDayRate: 900,
    venueCost: 350,
    foodAndBeverageCostPerPerson: 25,
    materialCostPerPerson: 15,
    adminCost: 250,
    targetProfitMarginPercent: 50,
  },
  "Online Cohort": {
    pricingTemplate: "Online Cohort",
    trainingFormat: "Online",
    numberOfParticipants: 40,
    numberOfTrainingDays: 4,
    numberOfTrainers: 1,
    trainerDayRate: 350,
    venueCost: 0,
    foodAndBeverageCostPerPerson: 0,
    materialCostPerPerson: 3,
    adminCost: 180,
    marketingCost: 250,
    targetProfitMarginPercent: 45,
  },
  Custom: {
    pricingTemplate: "Custom",
  },
};

const numericFields: Array<keyof Omit<
  PricingInputs,
  "currency" | "trainingFormat" | "pricingTemplate" | "fundingNoteEnabled" | "fundingNoteText"
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

function toNumber(value: unknown, fallback: number) {
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
    trainingFormat: normalized.trainingFormat || "In-house",
    pricingTemplate: normalized.pricingTemplate || "Custom",
    fundingNoteEnabled: Boolean(normalized.fundingNoteEnabled),
    fundingNoteText: String(normalized.fundingNoteText ?? "").trim(),
  };
}

export function applyPricingPreset(
  current: PricingInputs,
  preset: PricingTemplateMode,
) {
  return normalizePricingInputs({
    ...current,
    ...pricingPresets[preset],
    pricingTemplate: preset,
  });
}

export function calculatePricing(
  rawInputs?: Partial<PricingInputs> | null,
): PricingOutputs {
  const inputs = normalizePricingInputs(rawInputs);
  const warnings = numericFields
    .filter((field) => inputs[field] < 0)
    .map((field) => `${field} should not be negative.`);

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
  const targetProfit = (totalDirectCost * inputs.targetProfitMarginPercent) / 100;
  const subtotalBeforeDiscount = totalDirectCost + targetProfit;
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
    `Training format: ${inputs.trainingFormat}`,
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

export function clientPricingParagraph(
  inputs: PricingInputs,
  outputs: PricingOutputs,
) {
  return `The recommended investment for this ${inputs.trainingFormat.toLowerCase()} program is ${formatMoney(
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
  const fundingNote =
    inputs.fundingNoteEnabled && inputs.fundingNoteText
      ? `\n\n## Funding Note\n${inputs.fundingNoteText}`
      : "";

  return `# Commercial Proposal

## Investment
DG Academy proposes to deliver ${title} for ${client} as a ${inputs.trainingFormat.toLowerCase()} program.

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
${discountNote}${fundingNote}

## Next Steps
Confirm participant count, delivery date, venue or online setup, and decision-maker approval so DG Academy can finalize the delivery plan and invoice schedule.`;
}
