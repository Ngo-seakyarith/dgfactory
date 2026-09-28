import { Skeleton } from "@/components/ui/skeleton";

export function DashboardMetricsSkeleton() {
  return <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading overview" aria-busy="true">
    {Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-3"><Skeleton className="h-4 w-32" /><Skeleton className="h-8 w-40" /><Skeleton className="h-3 w-24" /></div>)}
  </div>;
}

export function ChartSkeleton() {
  return <Skeleton className="mt-5 h-[320px] w-full" aria-label="Loading chart" aria-busy="true" />;
}

export function DashboardSkeleton() {
  return <div className="space-y-8" aria-label="Loading dashboard" aria-busy="true">
    <Skeleton className="h-9 w-48" />
    <DashboardMetricsSkeleton />
    <ChartSkeleton />
    <ChartSkeleton />
  </div>;
}
