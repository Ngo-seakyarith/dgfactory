import type {
  CoursePackageBrainInput,
  ProposalAgentOutput,
} from "@/lib/brain/agents";
import { routeBrainTask } from "@/lib/brain/router";
import { buildDeterministicPricingFacts } from "@/lib/brain/tools";
import type { PricingInputs } from "@/lib/pricing";
import {
  normalizeTrainingOutputs,
  type TrainingPackageInput,
  type TrainingPackageOutputs,
} from "@/lib/training-packages";

export type RegeneratablePackageSection = "syllabus" | "proposal";

export type RegeneratePackageInput = TrainingPackageInput & {
  pricingInputs?: Partial<PricingInputs>;
};

export async function regeneratePackageSection({
  section,
  packageInput,
  currentPackage,
}: {
  section: RegeneratablePackageSection;
  packageInput: RegeneratePackageInput;
  currentPackage: TrainingPackageOutputs;
}) {
  const pricingFacts = buildDeterministicPricingFacts(packageInput.pricingInputs);
  const clientPackageInput: TrainingPackageInput = {
    courseTitle: packageInput.courseTitle,
    audience: packageInput.audience,
    duration: packageInput.duration,
    client: packageInput.client,
    promise: packageInput.promise,
    context: packageInput.context,
    tone: packageInput.tone,
    proposalBrief: packageInput.proposalBrief,
  };
  const baseContext = {
    input: clientPackageInput,
    currentPackage,
    deterministicPricing: pricingFacts,
    instruction: `Regenerate only ${section}. Keep the rest of the package conceptually aligned.`,
  };

  if (section === "syllabus") {
    const result = await routeBrainTask<
      CoursePackageBrainInput,
      TrainingPackageOutputs
    >({
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
    return { section, content: outputs.syllabus, mode: result.mode };
  }

  if (section === "proposal") {
    const result = await routeBrainTask<
      Record<string, unknown>,
      ProposalAgentOutput
    >({
      taskType: "proposal",
      input: baseContext,
    });
    return {
      section,
      content: normalizeTrainingOutputs(
        {
          syllabus: currentPackage.syllabus,
          proposalContent: result.output.proposalContent,
        },
        packageInput,
      ).proposal,
      mode: result.mode,
    };
  }

  throw new Error("Only syllabus and proposal can be regenerated for packages.");
}
