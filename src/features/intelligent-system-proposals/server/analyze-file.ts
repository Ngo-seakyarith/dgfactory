import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";

import type {
  ColumnDataType,
  ColumnProfile,
  DatasetProfile,
  SheetProfile,
} from "../domain/types";

export const SYSTEM_FILE_LIMIT_BYTES = 10 * 1024 * 1024;
export const SYSTEM_PROJECT_FILE_LIMIT = 5;
export const SYSTEM_PROJECT_ROW_LIMIT = 250_000;
export const SYSTEM_SHEET_LIMIT = 20;
export const SYSTEM_COLUMN_LIMIT = 200;

const sensitiveHeaderPattern =
  /(^|\b)(email|e-mail|phone|mobile|telephone|national.?id|passport|account.?(number|no)|bank.?account|customer.?id|client.?id|employee.?id|personal.?id|full.?name|first.?name|last.?name)(\b|$)/i;

type ParsedCell = {
  value: string | number | boolean | Date | null;
  formula: boolean;
};

type ColumnAccumulator = {
  name: string;
  types: Record<Exclude<ColumnDataType, "mixed">, number>;
  nonEmpty: number;
  distinct: Set<string>;
  samples: string[];
  numericValues: number[];
  dateValues: Date[];
  sensitive: boolean;
  sensitiveReason: string;
};

function safeText(value: unknown) {
  return String(value ?? "").trim();
}

function excelCellValue(value: ExcelJS.CellValue): ParsedCell {
  if (value === null || value === undefined || value === "") {
    return { value: null, formula: false };
  }
  if (value instanceof Date) return { value, formula: false };
  if (["string", "number", "boolean"].includes(typeof value)) {
    return { value: value as string | number | boolean, formula: false };
  }
  if (typeof value === "object") {
    if ("formula" in value || "sharedFormula" in value) {
      const result = "result" in value ? value.result : null;
      if (result instanceof Date) return { value: result, formula: true };
      if (["string", "number", "boolean"].includes(typeof result)) {
        return { value: result as string | number | boolean, formula: true };
      }
      return { value: null, formula: true };
    }
    if ("text" in value) return { value: safeText(value.text), formula: false };
    if ("richText" in value && Array.isArray(value.richText)) {
      return {
        value: value.richText.map((part) => safeText(part.text)).join(""),
        formula: false,
      };
    }
    if ("error" in value) return { value: safeText(value.error), formula: false };
  }
  return { value: safeText(value), formula: false };
}

function csvCellValue(value: unknown): ParsedCell {
  const text = safeText(value);
  if (!text) return { value: null, formula: false };
  if (/^(true|false)$/i.test(text)) {
    return { value: text.toLowerCase() === "true", formula: false };
  }
  if (/^-?\d+(\.\d+)?$/.test(text) && text.length < 16 && !/^0\d+/.test(text)) {
    return { value: Number(text), formula: false };
  }
  const timestamp = Date.parse(text);
  if (/[-/]/.test(text) && Number.isFinite(timestamp)) {
    return { value: new Date(timestamp), formula: false };
  }
  return { value: text, formula: false };
}

function valueType(value: ParsedCell["value"]): Exclude<ColumnDataType, "mixed"> {
  if (value === null) return "empty";
  if (value instanceof Date) return "date";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
}

function displayValue(value: ParsedCell["value"]) {
  if (value instanceof Date) return value.toISOString();
  return safeText(value);
}

function sensitiveValueReason(value: string, columnName: string) {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "email values";
  const digits = value.replace(/\D/g, "");
  const identifierContext = /(^|\b)(phone|mobile|telephone|account|passport|id)(\b|$)/i.test(
    columnName.replace(/[_-]+/g, " "),
  );
  const phoneFormatting = /[+()\s-]/.test(value);
  if (digits.length >= 8 && digits.length <= 16 && (identifierContext || phoneFormatting)) {
    return "phone or account-like values";
  }
  return "";
}

function uniqueHeaders(values: ParsedCell[], width: number) {
  const seen = new Map<string, number>();
  return Array.from({ length: width }, (_, index) => {
    const base = displayValue(values[index]?.value) || `Column ${index + 1}`;
    const count = (seen.get(base.toLowerCase()) ?? 0) + 1;
    seen.set(base.toLowerCase(), count);
    return count === 1 ? base : `${base} (${count})`;
  });
}

function inferredType(types: ColumnAccumulator["types"]): ColumnDataType {
  const entries = Object.entries(types).filter(([key]) => key !== "empty") as Array<
    [Exclude<ColumnDataType, "mixed">, number]
  >;
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  if (!total) return "empty";
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  return sorted[0][1] / total >= 0.8 ? sorted[0][0] : "mixed";
}

