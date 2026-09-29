import { describe, expect, test } from "bun:test";
import { clientProjectInput, emptyClientProject, projectInputSchema, projectStages } from "./project-domain";
import { proposalStages } from "./domain";

const clientId = "a59d9d34-b3fa-4f4d-a582-9c6b66375ccf";
const sourceId = "a1ac7ba1-b3fa-4f4d-a582-9c6b66375ccf";
const base = () => ({ ...emptyClientProject(clientId), title: "AI capability development" });

describe("spreadsheet-aligned projects", () => {
  test("a project can exist without any generated proposal", () => {
    expect(projectInputSchema.parse(base()).trainingPackageId).toBeNull();
  });
  test("imported client IDs remain valid when editing a stage or linking a proposal", () => {
    const importedClientId = "887625ad-c0b3-b055-3eac-70191dc1b84a";
    const input = { ...emptyClientProject(importedClientId), title: "Imported training", stage: "Delivered", actualValue: 4500 };
    expect(projectInputSchema.parse(input)).toMatchObject({ clientId: importedClientId, stage: "Delivered", actualValue: 4500 });
    expect(projectInputSchema.parse({ ...input, trainingPackageId: "20400ae5-851a-dec2-89fa-c84c77222028" }).trainingPackageId).toBe("20400ae5-851a-dec2-89fa-c84c77222028");
    expect(projectInputSchema.safeParse({ ...input, clientId: "not-an-id" }).success).toBe(false);
  });
  test("owner is not a separate editable project field", () => {
    expect(projectInputSchema.parse({ ...base(), owner: "Other owner", clientOwner: "MD" })).not.toHaveProperty("owner");
    expect(projectInputSchema.parse({ ...base(), clientOwner: "MD" })).not.toHaveProperty("clientOwner");
    const input = clientProjectInput({ ...base(), clientId: null, id: sourceId, clientName: "Client", clientOwner: "MD", createdAt: "", updatedAt: "" });
    expect(input.clientId).toBe("");
    expect(input).not.toHaveProperty("clientOwner");
    expect(input).not.toHaveProperty("updatedAt");
  });
  test("unknown amounts remain null, not zero", () => {
    expect(projectInputSchema.parse(base()).actualValue).toBeNull();
    expect(projectInputSchema.parse({ ...base(), actualValue: 0 }).actualValue).toBe(0);
  });
  test("payment received date is optional and never inferred from stage or amount", () => {
    expect(base().paymentReceivedDate).toBeNull();
    for (const stage of projectStages) {
      expect(projectInputSchema.parse({ ...base(), stage, actualValue: 2500 }).paymentReceivedDate).toBeNull();
    }
    const { paymentReceivedDate, ...legacyInput } = base();
    expect(paymentReceivedDate).toBeNull();
    expect(projectInputSchema.parse(legacyInput).paymentReceivedDate).toBeUndefined();
    expect(projectInputSchema.parse({ ...base(), paymentReceivedDate: "2026-09-28" }).paymentReceivedDate).toBe("2026-09-28");
    expect(projectInputSchema.parse({ ...base(), paymentReceivedDate: null }).paymentReceivedDate).toBeNull();
  });
  test("payment date rejects invalid calendar dates, timestamps, and free text", () => {
    for (const paymentReceivedDate of ["", "28 September", "2026-02-30", "2026-02-29", "2026-13-01", "2026-9-28", "2026-09-28T13:00:00Z"]) {
      expect(projectInputSchema.safeParse({ ...base(), paymentReceivedDate }).success).toBe(false);
    }
    expect(projectInputSchema.parse({ ...base(), paymentReceivedDate: "2028-02-29" }).paymentReceivedDate).toBe("2028-02-29");
  });
  test("planning periods and revenue descriptions preserve spreadsheet meaning", () => {
    const value = projectInputSchema.parse({ ...base(), startPeriod: "Q4", endPeriod: "Q1-2027", expectedOutcomes: "3,000 + Platform", targetValue: 3000 });
    expect(value.startPeriod).toBe("Q4");
    expect(value.expectedOutcomes).toBe("3,000 + Platform");
    expect(value.targetValue).toBe(3000);
  });
  test("requires client and project title", () => {
    expect(projectInputSchema.safeParse({ ...base(), clientId: "" }).success).toBe(false);
    expect(projectInputSchema.safeParse({ ...base(), title: " " }).success).toBe(false);
  });
  test("rejects invalid numeric values rather than silently converting them", () => {
    for (const targetValue of [-1, Infinity, NaN, 1e14, "1500"]) {
      expect(projectInputSchema.safeParse({ ...base(), targetValue }).success).toBe(false);
    }
  });
  test("detailed status is separate from the pipeline stage", () => {
    expect(projectInputSchema.parse({ ...base(), statusNote: "In discussion with HR" }).stage).toBe("Prospects");
    expect(projectInputSchema.safeParse({ ...base(), stage: "In discussion with HR" }).success).toBe(false);
  });
  test("only one proposal may be linked with the corresponding type", () => {
    expect(projectInputSchema.safeParse({ ...base(), trainingPackageId: sourceId, systemProposalId: sourceId }).success).toBe(false);
    expect(projectInputSchema.safeParse({ ...base(), systemProposalId: sourceId }).success).toBe(false);
    expect(projectInputSchema.safeParse({ ...base(), systemProposalId: sourceId, projectType: "Intelligent System" }).success).toBe(true);
  });
  test("projects and proposals share exactly the five requested stages", () => {
    expect(projectStages).toEqual(["Prospects", "Warm", "Hot", "Contracted", "Delivered"]);
    expect(projectStages).toEqual(proposalStages);
    for (const stage of ["Discovery", "Trial", "Proposal", "Won", "Lost"]) expect(projectInputSchema.safeParse({ ...base(), stage }).success).toBe(false);
  });
});
