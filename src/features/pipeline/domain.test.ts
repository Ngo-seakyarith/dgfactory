import { describe, expect, test } from "bun:test";

import { trainingOverview } from "./domain";

describe("training overview", () => {
  test("counts proposals, won and delivered fees, and clients", () => {
    expect(trainingOverview([
      { client: "Acme", clientId: "client-1", salesStatus: "Sent", pricingInputs: { professionalFee: 1000 } },
      { client: " ACME ", clientId: "client-1", salesStatus: "Delivered", pricingInputs: { professionalFee: 4500 } },
      { client: "Beta", clientId: null, salesStatus: "Won", pricingInputs: { professionalFee: 6900 } },
      { client: "", clientId: null, salesStatus: "Not Sent", pricingInputs: { professionalFee: 500 } },
    ])).toEqual({
      trainingProposals: 4,
      bookedRevenue: 11400,
      clientsInProposals: 2,
    });
  });

  test("returns zeroes for an empty archive", () => {
    expect(trainingOverview([])).toEqual({
      trainingProposals: 0,
      bookedRevenue: 0,
      clientsInProposals: 0,
    });
  });

  test("ignores lost proposals and invalid fees", () => {
    expect(trainingOverview([
      { client: "A", clientId: null, salesStatus: "Lost", pricingInputs: { professionalFee: 8000 } },
      { client: "B", clientId: null, salesStatus: "Won", pricingInputs: { professionalFee: -100 } },
      { client: "C", clientId: null, salesStatus: "Delivered", pricingInputs: { professionalFee: Number.NaN } },
      { client: "D", clientId: null, salesStatus: "Won", pricingInputs: { professionalFee: 123.45 } },
    ]).bookedRevenue).toBe(123.45);
  });
});
