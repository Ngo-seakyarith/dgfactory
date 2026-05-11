import { OpportunitiesPageClient } from "@/components/crm-components";

export default function OpportunitiesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Opportunities</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Manage training opportunities from lead to proposal to won or lost.
        </p>
      </div>
      <OpportunitiesPageClient />
    </div>
  );
}
