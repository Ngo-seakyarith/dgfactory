import type { TrainingPackage } from "@/features/training-packages";

function briefLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Builds downstream training context from the original human-authored package
 * inputs. Generated syllabus and proposal output are intentionally excluded so
 * later generations do not amplify wording or errors from an earlier AI pass.
 */
export function packageGenerationContext(trainingPackage: TrainingPackage) {
  const brief = trainingPackage.proposalBrief;

  return {
    source: "Original saved package inputs and proposal brief",
    courseTitle: trainingPackage.title,
    client: trainingPackage.client,
    audience: trainingPackage.audience,
    duration: trainingPackage.duration,
    promise: trainingPackage.promise,
    businessContext: trainingPackage.context,
    tone: trainingPackage.tone,
    coverHeading: brief.coverHeading,
    coverSubtitle: brief.coverSubtitle,
    certificationLabel: brief.certificationLabel,
    clientBackground: brief.clientBackground,
    trainingNeed: brief.trainingNeed,
    objectives: briefLines(brief.objectives),
    outcomes: briefLines(brief.expectedLearningOutcomes),
    contentPriorities: briefLines(brief.contentPriorities),
    targetParticipantProfile: brief.whoShouldAttend,
    methodology: briefLines(brief.methodology),
    trainingTools: briefLines(brief.trainingTools),
    evaluationApproach: brief.evaluationApproach,
    schedule: {
      date: brief.scheduleDate,
      time: brief.scheduleTime,
      venue: brief.scheduleVenue,
    },
    participantCount:
      trainingPackage.pricingInputs.numberOfParticipants > 0
        ? trainingPackage.pricingInputs.numberOfParticipants
        : null,
    trainers: [
      { name: brief.trainerName, title: brief.trainerTitle },
      { name: brief.secondTrainerName, title: brief.secondTrainerTitle },
    ].filter((trainer) => trainer.name),
  };
}
