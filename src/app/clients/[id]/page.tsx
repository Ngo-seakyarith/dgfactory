import { ClientDetailClient } from "@/app/crm/_components/crm-components";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ClientDetailClient id={id} />;
}
