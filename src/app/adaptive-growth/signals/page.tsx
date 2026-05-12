import { AdaptiveGrowthWorkspace } from "@/app/adaptive-growth/_components/adaptive-growth-components";

export default function AdaptiveGrowthSignalsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Market Signals" />
      <AdaptiveGrowthWorkspace view="signals" />
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
