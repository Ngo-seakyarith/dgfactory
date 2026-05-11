import type { OutputEvaluationType } from "@/lib/evaluations";

export type EvaluationRubric = {
  key: string;
  title: string;
  criteria: string[];
  warningSigns: string[];
};

export const evaluationRubrics: Record<string, EvaluationRubric> = {
  proposal: {
    key: "proposal",
    title: "Client Proposal Rubric",
    criteria: [
      "Clear executive summary and business need",
      "Specific outcomes connected to the client context",
      "Practical DG Academy delivery approach",
      "Commercially careful language without unsupported guarantees",
      "Clear next step for the buyer",
    ],
    warningSigns: [
      "Generic proposal language",
      "Missing buyer problem",
      "Overpromising business results",
      "No decision or next-step path",
    ],
  },
  syllabus: {
    key: "syllabus",
    title: "Syllabus Rubric",
    criteria: [
      "Timed module flow matches the duration",
      "Learning outcomes are practical and measurable",
      "Examples fit the audience and sector",
      "Activities move participants toward workplace application",
      "Facilitator can deliver from the structure",
    ],
    warningSigns: [
      "Unclear timing",
      "Too much theory",
      "No applied exercises",
      "Audience mismatch",
    ],
  },
  deck: {
    key: "deck",
    title: "Slide Outline Rubric",
    criteria: [
      "Executive story has a logical flow",
      "Agenda and major sections are visible",
      "One idea per slide or section",
      "Facilitator cues are clear enough for slide production",
      "Examples and activities are easy to turn into slides",
    ],
    warningSigns: [
      "Slide titles are vague",
      "No agenda or close",
      "Too much content per slide",
      "Missing speaker guidance",
    ],
  },
  workbook: {
    key: "workbook",
    title: "Workbook Rubric",
    criteria: [
      "Exercises are usable by participants during the session",
      "Prompts connect to real business workflows",
      "Templates capture decisions, owners, risks, and next actions",
      "Activities match the learner level",
      "Workbook supports follow-up after training",
    ],
    warningSigns: [
      "Reflection-only workbook",
      "No templates",
      "No action plan",
      "Exercises are not tied to the program promise",
    ],
  },
  commercial_proposal: {
    key: "commercial_proposal",
    title: "Commercial Proposal Rubric",
    criteria: [
      "Client-facing investment language is clear",
      "Numbers reflect deterministic pricing outputs only",
      "Included and excluded items are separated",
      "Payment terms and validity placeholders are visible",
      "Internal margin details are not exposed",
    ],
    warningSigns: [
      "Invented pricing numbers",
      "Internal cost or margin language",
      "Missing payment terms",
      "Ambiguous inclusions",
    ],
  },
  delivery_report: {
    key: "delivery_report",
    title: "Post-Training Report Rubric",
    criteria: [
      "Program overview and participant count are clear",
      "Evaluation evidence is presented honestly",
      "Feedback, recommendations, and next opportunities are practical",
      "Report separates facts from interpretation",
      "Client-ready tone is professional and concise",
    ],
    warningSigns: [
      "Invented evaluation evidence",
      "No recommendations",
      "No next opportunity path",
      "Too much internal delivery detail",
    ],
  },
};

export function getRubricForOutputType(outputType: OutputEvaluationType) {
  if (outputType === "follow_up_email" || outputType === "full_package") {
    return {
      key: outputType,
      title:
        outputType === "follow_up_email"
          ? "Follow-Up Email Rubric"
          : "Full Package Rubric",
      criteria: [
        "Clear purpose and next step",
        "Client-specific and practical language",
        "No internal-only margin or confidential notes",
        "Professional DG Academy tone",
        "Consistent with the package promise and audience",
      ],
      warningSigns: [
        "Generic message",
        "Missing next step",
        "Internal notes exposed",
        "Mismatch with client context",
      ],
    };
  }

  return evaluationRubrics[outputType] ?? evaluationRubrics.proposal;
}
