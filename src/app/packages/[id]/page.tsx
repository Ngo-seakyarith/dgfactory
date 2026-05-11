import { PackageDetailClient } from "@/components/training-package-browser";

export default async function PackageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <PackageDetailClient id={id} />;
}
