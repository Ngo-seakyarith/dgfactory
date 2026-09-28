import { describe, expect, test } from "bun:test";
import { formatDate } from "./date-time";

describe("date-only display", () => {
  test("keeps the calendar day instead of shifting with local timezone", () => {
    expect(formatDate("2026-01-01")).toBe("01 Jan 2026");
    expect(formatDate("2026-12-31")).toBe("31 Dec 2026");
  });
  test("missing or malformed dates are not formatted as real dates", () => {
    expect(formatDate("")).toBe("Unknown date");
    expect(formatDate("not-a-date")).toBe("Unknown date");
  });
});
