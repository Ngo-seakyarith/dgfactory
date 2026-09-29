import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import * as supabase from "@/lib/supabase/server";
import { emptyClientProject } from "../project-domain";
import { deleteClientProject, projectFromRow, projectToRow, type ClientProjectRow } from "./project-storage";
import { ProjectRequestError } from "./errors";

afterEach(() => mock.restore());

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

describe("Pipeline training deletion", () => {
  const id = "20400ae5-851a-dec2-89fa-c84c77222028";

  function databaseResult(data: unknown, error: { code: string; message: string } | null = null) {
    const rpc = mock(async () => ({ data, error }));
    spyOn(supabase, "getSupabaseServerClient").mockReturnValue({ rpc } as unknown as NonNullable<ReturnType<typeof supabase.getSupabaseServerClient>>);
    return rpc;
  }

  test("deletes the training and owned content through one atomic database call", async () => {
    const result = { trainingPackageId: "package-id", deliveryProjectIds: ["delivery-id"] };
    const rpc = databaseResult(result);
    expect(await deleteClientProject(id)).toEqual(result);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("delete_client_project", { p_project_id: id });
  });

  test("unlinked training deletion returns no linked records", async () => {
    databaseResult({ trainingPackageId: null, deliveryProjectIds: [] });
    expect(await deleteClientProject(id)).toEqual({ trainingPackageId: null, deliveryProjectIds: [] });
  });

  test("not-found and active-generation errors remain readable API errors", async () => {
    databaseResult(null, { code: "P0002", message: "Project not found." });
    try { await deleteClientProject(id); throw new Error("Expected deletion to fail."); }
    catch (error) { expect(error).toBeInstanceOf(ProjectRequestError); expect(error).toMatchObject({ status: 404, message: "Project not found." }); }

    databaseResult(null, { code: "23514", message: "Generation is still running." });
    try { await deleteClientProject(id); throw new Error("Expected deletion to fail."); }
    catch (error) { expect(error).toBeInstanceOf(ProjectRequestError); expect(error).toMatchObject({ status: 409, message: "Generation is still running." }); }
  });

  test("a database failure is not reported as successful deletion", async () => {
    databaseResult(null, { code: "XX000", message: "Deletion failed." });
    await expect(deleteClientProject(id)).rejects.toThrow("Deletion failed.");
  });
});
