import { describe, expect, test } from "bun:test";
import { createEmptyClient, type Client } from "@/features/crm/domain";
import { emptyClientProject, type ClientProject } from "./project-domain";
import { filterClientPipeline, groupClientPipeline } from "./client-pipeline";

const client = (id: string, overrides: Partial<Client> = {}): Client => ({ ...createEmptyClient(), id, name: id, accountOwner: "MD", ...overrides });
const project = (id: string, clientId: string | null, overrides: Partial<ClientProject> = {}): ClientProject => ({ ...emptyClientProject(), id, clientId, clientName: "", clientOwner: "Wrong owner", title: id, createdAt: "2026-09-01", updatedAt: "2026-09-28", ...overrides });
const filters = { search: "", owner: "All", stage: "All" as const };

describe("combined clients and pipeline", () => {
  test("keeps companies without work and shows each linked training once", () => {
    const groups = groupClientPipeline([client("a"), client("b")], [project("training", "a", { trainingPackageId: "package" })]);
    expect(groups).toHaveLength(2);
    expect(groups.find((group) => group.id === "a")?.projects.map((project) => project.id)).toEqual(["training"]);
    expect(groups.find((group) => group.id === "b")?.projects).toEqual([]);
  });
  test("does not merge similar names or lose unmatched client IDs", () => {
    const groups = groupClientPipeline([client("a", { name: "ABC" }), client("b", { name: "ABC" })], [project("one", "a"), project("two", null), project("three", "missing")]);
    expect(groups).toHaveLength(3);
    expect(groups.find((group) => group.id === "unassigned")?.projects.map((project) => project.id)).toEqual(["two", "three"]);
  });
  test("stages stay independent for work under the same client", () => {
    const [group] = groupClientPipeline([client("a")], [project("one", "a", { stage: "Hot", paymentReceivedDate: "2026-09-27", actualValue: 900 }), project("two", "a", { stage: "Prospects" })]);
    const result = filterClientPipeline(group, { ...filters, stage: "Hot" });
    expect(result.projects.map((project) => project.id)).toEqual(["one"]);
    expect(group.projects).toHaveLength(2);
    expect(group.projects.find((project) => project.id === "two")?.paymentReceivedDate).toBeNull();
  });
  test("owner filter uses the client rather than old project metadata", () => {
    const [group] = groupClientPipeline([client("a")], [project("one", "a")]);
    expect(filterClientPipeline(group, { ...filters, owner: "MD" }).visible).toBe(true);
    expect(filterClientPipeline(group, { ...filters, owner: "Wrong owner" }).visible).toBe(false);
  });
  test("search matches a contact and includes that client's work", () => {
    const [group] = groupClientPipeline([client("a", { contactPerson: "Sok Dara" })], [project("Leadership", "a"), project("Sales", "a")]);
    expect(filterClientPipeline(group, { ...filters, search: " dara " }).projects).toHaveLength(2);
    expect(filterClientPipeline(group, { ...filters, search: "leadership" }).projects.map((project) => project.title)).toEqual(["Leadership"]);
  });
  test("stage filter hides clients with no matching work", () => {
    const [group] = groupClientPipeline([client("a")], []);
    expect(filterClientPipeline(group, filters).visible).toBe(true);
    expect(filterClientPipeline(group, { ...filters, stage: "Delivered" }).visible).toBe(false);
  });
  test("unassigned work is accessible by search and owner", () => {
    const [group] = groupClientPipeline([], [project("Website", null)]);
    expect(filterClientPipeline(group, { ...filters, owner: "Unassigned", search: "website" }).visible).toBe(true);
    expect(filterClientPipeline(group, { ...filters, owner: "MD" }).visible).toBe(false);
  });
  test("orders clients alphabetically while keeping their work newest first without mutating inputs", () => {
    const clients = [client("z"), client("a"), client("b")];
    const projects = [project("old", "b", { updatedAt: "2026-09-01" }), project("new", "b")];
    const groups = groupClientPipeline(clients, projects);
    expect(groups.map((group) => group.id)).toEqual(["a", "b", "z"]);
    expect(groups.find((group) => group.id === "b")?.projects.map((project) => project.id)).toEqual(["new", "old"]);
    expect(projects.map((project) => project.id)).toEqual(["old", "new"]);
    expect(clients.map((client) => client.id)).toEqual(["z", "a", "b"]);
  });
  test("alphabetical sorting ignores case, outer spaces, and recent work", () => {
    const groups = groupClientPipeline([
      client("z", { name: "Zuellig" }), client("b", { name: " borey " }), client("a", { name: "Angkor" }),
    ], [project("latest", "z")]);
    expect(groups.map((group) => group.id)).toEqual(["a", "b", "z"]);
  });
});
