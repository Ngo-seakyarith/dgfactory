import type { TrainingPackageInput } from "@/features/training-packages";
import type { ProposalNarrativeBrief } from "@/features/training-packages";
import {
  solutionReviewOutputSchema,
  deliveryDraftOutputSchema,
  evaluationQuestionsOutputSchema,
  facilitatorGuideOutputSchema,
  followUpOutputSchema,
  digitalSolutionProposalOutputSchema,
  promptLibraryOutputSchema,
  syllabusProposalOutputSchema,
  slideDeckOutputSchema,
  trainingPackageOutputSchema,
  workbookOutputSchema,
  type BrainOutputSchema,
  type CoursePackageBrainOutput,
  type EvaluationQuestionsBrainOutput,
  type JsonSchema,
} from "@/lib/brain/schemas";
import { dgProposalTemplateGuide } from "@/lib/brain/prompts/proposalTemplateGuide";
import {
  slideDeckGenerationRules,
  type SlideDeckBrainOutput,
} from "@/features/training-packages/export/slide-deck-plan";
import {
  facilitatorGuideGenerationRules,
  promptLibraryGenerationRules,
  workbookGenerationRules,
  type FacilitatorGuideBrainOutput,
  type PromptLibraryBrainOutput,
  type WorkbookBrainOutput,
} from "@/features/training-packages/export/material-document-plans";
import type {
  DigitalSolutionProposalBrainInput,
  DigitalSolutionProposalBrainOutput,
  SolutionReviewBrainInput,
  SolutionReviewBrainOutput,
} from "@/features/digital-solution-proposals";
import type {
  SyllabusProposalBrainInput,
  SyllabusProposalBrainOutput,
} from "@/features/syllabus-imports";

export const brainTaskTypes = [
  "course_package",
  "slide_outline",
  "workbook",
  "follow_up",
  "delivery_report",
  "evaluation_questions",
  "facilitator_guide",
  "prompt_library",
  "solution_review",
  "digital_solution_proposal",
  "syllabus_to_training_proposal",
] as const;

export type BrainTaskType = (typeof brainTaskTypes)[number];

export type BrainMode = "openai";

export type BrainAgentDefinition<TInput = unknown, TOutput = unknown> = {
  taskType: BrainTaskType;
  name: string;
  role: string;
  instructions: string;
  inputSchema: JsonSchema;
  outputSchema: BrainOutputSchema<TOutput>;
};

export type CoursePackageBrainInput = Omit<
  TrainingPackageInput,
  "proposalBrief"
> & {
  proposalBrief: ProposalNarrativeBrief;
};

export type ProposalAgentOutput = CoursePackageBrainOutput;

export type { EvaluationQuestionsBrainOutput };

export type {
  DigitalSolutionProposalBrainInput,
  DigitalSolutionProposalBrainOutput,
  SolutionReviewBrainInput,
  SolutionReviewBrainOutput,
};

export type { SyllabusProposalBrainInput, SyllabusProposalBrainOutput };

const genericInputSchema: JsonSchema = {
  type: "object",
  properties: {},
};

const coursePackageInputSchema: JsonSchema = {
  type: "object",
  required: ["courseTitle", "audience", "duration", "client", "context", "tone", "proposalBrief"],
  properties: {
    courseTitle: { type: "string" },
    audience: { type: "string" },
    duration: { type: "string" },
    client: { type: "string" },
    context: { type: "string" },
    tone: { type: "string" },
    proposalBrief: {
      type: "object",
      required: [
        "clientBackground",
        "trainingNeed",
        "expectedLearningOutcomes",
        "contentPriorities",
        "methodology",
        "trainingTools",
        "evaluationApproach",
      ],
      properties: {
        clientBackground: { type: "string" },
        trainingNeed: { type: "string" },
        expectedLearningOutcomes: { type: "string" },
        contentPriorities: { type: "string" },
        methodology: { type: "string" },
        trainingTools: { type: "string" },
        evaluationApproach: { type: "string" },
      },
    },
  },
};

export const courseArchitectAgent: BrainAgentDefinition<
  CoursePackageBrainInput,
  ProposalAgentOutput
> = {
  taskType: "course_package",
  name: "courseArchitectAgent",
  role: "Senior training product architect",
  instructions: [
    "Create the structured narrative sections for a DG Academy training proposal.",
    "Never generate trainer profiles, pricing, commercial terms, schedule facts, or signatory data.",
    "Make the training content complete, timed, and client-ready using the DG Academy proposal template.",
    "Application code combines proposalNarrative with deterministic proposal data and derives the proposal and syllabus previews.",
    dgProposalTemplateGuide,
  ].join("\n\n"),
  inputSchema: coursePackageInputSchema,
  outputSchema: trainingPackageOutputSchema,
};

export const solutionReviewAgent: BrainAgentDefinition<
  SolutionReviewBrainInput,
  SolutionReviewBrainOutput
