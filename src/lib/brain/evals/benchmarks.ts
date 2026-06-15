import type { BrainTaskType } from "@/lib/brain/agents";
import {
  normalizeEvalDataset,
  normalizeEvalExample,
  type EvalDataset,
  type EvalExample,
} from "@/lib/brain/evals/types";

type SeedDataset = {
  id: string;
  name: string;
  description: string;
  targetAgent: BrainTaskType;
  expectedOutputSummary: string;
};

const seedDatasets: SeedDataset[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Course Package Generation",
    description: "Complete DG Academy package output with practical business training assets.",
    targetAgent: "course_package",
    expectedOutputSummary: "Syllabus, proposal, deck, workbook, follow-up, commercial language, and checklist.",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Proposal Generation",
    description: "Client-ready proposal language for corporate training buyers.",
    targetAgent: "proposal",
    expectedOutputSummary: "Executive summary, business need, approach, outcomes, and next steps.",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Pricing Narrative",
    description: "Client-facing commercial proposal text using deterministic pricing only.",
    targetAgent: "pricing_narrative",
    expectedOutputSummary: "Investment, inclusions, exclusions, terms, validity, and next steps.",
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    name: "Slide Outline",
    description: "Executive slide deck outline with agenda and facilitator-ready sections.",
    targetAgent: "slide_outline",
    expectedOutputSummary: "Title, agenda, major sections, exercises, and closing action plan.",
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    name: "Workbook Generation",
    description: "Participant workbook activities for practical training transfer.",
    targetAgent: "workbook",
    expectedOutputSummary: "Reflection prompts, templates, exercises, and 30-day action plan.",
  },
  {
    id: "66666666-6666-4666-8666-666666666666",
    name: "QA Review",
    description: "Structured quality review for client readiness and risk detection.",
    targetAgent: "qa_review",
    expectedOutputSummary: "Score, strengths, weaknesses, missing sections, risks, improvements, and readiness.",
  },
  {
    id: "77777777-7777-4777-8777-777777777777",
    name: "Follow-up Email",
    description: "Sales follow-up drafts that never claim to send externally.",
    targetAgent: "follow_up",
    expectedOutputSummary: "Follow-up email, short message, and suggested next step.",
  },
  {
    id: "88888888-8888-4888-8888-888888888888",
    name: "Delivery Report",
    description: "Post-training delivery report draft from evaluation and delivery notes.",
    targetAgent: "delivery_report",
    expectedOutputSummary: "Overview, objectives, delivery summary, evaluation results, feedback, recommendations.",
  },
];

const personas = [
  {
    tag: "SME workshop",
    courseTitle: "AI Skills for SME Managers",
    audience: "SME owners and operations managers",
    duration: "1 day",
    client: "Cambodia SME market",
    promise: "Help managers identify practical AI use cases and a 30-day implementation plan.",
    context: "Retail, services, and back-office workflow examples in Cambodia.",
    tone: "Practical, encouraging, and business-focused",
  },
  {
    tag: "Corporate in-house training",
    courseTitle: "AI Workflow Productivity for Bank Teams",
    audience: "Department managers and team leads",
    duration: "2 days",
    client: "Cambodian bank",
    promise: "Build safe AI workflows that improve productivity without losing governance control.",
    context: "Banking operations, customer service, risk review, and internal reporting.",
    tone: "Executive, careful, and implementation-oriented",
  },
  {
    tag: "Executive masterclass",
    courseTitle: "Executive AI Governance Masterclass",
    audience: "C-suite and senior directors",
    duration: "Half-day",
    client: "Cambodia corporate leadership market",
    promise: "Give executives a clear AI governance and investment decision framework.",
    context: "Board-level AI readiness, policy decisions, risk appetite, and capability roadmap.",
    tone: "Strategic, concise, and board-ready",
  },
];

