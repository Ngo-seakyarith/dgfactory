import { AdaptiveGrowthExecutiveDashboard } from "@/components/adaptive-growth-dashboard-components";

export default function AdaptiveGrowthDashboardPage() {
  return (
    <div className="space-y-6">
      <section>
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
          DG Academy Growth System
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          Adaptive Growth Dashboard
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Executive view of whether DG Academy is sensing, mutating, testing,
          selecting, replicating, expanding, and learning fast enough.
        </p>
      </section>
      <AdaptiveGrowthExecutiveDashboard />
    </div>
  );
}
