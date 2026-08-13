import { SolutionProposalWorkspace } from "@/features/digital-solution-proposals/components";

export default async function SolutionProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SolutionProposalWorkspace id={id} />;
}
