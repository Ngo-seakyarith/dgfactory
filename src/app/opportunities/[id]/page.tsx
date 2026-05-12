import { OpportunityDetailClient } from "@/app/crm/_components/crm-components";

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <OpportunityDetailClient id={id} />;
}
