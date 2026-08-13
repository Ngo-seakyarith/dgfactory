import { SolutionProposalBrowser } from "@/features/digital-solution-proposals/components";

export default function SolutionProposalsPage() {
  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div className="page-eyebrow">Digital consulting</div>
        <h1 className="page-title">Digital solution proposals</h1>
        <p className="page-description">
          Turn client requirements into practical website, application, portal, data, or AI solution proposals.
        </p>
      </div>
      <SolutionProposalBrowser />
    </div>
  );
}
