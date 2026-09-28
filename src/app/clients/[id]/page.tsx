import { redirect } from "next/navigation";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  redirect(`/pipeline?${new URLSearchParams({ clientId: id })}`);
}
