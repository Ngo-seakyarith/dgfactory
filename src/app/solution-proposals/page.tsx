import { SolutionProposalBrowser } from "@/features/digital-solution-proposals/components";

export default function SolutionProposalsPage() {
  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div className="page-eyebrow">Intelligent systems</div>
        <h1 className="page-title">Intelligent System Proposals</h1>
        <p className="page-description">
          Turn client requirements into practical proposals for websites, applications, portals, data platforms, or AI systems.
        </p>
      </div>
      <SolutionProposalBrowser />
    </div>
  );
}
