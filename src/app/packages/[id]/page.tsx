import { PackageDetailClient } from "@/features/training-packages/components";

export default async function PackageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <PackageDetailClient id={id} />;
}
