import { Suspense } from "react";

import { DeliveryProjectForm } from "@/features/delivery/components";

export default function NewDeliveryProjectPage() {
  return (
    <div className="space-y-6">
      <section className="page-heading">
        <div className="page-eyebrow">
          New Training Delivery
        </div>
        <h1 className="page-title">
          Schedule confirmed training
        </h1>
        <p className="page-description">
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