const exampleIds = [
  "aaaaaaaa-0001-4000-8000-000000000001",
  "aaaaaaaa-0002-4000-8000-000000000002",
  "aaaaaaaa-0003-4000-8000-000000000003",
  "bbbbbbbb-0001-4000-8000-000000000001",
  "bbbbbbbb-0002-4000-8000-000000000002",
  "bbbbbbbb-0003-4000-8000-000000000003",
  "cccccccc-0001-4000-8000-000000000001",
  "cccccccc-0002-4000-8000-000000000002",
  "cccccccc-0003-4000-8000-000000000003",
  "dddddddd-0001-4000-8000-000000000001",
  "dddddddd-0002-4000-8000-000000000002",
  "dddddddd-0003-4000-8000-000000000003",
  "eeeeeeee-0001-4000-8000-000000000001",
  "eeeeeeee-0002-4000-8000-000000000002",
  "eeeeeeee-0003-4000-8000-000000000003",
  "ffffffff-0001-4000-8000-000000000001",
  "ffffffff-0002-4000-8000-000000000002",
  "ffffffff-0003-4000-8000-000000000003",
  "99999999-0001-4000-8000-000000000001",
  "99999999-0002-4000-8000-000000000002",
  "99999999-0003-4000-8000-000000000003",
  "abababab-0001-4000-8000-000000000001",
  "abababab-0002-4000-8000-000000000002",
  "abababab-0003-4000-8000-000000000003",
];

function inputForTask(targetAgent: BrainTaskType, persona: (typeof personas)[number]) {
  if (targetAgent === "qa_review") {
    return {
      packageContent: [
        "# Syllabus",
        persona.promise,
        "# Proposal",
        persona.context,
        "# Workbook",
        "Participants complete a workflow mapping exercise.",
        "# Pricing",
        "Client-facing investment summary only.",
        "# Follow-up",
        "Draft next-step email.",
      ].join("\n"),
      client: persona.client,
      audience: persona.audience,
      context: persona.context,
    };
  }

  if (targetAgent === "delivery_report") {
    return {
      project: {
        id: `delivery-${persona.tag.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        title: persona.courseTitle,
        deliveryStatus: "Delivered",
        trainingDate: "2026-05-20",
        location: "Phnom Penh",
        trainerName: "DG Academy Trainer",
        participantCount: persona.tag === "Executive masterclass" ? 12 : 25,
        notes: persona.context,
        evaluation: {
          averageSatisfactionScore: 4.4,
          keyComments: "Practical and relevant examples.",
          improvementSuggestions: "Add more sector-specific practice time.",
          trainerReflection: "Participants were engaged and asked implementation questions.",
          clientFeedback: "Client wants a follow-up implementation session.",
          learnerFeedback: "Useful for immediate workplace application.",
        },
        postTrainingReport: "",
        createdAt: "2026-05-20T00:00:00.000Z",
        updatedAt: "2026-05-20T00:00:00.000Z",
      },
    };
  }

  if (targetAgent === "follow_up") {
    return {
      clientName: persona.client,
      status: "Proposal Sent",
      trainingNeed: persona.promise,
      lastNotes: persona.context,
      nextFollowUpDate: "2026-05-12",
    };
  }

  return persona;
}

function rubricFor(dataset: SeedDataset) {
  return {
    passScore: 72,
    criteria: [
      "DG Academy context is clear",
      "Client or learner context is reflected",
      "Output is structured and practical",
      "Risks and unsupported claims are avoided",
      "Internal pricing or margin details are protected",
    ],
    expectedOutputSummary: dataset.expectedOutputSummary,
  };
}

export function createSeedEvalData(): {
  datasets: EvalDataset[];
  examples: EvalExample[];
} {
  const datasets = seedDatasets.map((dataset) =>
    normalizeEvalDataset({
      id: dataset.id,
      name: dataset.name,
      description: dataset.description,
      targetAgent: dataset.targetAgent,
      status: "Active",
      createdAt: "2026-05-05T00:00:00.000Z",
      updatedAt: "2026-05-05T00:00:00.000Z",
    }),
  );
  const examples = seedDatasets.flatMap((dataset, datasetIndex) =>
    personas.map((persona, index) =>
      normalizeEvalExample({
        id: exampleIds[datasetIndex * personas.length + index],
        datasetId: dataset.id,
        input: inputForTask(dataset.targetAgent, persona),
        expectedOutputSummary: `${dataset.expectedOutputSummary} Scenario: ${persona.tag}.`,
        rubric: rubricFor(dataset),
        tags: [persona.tag, dataset.targetAgent],
        createdAt: "2026-05-05T00:00:00.000Z",
        updatedAt: "2026-05-05T00:00:00.000Z",
      }),
    ),
  );

  return { datasets, examples };
}
