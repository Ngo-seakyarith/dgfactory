import { DeliveryProjectsPageClient } from "@/features/delivery/components";

export default function DeliveryPage() {
  return (
    <div className="space-y-6">
      <section>
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
          Training Delivery
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          Prepare, deliver, and complete each training.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Keep client logistics, training-day records, feedback, and the final
          post-training report together.
        </p>
      </section>
      <DeliveryProjectsPageClient />
    </div>
  );
}
