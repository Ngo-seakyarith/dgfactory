import { describe, expect, test } from "bun:test";

import {
  calculatePricing,
  getCommercialSetupError,
  normalizePricingInputs,
} from "./pricing";

describe("commercial setup", () => {
  test("uses the professional fee directly without discounts", () => {
    const inputs = normalizePricingInputs({
      numberOfParticipants: 25,
      professionalFee: 350,
      vatStatus: "Excluding VAT",
    });

    expect(calculatePricing(inputs)).toEqual({
      finalPrice: 350,
      pricePerParticipant: 14,
      warnings: [],
    });
  });

  test("requires participants and a professional fee", () => {
    expect(
      getCommercialSetupError({
        numberOfParticipants: 0,
        professionalFee: 0,
        vatStatus: "Excluding VAT",
      }),
    ).toContain("participant count");
  });
});
