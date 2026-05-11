import { PipelineBoard } from "@/components/crm-components";
import { PilotFeedbackButton } from "@/components/pilot-components";

export default function PipelinePage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Proposal Pipeline</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          View training opportunities by status, value, probability, and follow-up.
        </p>
      </div>
      <PipelineBoard />
      <PilotFeedbackButton
        relatedPage="/pipeline"
        relatedFeature="Pipeline board"
      />
    </div>
  );
}
