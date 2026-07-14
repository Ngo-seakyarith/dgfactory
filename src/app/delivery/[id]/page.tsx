import { DeliveryProjectDetailClient } from "@/features/delivery/components";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DeliveryProjectDetailPage({ params }: PageProps) {
  const { id } = await params;

  return <DeliveryProjectDetailClient id={id} />;
}
