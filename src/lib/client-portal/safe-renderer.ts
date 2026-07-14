import type { DeliveryProject } from "@/features/delivery";
import type { TrainingPackage } from "@/features/training-packages";

const internalLinePatterns = [
  /internal[-\s]?only/i,
  /internal notes?/i,
  /internal profitability/i,
  /estimated profit/i,
  /profit margin/i,
  /margin information/i,
  /direct cost/i,
  /target profit/i,
  /trainer day rate/i,
  /qa score/i,
  /quality score/i,
  /knowledge used/i,
  /private knowledge/i,
  /prompt template/i,
  /system prompt/i,
];

export function sanitizeClientText(value: string) {
  return String(value ?? "")
    .split(/\r?\n/)
    .filter((line) => !internalLinePatterns.some((pattern) => pattern.test(line)))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildClientSafePackageDocument({
  pkg,
  documentType,
}: {
  pkg: TrainingPackage;
  documentType: "Proposal" | "Syllabus" | "Training Plan";
}) {
  const sections =
    documentType === "Proposal"
      ? [
          `# ${pkg.title}`,
          `Client: ${pkg.client || "Client"}`,
          "## Proposal",
          pkg.proposal,
          pkg.commercialProposal ? `## Commercial Proposal\n${pkg.commercialProposal}` : "",
        ]
      : documentType === "Syllabus"
        ? [
            `# ${pkg.title}`,
            `Client: ${pkg.client || "Client"}`,
            "## Syllabus",
            pkg.syllabus,
          ]
        : [
            `# ${pkg.title}`,
            `Client: ${pkg.client || "Client"}`,
            "## Training Plan",
            pkg.syllabus,
            "## Participant Workbook",
            pkg.workbook,
          ];

  return sanitizeClientText(sections.filter(Boolean).join("\n\n"));
}

export function buildClientSafeDeliveryDocument(project: DeliveryProject) {
  const report = project.postTrainingReport?.trim()
    ? project.postTrainingReport
    : `# ${project.title}

## Delivery Summary
Status: ${project.deliveryStatus}
Training date: ${project.trainingDate || "To be confirmed"}
Location: ${project.location || "To be confirmed"}
Trainer: ${project.trainerName || "To be confirmed"}
Participant count: ${project.participantCount || 0}

## Evaluation
Average satisfaction score: ${project.evaluation.averageSatisfactionScore || "Pending"}

## Client Feedback
${project.evaluation.clientFeedback || "Pending client feedback."}

## Recommendations
${project.evaluation.improvementSuggestions || "Recommendations will be confirmed after delivery review."}`;

  return sanitizeClientText(report);
}
