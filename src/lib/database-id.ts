import { z } from "zod";

// Imported PostgreSQL UUIDs can have non-RFC version or variant bits.
export const databaseIdSchema = z.guid("Invalid record ID.");
