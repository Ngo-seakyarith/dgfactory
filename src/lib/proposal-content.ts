export type ProposalSchedule = {
  duration: string;
  date: string;
  time: string;
  venue: string;
  participants: string;
};

export type ProposalTrainer = {
  name: string;
  title: string;
  bio: string[];
};

export type ProposalProfessionalFee = {
  included: string[];
  totalFee: string;
  clientResponsibilities: string[];
  billingArrangement: string;
  acceptanceText: string;
};

export type ProposalContent = {
  coverTitle: string;
  courseTitle: string;
  client: string;
  courseOverview: string[];
  courseObjectives: string[];
  expectedLearningOutcomes: string[];
  contentOutlines: string[];
  whoShouldAttend: string[];
  trainingMethodology: string[];
  trainingTools: string[];
  trainingEvaluation: string[];
  schedule: ProposalSchedule;
  trainer: ProposalTrainer;
  professionalFee: ProposalProfessionalFee;
};

type ProposalFallbackMeta = {
  title: string;
  client: string;
  audience: string;
  duration: string;
  promise: string;
};

function cleanItems(items: unknown, fallback: string[] = []) {
  if (!Array.isArray(items)) {
    return fallback;
  }

  const cleaned = items
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);

  return cleaned.length > 0 ? cleaned : fallback;
}

function cleanString(value: unknown, fallback = "") {
  const cleaned = String(value ?? "").trim();
  return cleaned || fallback;
}

