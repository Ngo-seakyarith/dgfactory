import { PipelineBoard } from "@/app/crm/_components/crm-components";
import { PilotFeedbackButton } from "@/app/pilot/_components/pilot-feedback-button";

export default function PipelinePage() {
  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div className="page-eyebrow">Business development</div>
        <h1 className="page-title">Proposal pipeline</h1>
        <p className="page-description">
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
