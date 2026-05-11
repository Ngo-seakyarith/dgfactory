import { AdaptiveGrowthWorkspace } from "@/components/adaptive-growth-components";

export default function AdaptiveGrowthOffersPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Offer Variants" />
      <AdaptiveGrowthWorkspace view="offers" />
    </div>
  );
}

function PageHeader({ title }: { title: string }) {
  return (
    <section>
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
        Adaptive Growth
      </div>
      <h1 className="mt-2 text-3xl font-semibold text-white">{title}</h1>
    </section>
  );
}