function finalizeColumn(column: ColumnAccumulator, analyzedRows: number): ColumnProfile {
  const type = inferredType(column.types);
  const missingCount = Math.max(0, analyzedRows - column.nonEmpty);
  const numericSummary = column.numericValues.length
    ? {
        minimum: Math.min(...column.numericValues),
        maximum: Math.max(...column.numericValues),
        average:
          column.numericValues.reduce((sum, value) => sum + value, 0) /
          column.numericValues.length,
        total: column.numericValues.reduce((sum, value) => sum + value, 0),
      }
    : null;
  const dateSummary = column.dateValues.length
    ? {
        earliest: new Date(
          Math.min(...column.dateValues.map((value) => value.getTime())),
        ).toISOString(),
        latest: new Date(
          Math.max(...column.dateValues.map((value) => value.getTime())),
        ).toISOString(),
      }
    : null;
  const distinctRatio = column.nonEmpty ? column.distinct.size / column.nonEmpty : 0;
  const roles: ColumnProfile["roles"] = [];
  if (/id|code|number|account/i.test(column.name) && distinctRatio > 0.7) {
    roles.push("identifier");
  }
  if (type === "number") roles.push("metric");
  if (type === "date") roles.push("date");
  if (type === "string" && column.distinct.size > 1 && column.distinct.size <= 50) {
    roles.push("category");
  }

  return {
    name: column.name,
    inferredType: type,
    nonEmptyCount: column.nonEmpty,
    missingCount,
    distinctCount: column.distinct.size,
    sensitive: column.sensitive,
    sensitiveReason: column.sensitiveReason,
    userDescription: "",
    sampleValues: column.sensitive ? [] : column.samples,
    numericSummary,
    dateSummary,
    roles,
  };
}

function profileRows({
  name,
  rows,
  totalRows,
  maxRows,
}: {
  name: string;
  rows: ParsedCell[][];
  totalRows: number;
  maxRows: number;
}): SheetProfile {
  const headerIndex = rows.findIndex((row) => row.some((cell) => cell.value !== null));
  if (headerIndex < 0) {
    return {
      name,
      included: false,
      rowCount: 0,
      analyzedRowCount: 0,
      columnCount: 0,
      formulaCount: 0,
      duplicateRows: 0,
      partial: false,
      columns: [],
      maskedSampleRows: [],
      warnings: ["The sheet is empty."],
    };
  }

  const width = Math.min(
    SYSTEM_COLUMN_LIMIT,
    Math.max(...rows.slice(0, 20).map((row) => row.length), 0),
  );
  const headers = uniqueHeaders(rows[headerIndex], width);
  const dataRows = rows.slice(headerIndex + 1, headerIndex + 1 + maxRows);
  const columns: ColumnAccumulator[] = headers.map((header) => ({
    name: header,
    types: { empty: 0, string: 0, number: 0, date: 0, boolean: 0 },
    nonEmpty: 0,
    distinct: new Set<string>(),
    samples: [],
    numericValues: [],
    dateValues: [],
    sensitive: sensitiveHeaderPattern.test(header.replace(/[_-]+/g, " ")),
    sensitiveReason: sensitiveHeaderPattern.test(header.replace(/[_-]+/g, " "))
      ? "sensitive column name"
      : "",
  }));
  let formulaCount = 0;
  const rowKeys = new Set<string>();
  let duplicateRows = 0;

  dataRows.forEach((row) => {
    const rowDisplay: string[] = [];
    columns.forEach((column, index) => {
      const cell = row[index] ?? { value: null, formula: false };
      const type = valueType(cell.value);
      column.types[type] += 1;
      if (cell.formula) formulaCount += 1;
      const display = displayValue(cell.value);
      rowDisplay.push(display);
      if (!display) return;
      column.nonEmpty += 1;
      if (column.distinct.size < 1000) column.distinct.add(display);
      if (column.samples.length < 5 && !column.samples.includes(display)) {
        column.samples.push(display.slice(0, 120));
      }
      if (typeof cell.value === "number") column.numericValues.push(cell.value);
      if (cell.value instanceof Date) column.dateValues.push(cell.value);
      const reason = sensitiveValueReason(display, column.name);
      if (
        reason &&
        column.samples.filter((sample) => sensitiveValueReason(sample, column.name)).length >= 2
      ) {
        column.sensitive = true;
        column.sensitiveReason ||= reason;
      }
    });
    const rowKey = JSON.stringify(rowDisplay);
    if (rowDisplay.some(Boolean)) {
      if (rowKeys.has(rowKey)) duplicateRows += 1;
      else if (rowKeys.size < 100_000) rowKeys.add(rowKey);
    }
  });

  const finalizedColumns = columns.map((column) => finalizeColumn(column, dataRows.length));
  const maskedSampleRows = dataRows.slice(0, 5).map((row) =>
    Object.fromEntries(
      finalizedColumns.map((column, index) => [
        column.name,
        column.sensitive
          ? "[REDACTED]"
          : displayValue(row[index]?.value ?? null).slice(0, 120),
      ]),
    ),
  );
  const warnings = finalizedColumns.flatMap((column) => {
    const values: string[] = [];
    if (dataRows.length && column.missingCount / dataRows.length >= 0.3) {
      values.push(`${column.name} is missing in at least 30% of analyzed rows.`);
    }
    if (column.inferredType === "mixed") {
      values.push(`${column.name} contains mixed data types.`);
    }
    if (column.sensitive) {
      values.push(`${column.name} is masked because it may contain ${column.sensitiveReason}.`);
    }
    return values;
  });
  const partial = totalRows > dataRows.length || width >= SYSTEM_COLUMN_LIMIT;
  if (partial) warnings.push("This sheet exceeded an analysis limit and was sampled.");

  return {
    name,
    included: true,
    rowCount: totalRows,
    analyzedRowCount: dataRows.length,
    columnCount: width,
    formulaCount,
    duplicateRows,
    partial,
    columns: finalizedColumns,
    maskedSampleRows,
    warnings,
  };
}

