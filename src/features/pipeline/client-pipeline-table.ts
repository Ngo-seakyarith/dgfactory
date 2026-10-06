import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_basic,
  tableFeatures,
  type Row,
} from "@tanstack/react-table";

import { formatDateTime } from "@/lib/date-time";
import { filterClientPipeline, type ClientPipelineFilters, type ClientPipelineGroup } from "./client-pipeline";

export const initialPipelineFilters: ClientPipelineFilters = { search: "", owner: "All", stage: "All" };

export const pipelineTableFeatures = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  rowExpandingFeature,
  columnVisibilityFeature,
});

export type PipelineTableRow = Row<typeof pipelineTableFeatures, ClientPipelineGroup>;
const helper = createColumnHelper<typeof pipelineTableFeatures, ClientPipelineGroup>();
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function textSort(a: PipelineTableRow, b: PipelineTableRow, columnId: string) {
  return a.getValue<string>(columnId).trim().localeCompare(b.getValue<string>(columnId).trim(), "en", {
    sensitivity: "base", numeric: true,
  }) || a.id.localeCompare(b.id);
}

function valueTotal(group: ClientPipelineGroup, key: "targetValue" | "actualValue") {
  const values = group.projects.map((project) => project[key]).filter((value): value is number => value !== null);
  return values.length ? values.reduce((total, value) => total + value, 0) : undefined;
}

function latestUpdate(group: ClientPipelineGroup) {
  return group.projects.reduce((latest, project) => project.updatedAt > latest ? project.updatedAt : latest, group.client?.updatedAt ?? "");
}

export const pipelineTableColumns = helper.columns([
  helper.accessor((group) => group.client?.name ?? "Client not selected", {
    id: "client", header: "Account", sortFn: textSort, enableHiding: false,
  }),
  helper.accessor((group) => group.client?.accountOwner.trim() || "Unassigned", {
    id: "owner", header: "Owner", sortFn: textSort,
  }),
  helper.accessor((group) => group.client?.contactPerson || "", {
    id: "contact", header: "Contact", sortFn: textSort,
    cell: (cell) => cell.getValue() || "Not recorded",
  }),
  helper.accessor((group) => valueTotal(group, "targetValue"), {
    id: "target", header: "Value total", sortFn: sortFn_basic, sortUndefined: "last",
    cell: (cell) => cell.getValue() === undefined ? "Not recorded" : money.format(cell.getValue()!),
  }),
  helper.accessor((group) => valueTotal(group, "actualValue"), {
    id: "actual", header: "Actual total", sortFn: sortFn_basic, sortUndefined: "last",
    cell: (cell) => cell.getValue() === undefined ? "Not recorded" : money.format(cell.getValue()!),
  }),
  helper.accessor(latestUpdate, {
    id: "updated", header: "Updated", sortFn: textSort, sortDescFirst: true,
    cell: (cell) => formatDateTime(cell.getValue()),
  }),
  helper.display({ id: "expand", header: "Details", enableHiding: false, enableSorting: false }),
]);

export const pipelineTableOptions = {
  features: pipelineTableFeatures,
  columns: pipelineTableColumns,
  getRowId: (group: ClientPipelineGroup) => group.id,
  getRowCanExpand: () => true,
  getColumnCanGlobalFilter: (column: { id: string }) => column.id === "client",
  globalFilterFn: (row: PipelineTableRow, _columnId: string, filters: ClientPipelineFilters) => filterClientPipeline(row.original, filters).visible,
  enableHiding: false,
  enableSortingRemoval: false,
  autoResetPageIndex: false,
  autoResetExpanded: false,
  initialState: {
    sorting: [{ id: "client", desc: false }],
    columnVisibility: { target: false, actual: false, updated: false },
  },
};
