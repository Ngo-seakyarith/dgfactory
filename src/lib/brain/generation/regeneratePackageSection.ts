import type {
  CoursePackageBrainInput,
  ProposalAgentOutput,
} from "@/lib/brain/agents";
import { routeBrainTask } from "@/lib/brain/routing/router";
import { buildDeterministicPricingFacts } from "@/lib/brain/tools";
import type { PricingInputs } from "@/features/training-packages";
import {
  normalizeTrainingOutputs,
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
  const pricingFacts = buildDeterministicPricingFacts(packageInput.pricingInputs);
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
      proposalBrief: packageInput.proposalBrief,
      pricingSummary: pricingFacts.summary,
    },
  });
  const outputs = normalizeTrainingOutputs(result.output, packageInput);

  return {
    section,
    content: outputs[section],
    outputs,
    mode: result.mode,
  };
}
