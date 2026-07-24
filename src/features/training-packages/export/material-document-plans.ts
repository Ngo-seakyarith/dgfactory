type PlanVersion = 1;

export type WorkbookActivity = {
  title: string;
  purpose: string;
  instructions: string[];
  reflectionQuestions: string[];
  expectedOutput: string;
  responseLines: number;
};

export type WorkbookModule = {
  title: string;
  introduction: string;
  keyPoints: string[];
  activities: WorkbookActivity[];
  applicationPrompt: string;
};

export type WorkbookPlan = {
  version: PlanVersion;
  title: string;
  welcome: string;
  howToUse: string[];
  modules: WorkbookModule[];
  actionPlan: {
    introduction: string;
    prompts: string[];
    responseLines: number;
  };
};

export type FacilitatorAgendaItem = {
  timing: string;
  duration: string;
  session: string;
  objective: string;
  method: string;
};

export type FacilitatorSection = {
  title: string;
  timing: string;
  objective: string;
  keyMessages: string[];
  runSteps: string[];
  debriefQuestions: string[];
  expectedOutputs: string[];
  transition: string;
};

export type FacilitatorGuidePlan = {
  version: PlanVersion;
  title: string;
  purpose: string;
  trainerPreparation: string[];
  agenda: FacilitatorAgendaItem[];
  sections: FacilitatorSection[];
  materialsChecklist: string[];
  likelyQuestions: Array<{ question: string; answer: string }>;
  contingencies: Array<{ situation: string; response: string }>;
  closingChecklist: string[];
};

export type PromptLibraryEntry = {
  title: string;
  whenToUse: string;
  prompt: string;
  adaptationTips: string[];
  reviewChecks: string[];
};

export type PromptLibrarySection = {
  title: string;
  description: string;
  prompts: PromptLibraryEntry[];
};

export type PromptLibraryPlan = {
  version: PlanVersion;
  title: string;
  introduction: string;
  usageGuidance: string[];
  sections: PromptLibrarySection[];
  responsibleUseChecks: string[];
};

export type WorkbookBrainOutput = { workbook: WorkbookPlan };
export type FacilitatorGuideBrainOutput = { guide: FacilitatorGuidePlan };
export type PromptLibraryBrainOutput = { library: PromptLibraryPlan };

export const workbookGenerationRules = [
  "Return a structured participant workbook, not Markdown. Follow the supplied course topic, audience, duration, objectives, outcomes, and content priorities; never default to AI when the requested subject is leadership, sales, finance, soft skills, operations, or another topic.",
  "Create enough modules and activities for a useful 6 to 10 page workbook. Each module should explain the learning focus, reinforce practical key points, and include one or more activities that produce a concrete participant output.",
  "Activities must include a purpose, clear sequential instructions, reflection questions, an expected output, and 3 to 8 response lines. Include reusable workplace templates or planning exercises when suitable for the subject.",
  "Finish with a practical action plan connected to the course outcomes. Do not invent client facts, policies, tools, or commitments that were not supplied.",
] as const;

export const facilitatorGuideGenerationRules = [
  "Return a structured trainer-facing facilitator guide, not Markdown. Follow the supplied course topic, audience, duration, objectives, outcomes, methodology, and content priorities; never default to AI when another subject was requested.",
  "Create a realistic timed agenda and detailed run sheets that help a trainer deliver the session. Make the timing internally coherent with the supplied duration and include breaks only when appropriate.",
  "For every section provide the objective, substantive key messages, sequential facilitation steps, debrief questions, expected participant outputs, and a transition. Include preparation, materials, likely participant questions with strong answers, contingencies, and a closing checklist.",
  "Develop generally valid subject knowledge needed to facilitate the requested course, but do not invent client facts, attendance, policies, tools, facilities, or confirmed arrangements.",
] as const;

export const promptLibraryGenerationRules = [
  "Return a structured participant prompt library, not Markdown. Generate it only around the supplied course topic, audience, workflows, objectives, and outcomes.",
  "Create 15 to 25 complete copy-ready prompts grouped by practical workflow. Each entry must include a descriptive title, when to use it, the full prompt with editable placeholders in [square brackets], adaptation tips, and output review checks.",
  "Prompts must be substantial enough to use directly, specify role, task, context, constraints, and output format where relevant, and never invent client-specific facts.",
  "Include practical responsible-use checks for confidentiality, factual verification, human review, and organizational policy. Do not ask participants to paste sensitive information into an AI system.",
] as const;