function markdownBullets(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

function section(title: string, body: string | string[]) {
  const content = Array.isArray(body) ? markdownBullets(body) : body;
  return [`## ${title}`, "", content.trim()].filter(Boolean).join("\n");
}

function extractSection(markdown: string, title: string) {
  const lines = markdown.split(/\r?\n/);
  const headingPattern = /^#{1,3}\s+(.+?)\s*$/;
  let capturing = false;
  const captured: string[] = [];

  for (const line of lines) {
    const heading = line.match(headingPattern)?.[1];

    if (heading) {
      if (capturing) {
        break;
      }

      capturing = heading.toLowerCase() === title.toLowerCase();
      continue;
    }

    if (capturing) {
      captured.push(line);
    }
  }

  return captured.join("\n").trim();
}

function sectionLines(markdown: string, title: string) {
  const raw = extractSection(markdown, title);
  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

export function proposalContentToMarkdown(content: ProposalContent) {
  const schedule = [
    `Course Duration: ${content.schedule.duration}`,
    `Date: ${content.schedule.date}`,
    `Time: ${content.schedule.time}`,
    `Venue: ${content.schedule.venue}`,
    `Participants: ${content.schedule.participants}`,
  ];
  const professionalFee = [
    "The training package includes:",
    markdownBullets(content.professionalFee.included),
    "",
    content.professionalFee.totalFee,
    "",
    `${content.client} will be responsible for the following:`,
    markdownBullets(content.professionalFee.clientResponsibilities),
    "",
    content.professionalFee.billingArrangement,
    "",
    "### Acknowledgement and Acceptance",
    content.professionalFee.acceptanceText,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    `# ${content.coverTitle}`,
    "",
    `On ${content.courseTitle}`,
    `at ${content.client}`,
    "",
    section("Course Overview", content.courseOverview.join("\n\n")),
    section("Course Objectives", content.courseObjectives),
    section("Expected Learning Outcomes", content.expectedLearningOutcomes),
    section("Content Outlines", content.contentOutlines),
    section("Who Should Attend", content.whoShouldAttend),
    section("Training Methodology", content.trainingMethodology),
    section("Training and Coaching Tools", content.trainingTools),
    section("Training Evaluation", content.trainingEvaluation),
    section("Schedule", schedule),
    section(
      "Trainer",
      [
        [content.trainer.name, content.trainer.title].filter(Boolean).join(" - "),
        "",
        ...content.trainer.bio,
      ]
        .filter(Boolean)
        .join("\n\n"),
    ),
    section("Professional Fee", professionalFee),
  ].join("\n\n");
}

export function proposalContentFromMarkdown(
  markdown: string,
  meta: ProposalFallbackMeta,
): ProposalContent {
  return {
    coverTitle: "Customized Training Proposal",
    courseTitle: meta.title,
    client: meta.client,
    courseOverview:
      sectionLines(markdown, "Course Overview").length > 0
        ? sectionLines(markdown, "Course Overview")
        : [
            `${meta.client} is preparing ${meta.audience} to apply ${meta.title} in practical business situations.`,
            meta.promise,
          ],
    courseObjectives: sectionLines(markdown, "Course Objectives"),
    expectedLearningOutcomes: sectionLines(markdown, "Expected Learning Outcomes"),
    contentOutlines: sectionLines(markdown, "Content Outlines"),
    whoShouldAttend:
      sectionLines(markdown, "Who Should Attend").length > 0
        ? sectionLines(markdown, "Who Should Attend")
        : [meta.audience],
    trainingMethodology: sectionLines(markdown, "Training Methodology"),
    trainingTools: sectionLines(markdown, "Training and Coaching Tools"),
    trainingEvaluation: sectionLines(markdown, "Training Evaluation"),
    schedule: {
      duration: meta.duration,
      date: "TBC",
      time: "TBC",
      venue: "TBC",
      participants: meta.audience,
    },
    trainer: {
      name: "DG Academy Facilitator",
      title: "Senior Training Facilitator",
      bio: sectionLines(markdown, "Trainer"),
    },
    professionalFee: {
      included: sectionLines(markdown, "Professional Fee"),
      totalFee: "Professional fee to be confirmed from Commercial Setup.",
      clientResponsibilities: ["Training venue", "Participants"],
      billingArrangement: "Billing arrangement to be confirmed.",
      acceptanceText: "Client acknowledgement and acceptance to be confirmed.",
    },
  };
}

export function normalizeProposalContent(
  value: unknown,
  fallbackMarkdown: string,
  meta: ProposalFallbackMeta,
): ProposalContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return proposalContentFromMarkdown(fallbackMarkdown, meta);
  }

  const record = value as Partial<ProposalContent>;
  const fallback = proposalContentFromMarkdown(fallbackMarkdown, meta);
  const schedule = (record.schedule ?? {}) as Partial<ProposalSchedule>;
  const trainer = (record.trainer ?? {}) as Partial<ProposalTrainer>;
  const fee = (record.professionalFee ?? {}) as Partial<ProposalProfessionalFee>;

  return {
    coverTitle: cleanString(record.coverTitle, fallback.coverTitle),
    courseTitle: cleanString(record.courseTitle, fallback.courseTitle),
    client: cleanString(record.client, fallback.client),
    courseOverview: cleanItems(record.courseOverview, fallback.courseOverview),
    courseObjectives: cleanItems(record.courseObjectives, fallback.courseObjectives),
    expectedLearningOutcomes: cleanItems(
      record.expectedLearningOutcomes,
      fallback.expectedLearningOutcomes,
    ),
    contentOutlines: cleanItems(record.contentOutlines, fallback.contentOutlines),
    whoShouldAttend: cleanItems(record.whoShouldAttend, fallback.whoShouldAttend),
    trainingMethodology: cleanItems(
      record.trainingMethodology,
      fallback.trainingMethodology,
    ),
    trainingTools: cleanItems(record.trainingTools, fallback.trainingTools),
    trainingEvaluation: cleanItems(
      record.trainingEvaluation,
      fallback.trainingEvaluation,
    ),
    schedule: {
      duration: cleanString(schedule.duration, fallback.schedule.duration),
      date: cleanString(schedule.date, fallback.schedule.date),
      time: cleanString(schedule.time, fallback.schedule.time),
      venue: cleanString(schedule.venue, fallback.schedule.venue),
      participants: cleanString(
        schedule.participants,
        fallback.schedule.participants,
      ),
    },
    trainer: {
      name: cleanString(trainer.name, fallback.trainer.name),
      title: cleanString(trainer.title, fallback.trainer.title),
      bio: cleanItems(trainer.bio, fallback.trainer.bio),
    },
    professionalFee: {
      included: cleanItems(fee.included, fallback.professionalFee.included),
      totalFee: cleanString(fee.totalFee, fallback.professionalFee.totalFee),
      clientResponsibilities: cleanItems(
        fee.clientResponsibilities,
        fallback.professionalFee.clientResponsibilities,
      ),
      billingArrangement: cleanString(
        fee.billingArrangement,
        fallback.professionalFee.billingArrangement,
      ),
      acceptanceText: cleanString(
        fee.acceptanceText,
        fallback.professionalFee.acceptanceText,
      ),
    },
  };
}
