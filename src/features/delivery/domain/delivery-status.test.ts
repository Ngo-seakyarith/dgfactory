import { describe, expect, test } from "bun:test";

import {
  createEmptyDeliveryProject,
  deliveryStatuses,
  normalizeDeliveryProject,
} from "./delivery";

describe("delivery progress", () => {
  test("starts after the sale with its own statuses", () => {
    expect(deliveryStatuses).toEqual(["Not Started", "Prepared", "Delivered"]);
    expect(createEmptyDeliveryProject().deliveryStatus).toBe("Not Started");
  });

  test("preserves valid progress and rejects pipeline stages", () => {
    expect(normalizeDeliveryProject({ deliveryStatus: "Prepared" }).deliveryStatus).toBe("Prepared");
    expect(normalizeDeliveryProject({ deliveryStatus: "Won" as never }).deliveryStatus).toBe("Not Started");
  });
});
