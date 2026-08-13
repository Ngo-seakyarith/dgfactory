import { describe, expect, test } from "bun:test";

import { normalizeContentOutlineItems } from "./proposal-content-outline";

describe("proposal content outline normalization", () => {
  test("repairs legacy titles and keeps a break without numbering it", () => {
    expect(
      normalizeContentOutlineItems([
        "Session 1 | 45 min; Foundations of AI and LLMs; What is Artificial Intelligence?",
        "Session 2 | 45 min; The LLM Landscape; Overview of major LLMs",
        "Session 3 | 15 min; Short Break",
      ]),
    ).toEqual([
      "Session 1: Foundations of AI and LLMs | Duration: 45 min; What is Artificial Intelligence?",
      "Session 2: The LLM Landscape | Duration: 45 min; Overview of major LLMs",
      "Short Break | 15 min",
    ]);
  });
});
