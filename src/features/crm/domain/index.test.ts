import { describe, expect, test } from "bun:test";
import { normalizeClient } from "./index";
import { isProposalStage, proposalStages } from "@/features/pipeline/domain";

describe("simple proposal pipeline", () => {
  test("uses five pipeline stages", () => {
    expect(proposalStages).toEqual(["Not Sent", "Sent", "Won", "Delivered", "Lost"]);
    expect(isProposalStage("Prepared")).toBe(false);
  });

  test("keeps client relationship context", () => {
    expect(normalizeClient({
      name: " Example Client ",
      accountOwner: " DG Academy ",
      clientType: " Prospect ",
      relationshipHistory: " Previous training ",
      nextAction: " Arrange a call ",
    })).toMatchObject({
      name: "Example Client",
      accountOwner: "DG Academy",
      clientType: "Prospect",
      relationshipHistory: "Previous training",
      nextAction: "Arrange a call",
    });
  });
});
