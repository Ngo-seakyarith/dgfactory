import { DeliveryProjectsPageClient } from "@/features/delivery/components";

export default function DeliveryPage() {
  return (
    <div className="space-y-6">
      <section className="page-heading">
        <div className="page-eyebrow">
          Training Delivery
        </div>
        <h1 className="page-title">
          Prepare, deliver, and complete training
        </h1>
        <p className="page-description">
          Keep client logistics, training-day records, feedback, and the final
          post-training report together.
        </p>
      </section>
      <DeliveryProjectsPageClient />
    </div>
  );
}
