import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { NextResponse } from "next/server";
import * as auth from "@/lib/route-guards";
import * as audit from "@/lib/audit";
import { clientProjectInput, emptyClientProject, type ClientProject } from "../project-domain";
import * as storage from "./project-storage";
import { deleteProjectRequest, getProjectRequest, saveProjectRequest } from "./project-handlers";

const importedId = "20400ae5-851a-dec2-89fa-c84c77222028";
const importedClientId = "887625ad-c0b3-b055-3eac-70191dc1b84a";
const importedProject: ClientProject = {
  ...emptyClientProject(importedClientId), id: importedId, title: "Imported training", stage: "Lead",
  targetValue: 84150, actualValue: 4500, statusNote: "In Review", clientName: "Example client", clientOwner: "",
  createdAt: "2026-09-29T02:32:38.502Z", updatedAt: "2026-09-29T02:32:38.502Z",
};
const context = (id = importedId) => ({ params: Promise.resolve({ id }) });
const request = (body: unknown) => new Request(`https://example.test/api/client-projects/${importedId}`, {
  method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

beforeEach(() => {
  spyOn(auth, "requireApproved").mockResolvedValue({ ok: true, user: { actor: "Test user", role: "Approved" } });
  spyOn(storage, "getClientProject").mockResolvedValue(importedProject);
  spyOn(storage, "saveClientProject").mockImplementation(async (input, id) => ({ ...importedProject, ...input, id: id ?? importedId }));
  spyOn(storage, "deleteClientProject").mockResolvedValue({ trainingPackageId: null, deliveryProjectIds: [] });
  spyOn(audit, "saveAuditLog").mockImplementation(async (input) => ({ log: audit.normalizeAuditLog(input), storage: "supabase" }));
});
afterEach(() => mock.restore());

describe("imported Pipeline record API", () => {
  test("opens an imported record whose database ID has non-RFC version bits", async () => {
    const response = await getProjectRequest(new Request(`https://example.test/api/client-projects/${importedId}`), context());
    expect(response.status).toBe(200);
    expect((await response.json()).project.id).toBe(importedId);
    expect(storage.getClientProject).toHaveBeenCalledWith(importedId);
  });

  test("autosaves stage and amounts for imported project and client IDs without changing IDs", async () => {
    const input = { ...clientProjectInput(importedProject), stage: "Delivered" as const, paymentReceivedDate: "2026-09-29" };
    const response = await saveProjectRequest(request(input), context());
    expect(response.status).toBe(200);
    expect(storage.saveClientProject).toHaveBeenCalledWith(input, importedId);
    expect((await response.json()).project).toMatchObject({ id: importedId, clientId: importedClientId, stage: "Delivered", actualValue: 4500 });
    expect(audit.saveAuditLog).toHaveBeenCalledWith(expect.objectContaining({ entityId: importedId, metadata: { title: importedProject.title, stage: "Delivered" } }));
  });

  test("the compact stage control preserves all other fields on imported records", async () => {
    const response = await saveProjectRequest(request({ stage: "Confirmed" }), context());
    expect(response.status).toBe(200);
    expect(storage.saveClientProject).toHaveBeenCalledWith({ ...clientProjectInput(importedProject), stage: "Confirmed" }, importedId);
  });

  test("the imported record can use the existing delete endpoint", async () => {
    const response = await deleteProjectRequest(new Request(`https://example.test/api/client-projects/${importedId}`, { method: "DELETE" }), context());
    expect(response.status).toBe(200);
    expect(storage.deleteClientProject).toHaveBeenCalledWith(importedId);
  });

  test("deletion reports and audits the removed proposal and deliveries", async () => {
    const deleted = { trainingPackageId: "6254157e-5efa-4b83-9aea-559a687af9e9", deliveryProjectIds: ["c6eb4eff-76b1-48ff-a319-e5c1e93183fa"] };
    spyOn(storage, "deleteClientProject").mockResolvedValue(deleted);
    const response = await deleteProjectRequest(new Request(`https://example.test/api/client-projects/${importedId}`, { method: "DELETE" }), context());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: true, ...deleted });
    expect(audit.saveAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "client_project_deleted", metadata: deleted }));
  });

  test("malformed IDs and invalid fields still return 400 without saving", async () => {
    const invalidId = await saveProjectRequest(request({ stage: "Delivered" }), context("not-an-id"));
    expect(invalidId.status).toBe(400);
    const invalidClient = await saveProjectRequest(request({ ...clientProjectInput(importedProject), clientId: "not-an-id" }), context());
    expect(invalidClient.status).toBe(400);
    const invalidStage = await saveProjectRequest(request({ ...clientProjectInput(importedProject), stage: "Unknown" }), context());
    expect(invalidStage.status).toBe(400);
    expect(storage.saveClientProject).not.toHaveBeenCalled();
  });

  test("Pending users cannot save imported records", async () => {
    spyOn(auth, "requireApproved").mockResolvedValue({ ok: false, user: { actor: "Test user", role: "Pending" }, response: NextResponse.json({ error: "Pending approval." }, { status: 403 }) });
    const response = await saveProjectRequest(request({ stage: "Delivered" }), context());
    expect(response.status).toBe(403);
    expect(storage.saveClientProject).not.toHaveBeenCalled();
  });

  test("Pending users cannot delete a training or linked content", async () => {
    spyOn(auth, "requireApproved").mockResolvedValue({ ok: false, user: { actor: "Test user", role: "Pending" }, response: NextResponse.json({ error: "Pending approval." }, { status: 403 }) });
    const response = await deleteProjectRequest(new Request(`https://example.test/api/client-projects/${importedId}`, { method: "DELETE" }), context());
    expect(response.status).toBe(403);
    expect(storage.deleteClientProject).not.toHaveBeenCalled();
  });
});