> = {
  taskType: "solution_review",
  name: "solutionReviewAgent",
  role: "Senior business analyst and intelligent systems consultant",
  instructions: [
    "Review the supplied client brief and recommend an appropriate intelligent system for the stated business problem.",
    "The brief is the primary source. Spreadsheet evidence is optional and may be null.",
    "When evidenceAnalysis is null, set evidenceBasis to Brief only and leave evidenceFindings empty. Never imply that files or raw data were reviewed.",
    "When evidenceAnalysis is present, use only its deterministic profiles and masked samples. Never reconstruct redacted values or invent metrics.",
    "Separate confirmed requirements, evidence, assumptions, risks, and unanswered client questions. Mark each recommended capability as Brief, Evidence, or Assumption.",
    "Cover users, workflows, interfaces, administration, integrations, security, delivery constraints, and success measures that are relevant to the selected solution type.",
    "Keep the result concrete and editable so a consultant can correct it before proposal generation.",
  ].join("\n\n"),
  inputSchema: { type: "object" },
  outputSchema: solutionReviewOutputSchema,
};

export const digitalSolutionProposalAgent: BrainAgentDefinition<
  DigitalSolutionProposalBrainInput,
  DigitalSolutionProposalBrainOutput
> = {
  taskType: "digital_solution_proposal",
  name: "digitalSolutionProposalAgent",
  role: "Intelligent systems architect and client proposal writer",
  instructions: [
    "Create a concise, client-ready DG Academy proposal from the supplied project brief and approved solution review.",
    "Synthesize the information into a practical recommendation instead of copying or restating the input.",
    "Use paragraph blocks for explanation, bullet lists for genuinely parallel items, numbered lists for ordered steps, capability blocks for proposed scope, and phase blocks for implementation work.",
    "Always include an executive summary, client situation, project objectives, recommended solution, implementation approach, deliverables, and next steps. Include other sections only when they add useful project-specific information.",
    "Recommend only what the client situation supports. Do not force artificial intelligence, dashboards, integrations, automation, or complex architecture into a project that does not need them.",
    "Separate confirmed facts from assumptions and unresolved risks. Do not invent client facts, prices, deadlines, integrations, performance claims, or technical requirements.",
    "Do not repeat the same fact or recommendation across sections. Choose the amount of detail appropriate to the project rather than targeting a fixed module count, phase count, or page count.",
    "Commercial terms, branding, cover details, and signatory information are added by deterministic code and must not appear in the generated sections.",
  ].join("\n\n"),
  inputSchema: { type: "object" },
  outputSchema: digitalSolutionProposalOutputSchema,
};

export const syllabusProposalAgent: BrainAgentDefinition<
  SyllabusProposalBrainInput,
  SyllabusProposalBrainOutput
> = {
  taskType: "syllabus_to_training_proposal",
  name: "syllabusProposalAgent",
  role: "External syllabus normalization and DG Academy proposal specialist",
  instructions: [
    "Normalize the complete external syllabus into the DG Academy proposal schema. Preserve its meaning, topic sequence, schedule, and level of detail.",
    "Client rule: return the organization receiving the training as clientName. New clients are valid. Return null only when the recipient is not present in the document.",
    "Trainer rule: return only people explicitly acting as trainers or facilitators. A name in a contact, acknowledgement, header, or footer is not enough. Match names against approvedTrainerNames when possible.",
    "Evidence rules: Derive learning outcomes from documented course content when they are not explicitly labeled. Do not invent identities, certifications, dates, venues, prices, commercial terms, or factual claims. Use empty strings, empty arrays, or null where the schema permits when evidence is absent.",
    "For table-based schedules, encode each session as `Session N | detail; detail` in contentOutlines so the deterministic DOCX renderer preserves the session hierarchy.",
    "Use professional connective language where needed, but do not add unsupported client facts or outcomes.",
    "Never return trainer biographies, pricing, signatory information, bank details, phone numbers, or email addresses.",
  ].join("\n\n"),
  inputSchema: { type: "object" },
  outputSchema: syllabusProposalOutputSchema,
};

export const slideAgent: BrainAgentDefinition<
  Record<string, unknown>,
  SlideDeckBrainOutput
> = {
  taskType: "slide_outline",
  name: "slideAgent",
  role: "Executive slide deck architect",
  instructions: [
    "Create a complete, presentation-ready slide plan for the supplied DG Academy training session. The exporter renders your structured plan directly, so choose a layout that matches the content of every slide.",
    ...slideDeckGenerationRules,
    "Let the supplied subject and learning brief determine the narrative. Do not force a generic AI, leadership, sales, finance, or other preset storyline onto the course.",
    "Ground every slide in the supplied training package and delivery context. Do not invent client facts, statistics, outcomes, tools, policies, or access that were not supplied. You may develop generally valid subject knowledge, explanations, examples, frameworks, and exercises needed to teach the requested topic well.",
  ].join("\n\n"),
  inputSchema: genericInputSchema,
  outputSchema: slideDeckOutputSchema,
};

