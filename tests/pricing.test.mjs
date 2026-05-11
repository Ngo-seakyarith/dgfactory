import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/pricing.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
});
const tempDir = mkdtempSync(join(tmpdir(), "dg-pricing-test-"));
const modulePath = join(tempDir, "pricing.mjs");
writeFileSync(modulePath, compiled.outputText, "utf8");

const {
  calculatePricing,
  defaultPricingInputs,
  normalizePricingInputs,
} = await import(`file:///${modulePath.replace(/\\/g, "/")}`);

test("normal 1-day training calculates final price and profit", () => {
  const inputs = normalizePricingInputs({
    ...defaultPricingInputs,
    numberOfParticipants: 20,
    trainerDayRate: 500,
    materialCostPerPerson: 5,
    targetProfitMarginPercent: 35,
  });
  const output = calculatePricing(inputs);

  assert.equal(output.trainerCost, 500);
  assert.equal(output.participantVariableCost, 100);
  assert.equal(output.totalDirectCost, 600);
  assert.equal(output.targetProfit, 210);
  assert.equal(output.finalPrice, 810);
  assert.equal(output.pricePerParticipant, 40.5);
});

test("zero participants does not divide by zero", () => {
  const output = calculatePricing({
    ...defaultPricingInputs,
    numberOfParticipants: 0,
  });

  assert.equal(output.pricePerParticipant, 0);
  assert.equal(Number.isFinite(output.pricePerParticipant), true);
});

test("discount is applied before tax", () => {
  const output = calculatePricing({
    ...defaultPricingInputs,
    numberOfParticipants: 10,
    trainerDayRate: 1000,
    materialCostPerPerson: 0,
    targetProfitMarginPercent: 50,
    discountPercent: 10,
  });

  assert.equal(output.subtotalBeforeDiscount, 1500);
  assert.equal(output.discountAmount, 150);
  assert.equal(output.finalPrice, 1350);
});

test("tax is applied after discount", () => {
  const output = calculatePricing({
    ...defaultPricingInputs,
    numberOfParticipants: 10,
    trainerDayRate: 1000,
    materialCostPerPerson: 0,
    targetProfitMarginPercent: 50,
    discountPercent: 10,
    taxPercent: 10,
  });

  assert.equal(output.subtotalAfterDiscount, 1350);
  assert.equal(output.taxAmount, 135);
  assert.equal(output.finalPrice, 1485);
});

test("negative input validation returns warnings", () => {
  const output = calculatePricing({
    ...defaultPricingInputs,
    venueCost: -50,
  });

  assert.equal(output.warnings.length, 1);
  assert.match(output.warnings[0], /venueCost/);
});

test("high participant count scales variable cost", () => {
  const output = calculatePricing({
    ...defaultPricingInputs,
    numberOfParticipants: 250,
    foodAndBeverageCostPerPerson: 10,
    materialCostPerPerson: 5,
  });

  assert.equal(output.participantVariableCost, 3750);
});

test("missing optional costs use safe defaults", () => {
  const output = calculatePricing({
    numberOfParticipants: 12,
    numberOfTrainingDays: 1,
    numberOfTrainers: 1,
    trainerDayRate: 500,
  });

  assert.equal(output.trainerCost, 500);
  assert.equal(output.venueCost, undefined);
  assert.equal(Number.isFinite(output.finalPrice), true);
});
