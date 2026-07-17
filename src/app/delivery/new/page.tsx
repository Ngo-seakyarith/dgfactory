import { Suspense } from "react";

import { DeliveryProjectForm } from "@/features/delivery/components";

export default function NewDeliveryProjectPage() {
  return (
    <div className="space-y-6">
      <section>
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
          New Training Delivery
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          Schedule the confirmed training.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Select the client and package, confirm the delivery details, and start
          the preparation checklist.
        </p>
      </section>
      <Suspense fallback={null}>
        <DeliveryProjectForm />
      </Suspense>
    </div>
  );
}