export const workbookAgent: BrainAgentDefinition<
  Record<string, unknown>,
  WorkbookBrainOutput
> = {
  taskType: "workbook",
  name: "workbookAgent",
  role: "Participant workbook designer",
  instructions: [
    "Create a complete participant workbook for the supplied DG Academy training.",
    ...workbookGenerationRules,
  ].join("\n\n"),
  inputSchema: genericInputSchema,
  outputSchema: workbookOutputSchema,
};

export const salesFollowUpAgent: BrainAgentDefinition = {
  taskType: "follow_up",
  name: "salesFollowUpAgent",
  role: "Corporate training sales follow-up assistant",
  instructions:
    "Draft follow-up email and short message text only. Never imply a message has been sent.",
  inputSchema: genericInputSchema,
  outputSchema: followUpOutputSchema,
};

export const deliveryAgent: BrainAgentDefinition = {
  taskType: "delivery_report",
  name: "deliveryAgent",
  role: "Post-training reporting assistant",
  instructions:
    "Draft a concise client-ready post-training report from the supplied delivery record. Separate recorded evidence from recommendations, and never invent attendance, outcomes, feedback, or evaluation evidence.",
  inputSchema: genericInputSchema,
  outputSchema: deliveryDraftOutputSchema,
};

export type EvaluationQuestionsBrainInput = {
  purpose: "pre_training_assessment" | "post_training_evaluation";
  source: string;
  courseTitle: string;
  client: string;
  audience: string;
  duration: string;
  businessContext: string;
  clientBackground: string;
  trainingNeed: string;
  outcomes: string[];
  contentPriorities: string[];
  methodology: string[];
  trainingTools: string[];
  evaluationApproach: string;
};

export const evaluationQuestionsAgent: BrainAgentDefinition<
  EvaluationQuestionsBrainInput,
  EvaluationQuestionsBrainOutput
> = {
  taskType: "evaluation_questions",
  name: "evaluationQuestionsAgent",
  role: "Training survey form designer",
  instructions:
    "Design a short participant survey for the supplied DG Academy training, following the purpose field. When purpose is post_training_evaluation: generate 8 to 12 questions measuring the completed session - rating questions on a 1-5 scale covering content relevance, trainer effectiveness, pace, materials, and practical applicability; 1 or 2 single-choice questions; and open-text questions about the most valuable parts, suggested improvements, and how participants plan to apply what they learned. When purpose is pre_training_assessment: generate 8 to 12 questions that measure the participant's starting point before the session - current skill and confidence level with the course topic, familiarity with the specific tools and workflows the course covers, how their daily work relates to the topic, single-choice questions about role context and experience level, and open-text questions about their biggest challenges and what they most want to get from the training, so the trainer can tailor the session. In both cases: ground every question in the supplied course context and objectives; rating and choice questions must be specific to the training topic, not generic. For every question set the required boolean yourself and produce a deliberate mix: mark required=true only for the questions genuinely essential to the survey purpose, and required=false for everything a busy participant may reasonably skip. Never mark all questions of a type required - judge each question on its own importance so the form stays quick to finish. Fill options for single-choice questions and return an empty options array for rating or text questions. Never ask for confidential business information or personal data.",
  inputSchema: genericInputSchema,
  outputSchema: evaluationQuestionsOutputSchema,
};

export const facilitatorGuideAgent: BrainAgentDefinition<
  Record<string, unknown>,
  FacilitatorGuideBrainOutput
> = {
  taskType: "facilitator_guide",
  name: "facilitatorGuideAgent",
  role: "Trainer facilitation guide designer",
  instructions: [
    "Create a complete trainer-facing facilitator guide for the supplied DG Academy training.",
    ...facilitatorGuideGenerationRules,
  ].join("\n\n"),
  inputSchema: genericInputSchema,
  outputSchema: facilitatorGuideOutputSchema,
};

export const promptLibraryAgent: BrainAgentDefinition<
  Record<string, unknown>,
  PromptLibraryBrainOutput
> = {
  taskType: "prompt_library",
  name: "promptLibraryAgent",
  role: "AI prompt library curator for training participants",
  instructions: [
    "Create a complete ready-to-use AI prompt library for participants in the supplied DG Academy training.",
    ...promptLibraryGenerationRules,
  ].join("\n\n"),
  inputSchema: genericInputSchema,
  outputSchema: promptLibraryOutputSchema,
};

export const brainAgents = [
  courseArchitectAgent,
  solutionReviewAgent,
  digitalSolutionProposalAgent,
  syllabusProposalAgent,
  slideAgent,
  workbookAgent,
  salesFollowUpAgent,
  deliveryAgent,
  evaluationQuestionsAgent,
  facilitatorGuideAgent,
  promptLibraryAgent,
];
