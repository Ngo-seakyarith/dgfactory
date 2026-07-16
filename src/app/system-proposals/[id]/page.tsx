import { SystemProposalWorkspace } from "@/features/intelligent-system-proposals/components";

export default async function SystemProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SystemProposalWorkspace id={id} />;
}
