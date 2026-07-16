import { SystemProposalBrowser } from "@/features/intelligent-system-proposals/components";

export default function SystemProposalsPage() {
  return <div className="space-y-5"><div><h1 className="text-2xl font-semibold text-white">Intelligent System Proposals</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Review client data and develop evidence-based system recommendations.</p></div><SystemProposalBrowser /></div>;
}
