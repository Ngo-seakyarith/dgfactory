import { describe, expect, test } from "bun:test";
import { constructTable } from "@tanstack/react-table";
import { storeReactivityBindings } from "@tanstack/table-core/store-reactivity-bindings";
import { createEmptyClient, type Client } from "@/features/crm/domain";
import { emptyClientProject, type ClientProject } from "./project-domain";
import { groupClientPipeline, type ClientPipelineFilters, type ClientPipelineGroup } from "./client-pipeline";
import { initialPipelineFilters, pipelineTableFeatures, pipelineTableOptions } from "./client-pipeline-table";

const client = (id: string, overrides: Partial<Client> = {}): Client => ({ ...createEmptyClient(), id, name: id, ...overrides });
const project = (id: string, clientId: string | null, overrides: Partial<ClientProject> = {}): ClientProject => ({ ...emptyClientProject(), id, clientId, clientName: "", clientOwner: "", title: id, createdAt: "2026-09-01", updatedAt: "2026-09-28", ...overrides });

function createTable(clients: Client[], projects: ClientProject[] = [], filters: ClientPipelineFilters = initialPipelineFilters) {
  const options = {
    ...pipelineTableOptions,
    features: { ...pipelineTableFeatures, coreReactivityFeature: storeReactivityBindings() },
    data: groupClientPipeline(clients, projects),
    initialState: { ...pipelineTableOptions.initialState, globalFilter: filters, pagination: { pageSize: 25, pageIndex: 0 } },
  };
  return constructTable<typeof pipelineTableFeatures, ClientPipelineGroup>(options);
}

describe("Clients & Pipeline table", () => {
  test("sorts alphabetically with stable IDs, original rows, and deterministic ties", () => {
    const clients = [client("z", { name: "Zuellig" }), client("b", { name: " borey " }), client("a", { name: "Angkor" })];
    const table = createTable(clients, [project("latest", "z")]);
    expect(table.getRowModel().rows.map((row) => row.id)).toEqual(["a", "b", "z"]);
    expect(table.getRowModel().rows[0].original.client).toBe(clients[2]);
    table.setSorting([{ id: "client", desc: true }]);
    expect(table.getRowModel().rows.map((row) => row.id)).toEqual(["z", "b", "a"]);
    expect(clients.map((item) => item.id)).toEqual(["z", "b", "a"]);
    expect(createTable([client("b", { name: "Same" }), client("a", { name: "Same" })]).getRowModel().rows.map((row) => row.id)).toEqual(["a", "b"]);
  });

  test("combines search, owner, and stage on the same work record", () => {
    const table = createTable([client("a", { accountOwner: "Somaly Phin" }), client("empty")], [
      project("Leadership", "a", { stage: "Negotiation" }), project("Sales", "a", { stage: "Lead" }),
    ]);
    table.setGlobalFilter({ ...initialPipelineFilters, owner: "Somaly Phin", stage: "Negotiation", search: "sales" });
    expect(table.getRowModel().rows).toHaveLength(0);
    table.setGlobalFilter({ ...initialPipelineFilters, owner: "Somaly Phin", stage: "Negotiation", search: "leadership" });
    expect(table.getRowModel().rows.map((row) => row.id)).toEqual(["a"]);
    table.setGlobalFilter(initialPipelineFilters);
    expect(table.getRowModel().rows).toHaveLength(2);
  });

  test("includes client contacts, companies without work, and unassigned work", () => {
    const table = createTable([client("a", { contactPerson: "Sok Dara" }), client("empty")], [project("Website", null)]);
    table.setGlobalFilter({ ...initialPipelineFilters, search: "Dara" });
    expect(table.getRowModel().rows.map((row) => row.id)).toEqual(["a"]);
    table.setGlobalFilter({ ...initialPipelineFilters, owner: "Unassigned", search: "Website" });
    expect(table.getRowModel().rows.map((row) => row.id)).toEqual(["unassigned"]);
  });

  test("paginates by client rather than splitting a client's work", () => {
    const table = createTable(Array.from({ length: 31 }, (_, index) => client(`Client ${String(index).padStart(2, "0")}`)));
    expect(table.getRowModel().rows).toHaveLength(25);
    expect(table.getPageCount()).toBe(2);
    table.nextPage();
    expect(table.getRowModel().rows).toHaveLength(6);
    expect(table.getRowModel().rows[0].id).toBe("Client 25");
    table.getRowModel().rows[0].toggleExpanded(true);
    table.setPageIndex(0);
    table.setPageIndex(1);
    expect(table.getRowModel().rows[0].getIsExpanded()).toBe(true);
  });

  test("data refreshes do not reset pagination or expansion", async () => {
    const clients = Array.from({ length: 31 }, (_, index) => client(`Client ${String(index).padStart(2, "0")}`));
    const table = createTable(clients, [project("Older training", "Client 25")]);
    table.setPageIndex(1);
    table.getRowModel().rows[0].toggleExpanded(true);
    table.setOptions((options) => ({ ...options, data: groupClientPipeline(clients, [project("Edited training", "Client 25", { updatedAt: "2026-09-29" })]) }));
    table.getRowModel();
    await Promise.resolve();
    expect(table.atoms.pagination.get().pageIndex).toBe(1);
    expect(table.getRowModel().rows[0].getIsExpanded()).toBe(true);
  });

  test("value sorting preserves unknown totals and legitimate zero values", () => {
    const table = createTable([client("a"), client("b"), client("c")], [
      project("First", "a", { actualValue: 100 }), project("Second", "a", { actualValue: 200 }),
      project("Zero", "b", { actualValue: 0 }),
    ]);
    table.setSorting([{ id: "actual", desc: true }]);
    expect(table.getRowModel().rows.map((row) => row.id)).toEqual(["a", "b", "c"]);
    expect(table.getRowModel().rows.map((row) => row.getValue("actual"))).toEqual([300, 0, undefined]);
    table.setSorting([{ id: "actual", desc: false }]);
    expect(table.getRowModel().rows.map((row) => row.id)).toEqual(["b", "a", "c"]);
  });

  test("uses fixed desktop columns and a compact mobile summary", () => {
    const table = createTable([client("a")]);
    expect(table.getVisibleLeafColumns().map((column) => column.id)).toEqual(["client", "owner", "contact", "expand"]);
    expect(table.getAllLeafColumns().every((column) => !column.getCanHide())).toBe(true);
    table.setColumnVisibility({ ...pipelineTableOptions.initialState.columnVisibility, owner: false, contact: false });
    expect(table.getVisibleLeafColumns().map((column) => column.id)).toEqual(["client", "expand"]);
    table.setColumnVisibility(pipelineTableOptions.initialState.columnVisibility);
    expect(table.getVisibleLeafColumns().map((column) => column.id)).toEqual(["client", "owner", "contact", "expand"]);
  });
});
