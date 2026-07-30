import { Skeleton } from "@/components/ui/skeleton";

export function PageLoadingSkeleton({ label = "Loading page" }: { label?: string }) {
  return (
    <div className="space-y-5" aria-label={label} aria-busy="true">
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4 sm:flex-row">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-full sm:w-40" />
      </div>
      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-36" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DetailLoadingSkeleton({ label = "Loading record" }: { label?: string }) {
  return (
    <div className="space-y-5" aria-label={label} aria-busy="true">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div className="w-full max-w-2xl space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-6 w-3/4" />
            <Skeleton className="mt-3 h-4 w-full" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card p-5">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-5/6" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    </div>
  );
}

export function ListLoadingSkeleton({
  label = "Loading records",
  rows = 4,
}: {
  label?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-3" aria-label={label} aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <Skeleton className="h-6 w-20 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MetricLoadingSkeleton({
  label = "Loading metrics",
  count = 4,
}: {
  label?: string;
  count?: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={label} aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-lg border border-border bg-card p-5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-4 h-8 w-20" />
          <Skeleton className="mt-3 h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}
