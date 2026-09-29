import { describe, expect, test } from "bun:test";
import { databaseIdSchema } from "./database-id";

describe("database record IDs", () => {
  test("accepts imported PostgreSQL IDs and generated UUIDs without changing them", () => {
    for (const id of [
      "20400ae5-851a-dec2-89fa-c84c77222028",
      "887625ad-c0b3-b055-3eac-70191dc1b84a",
      "d89e7b01-7598-ed11-9d7a-0022489382fd",
      "b3ce60f8-e8b9-40f5-1150-172ede56ff74",
      "a59d9d34-b3fa-4f4d-a582-9c6b66375ccf",
      crypto.randomUUID(),
    ]) expect(databaseIdSchema.parse(id)).toBe(id);
  });

  test("still rejects malformed IDs", () => {
    for (const id of ["", "not-an-id", "../client", "20400ae5-851a-dec2-89fa-c84c7722202", "20400ae5-851a-dec2-89fa-c84c77222028-extra", "g0400ae5-851a-dec2-89fa-c84c77222028"]) {
      const result = databaseIdSchema.safeParse(id);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues[0].message).toBe("Invalid record ID.");
    }
  });
});
