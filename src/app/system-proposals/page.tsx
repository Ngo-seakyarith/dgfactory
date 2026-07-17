import { SystemProposalBrowser } from "@/features/intelligent-system-proposals/components";

export default function SystemProposalsPage() {
  return <div className="space-y-5"><div className="page-heading"><div className="page-eyebrow">System consulting</div><h1 className="page-title">System proposals</h1><p className="page-description">Review client data and develop evidence-based intelligent-system recommendations.</p></div><SystemProposalBrowser /></div>;
}