const MARKERS = {
  workbook: "dg-workbook:",
  guide: "dg-facilitator-guide:",
  library: "dg-prompt-library:",
} as const;

function cleanText(value: unknown, maxLength = 1200) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanMultiline(value: unknown, maxLength = 4000) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

function cleanItems(value: unknown, maximum: number, maxLength = 600) {
  return Array.isArray(value)
    ? value.map((item) => cleanText(item, maxLength)).filter(Boolean).slice(0, maximum)
    : [];
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function lineCount(value: unknown, fallback = 4) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(3, Math.min(8, Math.round(number))) : fallback;
}

export function normalizeWorkbookPlan(value: unknown): WorkbookPlan {
  const input = objectValue(value);
  const modules = Array.isArray(input.modules)
    ? input.modules.slice(0, 12).map((rawModule) => {
        const moduleInput = objectValue(rawModule);
        const activities = Array.isArray(moduleInput.activities)
          ? moduleInput.activities.slice(0, 4).map((rawActivity) => {
              const activity = objectValue(rawActivity);
              return {
                title: cleanText(activity.title, 140) || "Participant activity",
                purpose: cleanText(activity.purpose),
                instructions: cleanItems(activity.instructions, 8),
                reflectionQuestions: cleanItems(activity.reflectionQuestions, 8),
                expectedOutput: cleanText(activity.expectedOutput),
                responseLines: lineCount(activity.responseLines),
              };
            })
          : [];
        return {
          title: cleanText(moduleInput.title, 140) || "Learning module",
          introduction: cleanText(moduleInput.introduction, 1600),
          keyPoints: cleanItems(moduleInput.keyPoints, 8),
          activities,
          applicationPrompt: cleanText(moduleInput.applicationPrompt),
        };
      })
    : [];
  const actionPlan = objectValue(input.actionPlan);

  return {
    version: 1,
    title: cleanText(input.title, 160) || "Participant Workbook",
    welcome: cleanText(input.welcome, 1800),
    howToUse: cleanItems(input.howToUse, 8),
    modules,
    actionPlan: {
      introduction: cleanText(actionPlan.introduction, 1200),
      prompts: cleanItems(actionPlan.prompts, 8),
      responseLines: lineCount(actionPlan.responseLines, 6),
    },
  };
}

export function normalizeFacilitatorGuidePlan(value: unknown): FacilitatorGuidePlan {
  const input = objectValue(value);
  return {
    version: 1,
    title: cleanText(input.title, 160) || "Facilitator Guide",
    purpose: cleanText(input.purpose, 1800),
    trainerPreparation: cleanItems(input.trainerPreparation, 12),
    agenda: Array.isArray(input.agenda)
      ? input.agenda.slice(0, 24).map((raw) => {
          const item = objectValue(raw);
          return {
            timing: cleanText(item.timing, 40),
            duration: cleanText(item.duration, 40),
            session: cleanText(item.session, 160),
            objective: cleanText(item.objective, 500),
            method: cleanText(item.method, 120),
          };
        })
      : [],
    sections: Array.isArray(input.sections)
      ? input.sections.slice(0, 20).map((raw) => {
          const section = objectValue(raw);
          return {
            title: cleanText(section.title, 160) || "Session section",
            timing: cleanText(section.timing, 80),
            objective: cleanText(section.objective, 800),
            keyMessages: cleanItems(section.keyMessages, 10),
            runSteps: cleanItems(section.runSteps, 12),
            debriefQuestions: cleanItems(section.debriefQuestions, 8),
            expectedOutputs: cleanItems(section.expectedOutputs, 8),
            transition: cleanText(section.transition, 800),
          };
        })
      : [],
    materialsChecklist: cleanItems(input.materialsChecklist, 20),
    likelyQuestions: Array.isArray(input.likelyQuestions)
      ? input.likelyQuestions.slice(0, 12).map((raw) => {
          const item = objectValue(raw);
          return {
            question: cleanText(item.question, 600),
            answer: cleanText(item.answer, 1600),
          };
        })
      : [],
    contingencies: Array.isArray(input.contingencies)
      ? input.contingencies.slice(0, 12).map((raw) => {
          const item = objectValue(raw);
          return {
            situation: cleanText(item.situation, 400),
            response: cleanText(item.response, 1400),
          };
        })
      : [],
    closingChecklist: cleanItems(input.closingChecklist, 12),
  };
}

