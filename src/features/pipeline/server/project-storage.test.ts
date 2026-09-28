import { describe, expect, test } from "bun:test";
import { emptyClientProject } from "../project-domain";
import { projectFromRow, projectToRow, type ClientProjectRow } from "./project-storage";

describe("payment received date storage", () => {
  test("maps dates to the dedicated database column, and null clears it", () => {
    expect(projectToRow({ ...emptyClientProject(), paymentReceivedDate: "2026-09-28" }).payment_received_date).toBe("2026-09-28");
    expect(projectToRow({ ...emptyClientProject(), paymentReceivedDate: null }).payment_received_date).toBeNull();
  });
  test("older update payloads cannot erase a recorded payment date", () => {
    const { paymentReceivedDate, ...input } = emptyClientProject();
    expect(paymentReceivedDate).toBeNull();
    expect(projectToRow(input)).not.toHaveProperty("payment_received_date");
  });
  test("read responses preserve a received date, amount, and sales stage independently", () => {
    const row: ClientProjectRow = {
      id: "project", client_id: "client", title: "Course", project_type: "Training", stage: "Warm",
      expected_outcomes: "", target_value: 2500, actual_value: 500, payment_received_date: "2026-09-28",
      start_period: "Q4", end_period: "Q4", status_note: "", next_opportunities: "", next_action: "", notes: "",
      training_package_id: null, system_proposal_id: null, created_at: "", updated_at: "",
      clients: { name: "Client", account_owner: "MD" },
    };
    expect(projectFromRow(row)).toMatchObject({ paymentReceivedDate: "2026-09-28", actualValue: 500, stage: "Warm", clientOwner: "MD" });
    expect(projectFromRow({ ...row, payment_received_date: null }).paymentReceivedDate).toBeNull();
  });
});
