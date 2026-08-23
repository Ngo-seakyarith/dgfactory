import { PipelineBoard } from "@/app/crm/_components/crm-components";

export default function PipelinePage() {
  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div className="page-eyebrow">Business development</div>
        <h1 className="page-title">Proposal pipeline</h1>
        <p className="page-description">
          View training opportunities by status, value, and follow-up.
        </p>
      </div>
      <PipelineBoard />
    </div>
  );
}
