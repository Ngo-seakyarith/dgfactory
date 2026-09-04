import { describe, expect, test } from "bun:test";

import { defaultPricingInputs } from "@/features/training-packages/domain/pricing";

import { getSyllabusPricingError } from "./pricing-validation";

describe("syllabus pricing validation", () => {
  test("requires participants before the professional fee", () => {
    expect(
      getSyllabusPricingError({
        ...defaultPricingInputs,
        numberOfParticipants: 0,
        professionalFee: 0,
      }),
    ).toBe("Enter a participant count greater than zero.");
  });

  test("requires a professional fee", () => {
    expect(
      getSyllabusPricingError({
        ...defaultPricingInputs,
        numberOfParticipants: 20,
        professionalFee: 0,
      }),
    ).toBe("Enter a professional fee greater than zero.");
  });

  test("accepts complete pricing", () => {
    expect(
      getSyllabusPricingError({
        ...defaultPricingInputs,
        numberOfParticipants: 20,
        professionalFee: 2_000,
      }),
    ).toBe("");
  });
});