export function normalizePromptLibraryPlan(value: unknown): PromptLibraryPlan {
  const input = objectValue(value);
  return {
    version: 1,
    title: cleanText(input.title, 160) || "Participant Prompt Library",
    introduction: cleanText(input.introduction, 1800),
    usageGuidance: cleanItems(input.usageGuidance, 10),
    sections: Array.isArray(input.sections)
      ? input.sections.slice(0, 10).map((rawSection) => {
          const section = objectValue(rawSection);
          return {
            title: cleanText(section.title, 140) || "Workflow prompts",
            description: cleanText(section.description, 1000),
            prompts: Array.isArray(section.prompts)
              ? section.prompts.slice(0, 10).map((rawPrompt) => {
                  const prompt = objectValue(rawPrompt);
                  return {
                    title: cleanText(prompt.title, 140) || "Reusable prompt",
                    whenToUse: cleanText(prompt.whenToUse, 800),
                    prompt: cleanMultiline(prompt.prompt),
                    adaptationTips: cleanItems(prompt.adaptationTips, 6),
                    reviewChecks: cleanItems(prompt.reviewChecks, 6),
                  };
                })
              : [],
          };
        })
      : [],
    responsibleUseChecks: cleanItems(input.responsibleUseChecks, 12),
  };
}

function serialize(marker: string, value: unknown, readable: string) {
  return `<!-- ${marker}${encodeURIComponent(JSON.stringify(value))} -->\n\n${readable}`.trim();
}

function parse<T>(markdown: string, marker: string, normalize: (value: unknown) => T): T | null {
  const firstLine = markdown.split(/\r?\n/, 1)[0]?.trim() ?? "";
  const prefix = `<!-- ${marker}`;
  if (!firstLine.startsWith(prefix) || !firstLine.endsWith(" -->")) return null;
  try {
    return normalize(JSON.parse(decodeURIComponent(firstLine.slice(prefix.length, -4))));
  } catch {
    return null;
  }
}

export function serializeWorkbookPlan(value: unknown) {
  const plan = normalizeWorkbookPlan(value);
  const lines = [`# ${plan.title}`, "", plan.welcome];
  if (plan.howToUse.length) lines.push("", "## How to use this workbook", ...plan.howToUse.map((item) => `- ${item}`));
  plan.modules.forEach((module, moduleIndex) => {
    lines.push("", `## ${moduleIndex + 1}. ${module.title}`, "", module.introduction);
    module.keyPoints.forEach((item) => lines.push(`- ${item}`));
    module.activities.forEach((activity) => {
      lines.push("", `### ${activity.title}`, "", activity.purpose);
      activity.instructions.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
      activity.reflectionQuestions.forEach((item) => lines.push(`- ${item}`));
    });
  });
  lines.push("", "## Action plan", "", plan.actionPlan.introduction);
  plan.actionPlan.prompts.forEach((item) => lines.push(`- ${item}`));
  return serialize(MARKERS.workbook, plan, lines.join("\n"));
}

export function serializeFacilitatorGuidePlan(value: unknown) {
  const plan = normalizeFacilitatorGuidePlan(value);
  const lines = [`# ${plan.title}`, "", plan.purpose, "", "## Session agenda"];
  plan.agenda.forEach((item) => lines.push(`- ${item.timing} (${item.duration}): ${item.session} - ${item.objective}`));
  plan.sections.forEach((section, index) => {
    lines.push("", `## ${index + 1}. ${section.title}`, "", `**Timing:** ${section.timing}`, "", section.objective);
    section.keyMessages.forEach((item) => lines.push(`- ${item}`));
    section.runSteps.forEach((item, step) => lines.push(`${step + 1}. ${item}`));
  });
  return serialize(MARKERS.guide, plan, lines.join("\n"));
}

export function serializePromptLibraryPlan(value: unknown) {
  const plan = normalizePromptLibraryPlan(value);
  const lines = [`# ${plan.title}`, "", plan.introduction];
  plan.sections.forEach((section) => {
    lines.push("", `## ${section.title}`, "", section.description);
    section.prompts.forEach((prompt) => {
      lines.push("", `### ${prompt.title}`, "", `**When to use:** ${prompt.whenToUse}`, "", "```text", prompt.prompt, "```");
    });
  });
  return serialize(MARKERS.library, plan, lines.join("\n"));
}

export const parseWorkbookPlan = (value: string) => parse(value, MARKERS.workbook, normalizeWorkbookPlan);
export const parseFacilitatorGuidePlan = (value: string) => parse(value, MARKERS.guide, normalizeFacilitatorGuidePlan);
export const parsePromptLibraryPlan = (value: string) => parse(value, MARKERS.library, normalizePromptLibraryPlan);
