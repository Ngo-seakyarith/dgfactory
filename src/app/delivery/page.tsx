import { DeliveryProjectsPageClient } from "@/components/delivery-components";

export default function DeliveryPage() {
  return (
    <div className="space-y-6">
      <section>
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
          Training Delivery OS
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          Manage won training delivery.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Prepare materials, run delivery checklists, capture evaluation, and
          draft client-ready post-training reports.
        </p>
      </section>
      <DeliveryProjectsPageClient />
    </div>
  );
}
