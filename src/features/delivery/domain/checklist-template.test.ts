import { describe, expect, test } from "bun:test";
import {
  createDefaultDeliveryTasks,
  deliveryTaskCategories,
  normalizeDeliveryTask,
} from "./delivery";

describe("operational training checklist", () => {
  test("creates the workbook groups and independent tasks for each delivery", () => {
    const first = createDefaultDeliveryTasks("delivery-one");
    const second = createDefaultDeliveryTasks("delivery-two");
    expect(first).toHaveLength(41);
    expect([...new Set(first.map((task) => task.category))]).toEqual([...deliveryTaskCategories]);
    expect(first.every((task, index) =>
      task.deliveryProjectId === "delivery-one" &&
      task.sortOrder === index &&
      !task.owner && !task.startDate && !task.dueDate &&
      task.status === "Open" && task.id !== second[index].id,
    )).toBe(true);
    expect(first.filter((task) => task.category === "Training Evaluation").map((task) => task.title))
      .toEqual([
        "Pre-training assessment: design",
        "Pre-training assessment: distribution",
        "Pre-training assessment: share with trainer and employer",
        "Post-training assessment: design",
        "Post-training assessment: distribution",
        "Post-training assessment: share with trainer and employer",
      ]);
  });

  test("retains task assignments, dates, order, and not-applicable status", () => {
    const task = normalizeDeliveryTask({
      title: "Banner printing", category: "Banner and Backdrop",
      owner: "Operations", startDate: "2026-09-10", dueDate: "2026-09-12",
      sortOrder: 24, status: "Not Applicable",
    });
    expect(task).toMatchObject({
      category: "Banner and Backdrop", owner: "Operations",
      startDate: "2026-09-10", dueDate: "2026-09-12",
      sortOrder: 24, status: "Not Applicable",
    });
  });
});
