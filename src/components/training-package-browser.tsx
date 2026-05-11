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
  Sparkles,
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
  deletePackageLocally,
  CommercialSetup,
  ErrorState,
  getLocalTrainingPackage,
  getLocalTrainingPackages,
  LoadingState,
  savePackageLocally,
  TrainingPackageOutputsView,
} from "@/components/training-package-factory";
import { PilotFeedbackButton } from "@/components/pilot-components";
import type { TrainingPackage } from "@/lib/training-packages";
import {
  buildCommercialProposalSection,
  calculatePricing,
  normalizePricingInputs,
  type PricingInputs,
} from "@/lib/pricing";
import { PackageOpportunityPanel } from "@/components/crm-components";
import { AdaptiveGrowthPackageLinkPanel } from "@/components/adaptive-growth-components";

function mergePackages(
  localPackages: TrainingPackage[],
  remotePackages: TrainingPackage[],
) {
  const merged = new Map<string, TrainingPackage>();

  [...remotePackages, ...localPackages].forEach((pkg) => {
    const existing = merged.get(pkg.id);
    if (!existing || pkg.updatedAt > existing.updatedAt) {
      merged.set(pkg.id, pkg);
    }
  });

  return Array.from(merged.values()).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

function usePackages() {
  const [packages, setPackages] = useState<TrainingPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageNotice, setStorageNotice] = useState("Loading saved packages...");

  useEffect(() => {
    let active = true;

    async function loadPackages() {
      const localPackages = getLocalTrainingPackages();
      setPackages(localPackages);

      try {
        const response = await fetch("/api/training-packages", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          packages?: TrainingPackage[];
        };
        const remotePackages = payload.packages ?? [];

        if (!active) {
          return;
        }

        remotePackages.forEach(savePackageLocally);
        setPackages(mergePackages(localPackages, remotePackages));
        setStorageNotice(
          remotePackages.length > 0
            ? "Showing local and Supabase-backed packages."
            : "Showing local packages. Supabase will appear here when configured.",
        );
      } catch {
        if (active) {
          setStorageNotice("Showing local packages. Database read was unavailable.");
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
  const openaiCount = packages.filter((pkg) => pkg.generationMode === "openai").length;

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          icon={Layers3}
          label="Saved Packages"
          value={isLoading ? "..." : generatedCount.toString()}
          detail="Local plus Supabase when configured"
        />
        <MetricCard
          icon={Database}
          label="Markets Covered"
          value={isLoading ? "..." : openMarkets.toString()}
          detail="Clients or market segments"
        />
        <MetricCard
          icon={Sparkles}
          label="OpenAI Runs"
          value={isLoading ? "..." : openaiCount.toString()}
          detail="Mock generation fills the gap"
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
            <FactoryStep title="2. Generate" detail="Create syllabus, proposal, deck outline, workbook, email, and QA." />
            <FactoryStep title="3. Package" detail="Copy outputs, save locally or to Supabase, and reopen detail pages." />
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
  const [isSavingCommercial, setIsSavingCommercial] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPackage() {
      const localPackage = getLocalTrainingPackage(id);
      if (localPackage) {
        setPkg(localPackage);
      }

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

        if (payload.package) {
          savePackageLocally(payload.package);
          setPkg(payload.package);
        } else if (!localPackage) {
          setError(payload.error ?? "Training package was not found.");
        }
      } catch {
        if (active && !localPackage) {
          setError("Training package was not found locally or in the database.");
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
      deletePackageLocally(pkg.id);
      await fetch(`/api/training-packages/${pkg.id}`, { method: "DELETE" });
      router.push("/packages");
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  function updatePricing(nextInputs: PricingInputs) {
    setPkg((current) => {
      if (!current) {
        return current;
      }

      const pricingInputs = normalizePricingInputs(nextInputs);
      const pricingOutputs = calculatePricing(pricingInputs);

      return {
        ...current,
        pricingInputs,
        pricingOutputs,
        commercialProposal: buildCommercialProposalSection({
          title: current.title,
          client: current.client,
          inputs: pricingInputs,
          outputs: pricingOutputs,
        }),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  async function saveCommercialSetup() {
    if (!pkg) {
      return;
    }

    setIsSavingCommercial(true);
    setNotice("");

    try {
      savePackageLocally(pkg);
      const response = await fetch("/api/training-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pkg),
      });
      const payload = (await response.json()) as {
        package?: TrainingPackage;
        storage?: "local" | "supabase";
        error?: string;
      };

      if (!response.ok || !payload.package) {
        throw new Error(payload.error ?? "Commercial setup save failed.");
      }

      savePackageLocally(payload.package);
      setPkg(payload.package);
      setNotice(
        payload.storage === "supabase"
          ? "Commercial setup saved locally and in Supabase."
          : "Commercial setup saved locally. Supabase was unavailable.",
      );
    } catch (saveError) {
      setNotice(
        saveError instanceof Error
          ? saveError.message
          : "Commercial setup saved locally only.",
      );
    } finally {
      setIsSavingCommercial(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant={pkg.generationMode === "openai" ? "teal" : "gold"}>
                {pkg.generationMode === "openai" ? "OpenAI generated" : "Mock generated"}
              </Badge>
              <Badge variant="outline">{pkg.duration}</Badge>
            </div>
            <CardTitle className="text-xl leading-tight">{pkg.title}</CardTitle>
            <CardDescription className="mt-2 max-w-3xl leading-6">
              {pkg.promise}
            </CardDescription>
          </div>
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
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <InfoBlock label="Audience" value={pkg.audience} />
          <InfoBlock label="Client or Market" value={pkg.client} />
          <InfoBlock label="Tone" value={pkg.tone} />
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <CommercialSetup
          value={pkg.pricingInputs}
          onChange={updatePricing}
          description="Edit pricing assumptions for this saved package, then save the commercial setup."
        />
        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle>Commercial Save</CardTitle>
            <CardDescription>
              Pricing changes update the Pricing tab immediately. Save to keep them
              with this package.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              type="button"
              variant="gold"
              onClick={saveCommercialSetup}
              disabled={isSavingCommercial}
            >
              {isSavingCommercial ? "Saving..." : "Save Commercial Setup"}
            </Button>
            {notice ? (
              <p className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-3 text-sm leading-6 text-teal-50">
                {notice}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <PackageOpportunityPanel pkg={pkg} />

      <AdaptiveGrowthPackageLinkPanel pkg={pkg} />

      <PilotFeedbackButton
        relatedPage={`/packages/${pkg.id}`}
        relatedFeature="Package detail"
        relatedPackageId={pkg.id}
      />

      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardContent className="p-5">
          <TrainingPackageOutputsView
            pkg={pkg}
            onPackageUpdate={async (updatedPackage) => {
              savePackageLocally(updatedPackage);
              setPkg(updatedPackage);
              await fetch("/api/training-packages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedPackage),
              });
            }}
          />
        </CardContent>
      </Card>
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
                  <Badge variant={pkg.generationMode === "openai" ? "teal" : "gold"}>
                    {pkg.generationMode === "openai" ? "OpenAI" : "Mock"}
                  </Badge>
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

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium leading-6 text-white">{value}</div>
    </div>
  );
}
