import { OpportunitiesPageClient } from "@/app/crm/_components/crm-components";

export default function OpportunitiesPage() {
  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div className="page-eyebrow">Business development</div>
        <h1 className="page-title">Opportunities</h1>
        <p className="page-description">
          Manage training opportunities from lead to proposal to won or lost.
        </p>
      </div>
      <OpportunitiesPageClient />
    </div>
  );
}
