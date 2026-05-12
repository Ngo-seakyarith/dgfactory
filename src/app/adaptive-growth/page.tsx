import { AdaptiveGrowthWorkspace } from "@/app/adaptive-growth/_components/adaptive-growth-components";

export default function AdaptiveGrowthPage() {
  return (
    <div className="space-y-6">
      <GrowthHeader
        title="Adaptive Growth OS"
        subtitle="Variation x Feedback x Selection x Replication x Expansion."
      />
      <AdaptiveGrowthWorkspace view="dashboard" />
    </div>
  );
}

function GrowthHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section>
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
        DG Academy Growth System
      </div>
      <h1 className="mt-2 text-3xl font-semibold text-white">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
        {subtitle}
      </p>
    </section>
  );
}
