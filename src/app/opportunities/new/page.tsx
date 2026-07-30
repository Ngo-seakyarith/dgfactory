import { Suspense } from "react";

import { OpportunityForm } from "@/app/crm/_components/crm-components";
import { DetailLoadingSkeleton } from "@/components/page-loading-skeleton";

export default function NewOpportunityPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">New Opportunity</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Create a proposal pipeline record and optionally link a training package.
        </p>
      </div>
      <Suspense fallback={<DetailLoadingSkeleton label="Loading opportunity form" />}>
        <OpportunityForm />
      </Suspense>
    </div>
  );
}
