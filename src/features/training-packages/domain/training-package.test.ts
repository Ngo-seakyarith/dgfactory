import { describe, expect, test } from "bun:test";

import { emptyProposalBrief } from "./proposal-brief";
import { validateTrainingInput } from "./training-package";

const completeBrief = {
  ...emptyProposalBrief,
  certificationLabel: "DG Academy Professional Training",
  coverSubtitle: "Practical capability development for the client team",
  clientBackground: "The client is preparing its team for a new operating priority.",
  trainingNeed: "The team needs consistent knowledge and practical application skills.",
  expectedLearningOutcomes: "Apply the core workflow accurately in daily work.",
  contentPriorities: "Foundations\nGuided practice\nAction planning",
  scheduleDate: "20 September 2026",
  scheduleTime: "8:30 AM-5:00 PM",
  scheduleVenue: "Client office",
  trainerId: "trainer-1",
  acceptanceDeadline: "One week before training",
  proposalDate: "10 September 2026",
};

const completeInput = {
  courseTitle: "Practical Team Capability",
  audience: "Managers and operational staff",
  duration: "1 day",
  client: "Example Client",
  context: "Use local examples and avoid confidential information.",
  tone: "Executive, practical, clear",
  proposalBrief: completeBrief,
};

describe("validateTrainingInput", () => {
  test("accepts a complete brief without a program goal", () => {
    expect(() => validateTrainingInput(completeInput)).not.toThrow();
  });

  test("requires expected learning outcomes", () => {
    expect(() =>
      validateTrainingInput({
        ...completeInput,
        proposalBrief: { ...completeBrief, expectedLearningOutcomes: "" },
      }),
    ).toThrow("expected learning outcomes");
  });
});