function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const candidates = [",", ";", "\t", "|"];
  return candidates
    .map((delimiter) => ({ delimiter, count: firstLine.split(delimiter).length - 1 }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter ?? ",";
}

async function xlsxSheets(buffer: Buffer, maxRows: number) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
  );
  const sheets: SheetProfile[] = [];
  let remaining = maxRows;

  workbook.worksheets.slice(0, SYSTEM_SHEET_LIMIT).forEach((worksheet) => {
    const rows: ParsedCell[][] = [];
    const readLimit = Math.min(worksheet.actualRowCount, remaining + 20);
    for (let rowNumber = 1; rowNumber <= readLimit; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      const width = Math.min(worksheet.actualColumnCount, SYSTEM_COLUMN_LIMIT);
      rows.push(
        Array.from({ length: width }, (_, index) =>
          excelCellValue(row.getCell(index + 1).value),
        ),
      );
    }
    const totalRows = Math.max(0, worksheet.actualRowCount - 1);
    const profile = profileRows({
      name: worksheet.name,
      rows,
      totalRows,
      maxRows: Math.max(0, remaining),
    });
    sheets.push(profile);
    remaining = Math.max(0, remaining - profile.analyzedRowCount);
  });
  return { sheets, sheetCount: workbook.worksheets.length };
}

function csvSheets(buffer: Buffer, maxRows: number) {
  const text = buffer.toString("utf8");
  const records = parse(text, {
    bom: true,
    delimiter: detectDelimiter(text),
    relax_column_count: true,
    skip_empty_lines: true,
    to: maxRows + 21,
  }) as unknown[][];
  const rows = records.map((row) => row.map(csvCellValue));
  const profile = profileRows({
    name: "CSV Data",
    rows,
    totalRows: Math.max(0, records.length - 1),
    maxRows,
  });
  return { sheets: [profile], sheetCount: 1 };
}

export async function analyzeSourceFile({
  fileId,
  fileName,
  mimeType,
  sizeBytes,
  buffer,
  maxRows = SYSTEM_PROJECT_ROW_LIMIT,
}: {
  fileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
  maxRows?: number;
}): Promise<DatasetProfile> {
  const extension = fileName.toLowerCase().split(".").pop();
  if (!buffer.length || buffer.length > SYSTEM_FILE_LIMIT_BYTES) {
    throw new Error("The source file is empty or exceeds the 10 MB limit.");
  }
  if (extension !== "xlsx" && extension !== "csv") {
    throw new Error("Only .xlsx and .csv files are supported.");
  }
  if (extension === "xlsx" && !buffer.subarray(0, 2).equals(Buffer.from("PK"))) {
    throw new Error("The Excel file is invalid, encrypted, or corrupted.");
  }

  const parsed =
    extension === "xlsx"
      ? await xlsxSheets(buffer, maxRows)
      : csvSheets(buffer, maxRows);
  const totalRows = parsed.sheets.reduce((sum, sheet) => sum + sheet.rowCount, 0);
  const analyzedRows = parsed.sheets.reduce(
    (sum, sheet) => sum + sheet.analyzedRowCount,
    0,
  );
  const warnings = parsed.sheets.flatMap((sheet) => sheet.warnings);
  if (parsed.sheetCount > SYSTEM_SHEET_LIMIT) {
    warnings.unshift(`Only the first ${SYSTEM_SHEET_LIMIT} sheets were analyzed.`);
  }

  return {
    fileId,
    fileName,
    mimeType,
    sizeBytes,
    totalRows,
    analyzedRows,
    partial: analyzedRows < totalRows || parsed.sheetCount > SYSTEM_SHEET_LIMIT,
    sheets: parsed.sheets,
    warnings: [...new Set(warnings)],
  };
}
