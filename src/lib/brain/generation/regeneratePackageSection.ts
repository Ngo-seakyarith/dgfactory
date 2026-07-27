import type {
  CoursePackageBrainInput,
  ProposalAgentOutput,
} from "@/lib/brain/agents";
import { routeBrainTask } from "@/lib/brain/routing/router";
import type { PricingInputs } from "@/features/training-packages";
import {
  normalizeTrainingOutputs,
  proposalNarrativeBriefFrom,
  type TrainingPackageInput,
} from "@/features/training-packages";

export type RegeneratablePackageSection = "syllabus" | "proposal";

export type RegeneratePackageInput = TrainingPackageInput & {
  pricingInputs?: Partial<PricingInputs>;
};

export async function regeneratePackageSection({
  section,
  packageInput,
}: {
  section: RegeneratablePackageSection;
  packageInput: RegeneratePackageInput;
}) {
  const result = await routeBrainTask<CoursePackageBrainInput, ProposalAgentOutput>({
    taskType: "course_package",
    input: {
      courseTitle: packageInput.courseTitle,
      audience: packageInput.audience,
      duration: packageInput.duration,
      client: packageInput.client,
      promise: packageInput.promise,
      context: packageInput.context,
      tone: packageInput.tone,
      proposalBrief: proposalNarrativeBriefFrom(packageInput.proposalBrief),
    },
  });
  const outputs = normalizeTrainingOutputs(
    result.output,
    packageInput,
    packageInput.pricingInputs,
  );

  return {
    section,
    content: outputs[section],
    outputs,
    mode: result.mode,
  };
}
