import {
  defaultBillingArrangement,
  defaultPaymentInstructions,
  type ProposalBrief,
} from "./proposal-brief";

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
  imageUrl: string;
  bio: string[];
  experience: string[];
  qualifications: string[];
};

export type ProposalProfessionalFee = {
  included: string[];
  totalFee: string;
  vatStatus: string;
  clientResponsibilities: string[];
  billingArrangement: string;
  paymentInstructions: string;
  acceptanceText: string;
};

export type ProposalSignatory = {
  name: string;
  title: string;
  date: string;
};

export type ProposalContent = {
  coverTitle: string;
  coverSubtitle: string;
  certificationLabel: string;
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
  signatory: ProposalSignatory;
};

type ProposalFallbackMeta = {
  title: string;
  client: string;
  audience: string;
  duration: string;
  promise: string;
  proposalBrief?: ProposalBrief;
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

function briefLines(value?: string) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function markdownBullets(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

function optionalSection(title: string, body: string[]) {
  return body.length > 0 ? section(title, body) : "";
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
    content.professionalFee.paymentInstructions,
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
    content.coverSubtitle,
    content.certificationLabel,
    `at ${content.client}`,
    "",
    section("Course Overview", content.courseOverview.join("\n\n")),
    section("Course Objectives", content.courseObjectives),
    optionalSection("Expected Learning Outcomes", content.expectedLearningOutcomes),
    section("Content Outlines", content.contentOutlines),
    optionalSection("Who Should Attend", content.whoShouldAttend),
    section("Training Methodology", content.trainingMethodology),
    optionalSection("Training and Coaching Tools", content.trainingTools),
    optionalSection("Training Evaluation", content.trainingEvaluation),
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
    section("DG Academy Signatory", [
      content.signatory.name,
      content.signatory.title,
      content.signatory.date,
    ].filter(Boolean)),
  ].join("\n\n");
}

export function proposalContentFromMarkdown(
  markdown: string,
  meta: ProposalFallbackMeta,
): ProposalContent {
  const brief = meta.proposalBrief;

  return {
    coverTitle: meta.proposalBrief?.coverHeading || "Customized Training Proposal",
    coverSubtitle: meta.proposalBrief?.coverSubtitle ?? "",
    certificationLabel: meta.proposalBrief?.certificationLabel ?? "",
    courseTitle: meta.title,
    client: meta.client,
    courseOverview:
      brief?.clientBackground || brief?.trainingNeed
        ? [brief.clientBackground, brief.trainingNeed, meta.promise].filter(Boolean)
        : sectionLines(markdown, "Course Overview").length > 0
          ? sectionLines(markdown, "Course Overview")
          : [
              `${meta.client} is preparing ${meta.audience} to apply ${meta.title} in practical business situations.`,
              meta.promise,
            ],
    courseObjectives:
      briefLines(brief?.objectives).length > 0
        ? briefLines(brief?.objectives)
        : sectionLines(markdown, "Course Objectives"),
    expectedLearningOutcomes:
      briefLines(brief?.expectedLearningOutcomes).length > 0
        ? briefLines(brief?.expectedLearningOutcomes)
        : sectionLines(markdown, "Expected Learning Outcomes"),
    contentOutlines:
      briefLines(brief?.contentPriorities).length > 0
        ? briefLines(brief?.contentPriorities)
        : sectionLines(markdown, "Content Outlines"),
    whoShouldAttend:
      briefLines(brief?.whoShouldAttend).length > 0
        ? briefLines(brief?.whoShouldAttend)
        : sectionLines(markdown, "Who Should Attend"),
    trainingMethodology:
      briefLines(brief?.methodology).length > 0
        ? briefLines(brief?.methodology)
        : sectionLines(markdown, "Training Methodology"),
    trainingTools:
      briefLines(brief?.trainingTools).length > 0
        ? briefLines(brief?.trainingTools)
        : sectionLines(markdown, "Training and Coaching Tools"),
    trainingEvaluation:
      briefLines(brief?.evaluationApproach).length > 0
        ? briefLines(brief?.evaluationApproach)
        : sectionLines(markdown, "Training Evaluation"),
    schedule: {
      duration: meta.duration,
      date: brief?.scheduleDate || "TBC",
      time: brief?.scheduleTime || "TBC",
      venue: brief?.scheduleVenue || "TBC",
      participants: meta.audience,
    },
    trainer: {
      name: brief?.trainerName || "DG Academy Facilitator",
      title: brief?.trainerTitle || "Trainer & Speaker",
      imageUrl: brief?.trainerImageUrl ?? "",
      bio:
        briefLines(brief?.trainerBio).length > 0
          ? briefLines(brief?.trainerBio)
          : sectionLines(markdown, "Trainer"),
      experience: briefLines(brief?.trainerExperience),
      qualifications: briefLines(brief?.trainerQualifications),
    },
    professionalFee: {
      included:
        briefLines(brief?.includedItems).length > 0
          ? briefLines(brief?.includedItems)
          : sectionLines(markdown, "Professional Fee"),
      totalFee: "Professional fee to be confirmed from Commercial Setup.",
      vatStatus: brief?.vatStatus || "Excluding VAT",
      clientResponsibilities:
        briefLines(brief?.clientResponsibilities).length > 0
          ? briefLines(brief?.clientResponsibilities)
          : ["Training venue", "Participants"],
      billingArrangement: brief?.billingArrangement || defaultBillingArrangement,
      paymentInstructions:
        brief?.paymentInstructions || defaultPaymentInstructions,
      acceptanceText: brief?.acceptanceDeadline
        ? `Please confirm acceptance ${brief.acceptanceDeadline}.`
        : "Client acknowledgement and acceptance to be confirmed.",
    },
    signatory: {
      name: "Mr. Hin Sopheap",
      title: "Executive Director",
      date: brief?.proposalDate ?? "",
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
  const signatory = (record.signatory ?? {}) as Partial<ProposalSignatory>;

  return {
    coverTitle: cleanString(record.coverTitle, fallback.coverTitle),
    coverSubtitle: cleanString(record.coverSubtitle, fallback.coverSubtitle),
    certificationLabel: cleanString(
      record.certificationLabel,
      fallback.certificationLabel,
    ),
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
    trainer: meta.proposalBrief?.trainerId
      ? fallback.trainer
      : {
          name: cleanString(trainer.name, fallback.trainer.name),
          title: cleanString(trainer.title, fallback.trainer.title),
          imageUrl: cleanString(trainer.imageUrl, fallback.trainer.imageUrl),
          bio: cleanItems(trainer.bio, fallback.trainer.bio),
          experience: cleanItems(
            trainer.experience,
            fallback.trainer.experience,
          ),
          qualifications: cleanItems(
            trainer.qualifications,
            fallback.trainer.qualifications,
          ),
        },
    professionalFee: {
      included: cleanItems(fee.included, fallback.professionalFee.included),
      totalFee: cleanString(fee.totalFee, fallback.professionalFee.totalFee),
      vatStatus: cleanString(
        fee.vatStatus,
        fallback.professionalFee.vatStatus,
      ),
      clientResponsibilities: cleanItems(
        fee.clientResponsibilities,
        fallback.professionalFee.clientResponsibilities,
      ),
      billingArrangement: cleanString(
        fee.billingArrangement,
        fallback.professionalFee.billingArrangement,
      ),
      paymentInstructions: cleanString(
        fee.paymentInstructions,
        fallback.professionalFee.paymentInstructions,
      ),
      acceptanceText: cleanString(
        fee.acceptanceText,
        fallback.professionalFee.acceptanceText,
      ),
    },
    signatory: {
      name: fallback.signatory.name,
      title: fallback.signatory.title,
      date: cleanString(signatory.date, fallback.signatory.date),
    },
  };
}
