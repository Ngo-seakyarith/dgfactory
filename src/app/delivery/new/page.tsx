import { Suspense } from "react";

import { DeliveryProjectForm } from "@/components/delivery-components";

export default function NewDeliveryProjectPage() {
  return (
    <div className="space-y-6">
      <section>
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
          New Delivery Project
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          Turn a won proposal into delivery work.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Link a client, opportunity, and package, then generate the delivery
          checklist and report foundation.
        </p>
      </section>
      <Suspense fallback={null}>
        <DeliveryProjectForm />
      </Suspense>
    </div>
  );
}
