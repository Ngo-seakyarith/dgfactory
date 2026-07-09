"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Clock3,
  Database,
  FileText,
  Layers3,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ErrorState,
  LoadingState,
  PackageForm,
} from "@/features/training-packages/components";
import { PilotFeedbackButton } from "@/app/pilot/_components/pilot-feedback-button";
import type { TrainingPackage } from "@/features/training-packages";
import { PackageOpportunityPanel } from "@/app/crm/_components/crm-components";
import { AdaptiveGrowthPackageLinkPanel } from "@/app/adaptive-growth/_components/adaptive-growth-components";

function usePackages() {
  const [packages, setPackages] = useState<TrainingPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageNotice, setStorageNotice] = useState("Loading saved packages...");

  useEffect(() => {
    let active = true;

    async function loadPackages() {
      try {
        const response = await fetch("/api/training-packages", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          packages?: TrainingPackage[];
          error?: string;
        };

        if (!active) {
          return;
        }

        if (!response.ok) {
          throw new Error(payload.error ?? "Database read failed.");
        }

        setPackages(payload.packages ?? []);
        setStorageNotice("Showing Supabase-backed packages.");
      } catch (error) {
        if (active) {
          setStorageNotice(
            error instanceof Error ? error.message : "Database read was unavailable.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadPackages();

    return () => {
      active = false;
    };
  }, []);

  return { packages, isLoading, storageNotice };
}

export function TrainingDashboardClient() {
  const { packages, isLoading, storageNotice } = usePackages();
  const latest = packages.slice(0, 4);
  const generatedCount = packages.length;
  const openMarkets = new Set(packages.map((pkg) => pkg.client).filter(Boolean)).size;

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2">
        <MetricCard
          icon={Layers3}
          label="Saved Packages"
          value={isLoading ? "..." : generatedCount.toString()}
          detail="Stored in Supabase"
        />
        <MetricCard
          icon={Database}
          label="Markets Covered"
          value={isLoading ? "..." : openMarkets.toString()}
          detail="Clients or market segments"
        />
      </section>

      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle>Production Factory</CardTitle>
            <CardDescription>
              Build sellable training assets from one brief, then save, copy, and
              reopen them.
            </CardDescription>
          </div>
          <Button asChild variant="gold">
            <Link href="/packages/new">
              <Plus className="h-4 w-4" />
              New Package
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <FactoryStep title="1. Brief" detail="Capture the title, audience, client, promise, examples, and tone." />
            <FactoryStep title="2. Generate" detail="Create the syllabus and proposal." />
            <FactoryStep title="3. Package" detail="Copy outputs, save to Supabase, and reopen detail pages." />
          </div>
        </CardContent>
      </Card>

      <SavedPackageGrid
        packages={latest}
        storageNotice={storageNotice}
        emptyTitle="No packages yet"
        emptyDetail="Create your first DG Academy training package to populate the factory."
      />
    </div>
  );
}

export function SavedPackagesClient() {
  const { packages, isLoading, storageNotice } = usePackages();
  const [query, setQuery] = useState("");

  const filteredPackages = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return packages;
    }

    return packages.filter((pkg) =>
      [pkg.title, pkg.audience, pkg.client, pkg.promise]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [packages, query]);

  return (
    <div className="space-y-5">
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, audience, client, or promise"
              className="pl-9"
            />
          </div>
          <Button asChild variant="gold" className="w-full sm:w-auto">
            <Link href="/packages/new">
              <Plus className="h-4 w-4" />
              New Package
            </Link>
          </Button>
        </CardContent>
      </Card>

      <SavedPackageGrid
        packages={filteredPackages}
        storageNotice={isLoading ? "Loading saved packages..." : storageNotice}
        emptyTitle="No matching packages"
        emptyDetail="Try a different search or generate a new package."
      />
    </div>
  );
}

export function PackageDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [pkg, setPkg] = useState<TrainingPackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPackage() {
      try {
        const response = await fetch(`/api/training-packages/${id}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          package?: TrainingPackage;
          error?: string;
        };

        if (!active) {
          return;
        }

        if (!response.ok || !payload.package) {
          throw new Error(payload.error ?? "Training package was not found.");
        }

        setPkg(payload.package);
      } catch (error) {
        if (active) {
          setError(error instanceof Error ? error.message : "Training package was not found.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadPackage();

    return () => {
      active = false;
    };
  }, [id]);

  if (isLoading && !pkg) {
    return <LoadingState label="Loading package..." />;
  }

  if (!pkg) {
    return (
      <>
        <ErrorState title="Package not found" detail={error} />
        <Card className="mt-4 border-white/10 bg-white/[0.04] shadow-executive">
          <CardContent className="p-6">
            <Button asChild variant="gold">
              <Link href="/packages/new">Create New Package</Link>
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  async function deletePackage() {
    if (!pkg || !window.confirm(`Delete "${pkg.title}"?`)) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/training-packages/${pkg.id}`, { method: "DELETE" });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Delete failed.");
      }

      router.push("/packages");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <PackageForm initialPackage={pkg} onPackageSaved={setPkg} />

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/packages/new">
            <Plus className="h-4 w-4" />
            New Package
          </Link>
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={deletePackage}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4" />
          {isDeleting ? "Deleting" : "Delete"}
        </Button>
      </div>

      <PackageOpportunityPanel pkg={pkg} />

      <AdaptiveGrowthPackageLinkPanel pkg={pkg} />

      <PilotFeedbackButton
        relatedPage={`/packages/${pkg.id}`}
        relatedFeature="Package detail"
        relatedPackageId={pkg.id}
      />

    </div>
  );
}

function SavedPackageGrid({
  packages,
  storageNotice,
  emptyTitle,
  emptyDetail,
}: {
  packages: TrainingPackage[];
  storageNotice: string;
  emptyTitle: string;
  emptyDetail: string;
}) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <CardTitle>Saved Packages</CardTitle>
          <CardDescription>{storageNotice}</CardDescription>
        </div>
        <Badge variant="teal">{packages.length} visible</Badge>
      </CardHeader>
      <CardContent>
        {packages.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {packages.map((pkg) => (
              <Link
                key={pkg.id}
                href={`/packages/${pkg.id}`}
                className="group rounded-lg border border-white/10 bg-[#07111f]/55 p-4 transition hover:border-teal-300/35 hover:bg-teal-300/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="line-clamp-2 font-semibold leading-6 text-white">
                      {pkg.title}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {pkg.promise}
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-teal-100" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline">{pkg.client}</Badge>
                  <Badge variant="outline">{pkg.duration}</Badge>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  Updated {new Date(pkg.updatedAt).toLocaleString()}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-white/15 bg-[#07111f]/45 p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-teal-100" />
            <div className="mt-4 text-base font-semibold text-white">{emptyTitle}</div>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {emptyDetail}
            </p>
            <Button asChild variant="gold" className="mt-5">
              <Link href="/packages/new">
                <Plus className="h-4 w-4" />
                New Package
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Layers3;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-2 font-mono text-3xl font-semibold text-white">{value}</div>
          <div className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</div>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-teal-300/20 bg-teal-300/10 text-teal-100">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function FactoryStep({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
      <div className="font-semibold text-white">{title}</div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  );
}
