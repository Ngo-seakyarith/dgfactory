"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BrainCircuit,
  ClipboardList,
  FlaskConical,
  Layers3,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Sprout,
  Target,
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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  calculateGrowthDashboardMetrics,
  genomeItemStatuses,
  genomeItemTypes,
  growthExperimentStatuses,
  growthSourceTypes,
  marketSignalStatuses,
  normalizeExperimentMetrics,
  normalizeGrowthExperiment,
  normalizeLearningGenomeItem,
  normalizeMarketSignal,
  normalizeOfferVariant,
  normalizeSelectionDecision,
  normalizeTags,
  offerFormats,
  offerVariantStatuses,
  selectionDecisions,
  type AdaptiveGrowthData,
  type AdaptiveGrowthKind,
  type ExperimentMetrics,
  type GenomeItemStatus,
  type GenomeItemType,
  type GrowthExperiment,
  type GrowthExperimentStatus,
  type GrowthSourceType,
  type LearningGenomeItem,
  type MarketSignal,
  type MarketSignalStatus,
  type OfferFormat,
  type OfferVariant,
  type OfferVariantStatus,
  type SelectionDecision,
  type SelectionDecisionValue,
} from "@/lib/adaptive-growth";
import {
  calculateOfferFitness,
  type FitnessEvaluationResult,
} from "@/lib/adaptive-growth/fitness";
import type { TrainingPackage } from "@/lib/training-packages";
import {
  mutationStrategies,
  type MutationStrategy,
  type OfferMutationVariant,
} from "@/lib/brain/agents";

type GrowthView =
  | "dashboard"
  | "signals"
  | "offers"
  | "experiments"
  | "selection"
  | "genome";

type EditableMutationVariant = OfferMutationVariant & {
  localId: string;
  selected: boolean;
};

const emptyData: AdaptiveGrowthData = {
  signals: [],
  offers: [],
  experiments: [],
  metrics: [],
  decisions: [],
  genomeItems: [],
};

function useAdaptiveGrowthData() {
  const [data, setData] = useState<AdaptiveGrowthData>(emptyData);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState("Loading Adaptive Growth OS...");

  async function refresh() {
    try {
      const response = await fetch("/api/adaptive-growth", { cache: "no-store" });
      const payload = (await response.json()) as { data?: AdaptiveGrowthData };
      setData(payload.data ?? emptyData);
      setNotice("Growth data loaded. Supabase is used when configured; otherwise server fallback is used.");
    } catch {
      setNotice("Growth data could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return { data, isLoading, notice, refresh };
}

async function saveGrowthRecord(kind: AdaptiveGrowthKind, record: unknown) {
  const response = await fetch("/api/adaptive-growth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, record }),
  });
  const payload = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Adaptive growth save failed.");
  }
}

async function deleteGrowthRecord(kind: AdaptiveGrowthKind, id: string) {
  const response = await fetch("/api/adaptive-growth", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, id }),
  });

  if (!response.ok) {
    throw new Error("Adaptive growth delete failed.");
  }
}

export function AdaptiveGrowthWorkspace({ view }: { view: GrowthView }) {
  const { data, isLoading, notice, refresh } = useAdaptiveGrowthData();

  if (isLoading) {
    return (
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Adaptive Growth OS...
        </CardContent>
      </Card>
    );
  }

  if (view === "signals") {
    return <SignalsView data={data} notice={notice} onRefresh={refresh} />;
  }
  if (view === "offers") {
    return <OffersView data={data} notice={notice} onRefresh={refresh} />;
  }
  if (view === "experiments") {
    return <ExperimentsView data={data} notice={notice} onRefresh={refresh} />;
  }
  if (view === "selection") {
    return <SelectionView data={data} notice={notice} onRefresh={refresh} />;
  }
  if (view === "genome") {
    return <GenomeView data={data} notice={notice} onRefresh={refresh} />;
  }

  return <AdaptiveGrowthDashboard data={data} notice={notice} />;
}

export function AdaptiveGrowthDashboard({
  data,
  notice,
}: {
  data: AdaptiveGrowthData;
  notice: string;
}) {
  const metrics = calculateGrowthDashboardMetrics(data);

  return (
    <div className="space-y-5">
      <Card className="border-teal-300/20 bg-teal-300/10 shadow-executive">
        <CardHeader>
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge variant="teal">Adaptive Growth OS</Badge>
            <Badge variant="outline">Variation x Feedback x Selection x Replication x Expansion</Badge>
          </div>
          <CardTitle>Growth System Dashboard</CardTitle>
          <CardDescription>
            {notice} The system converts market signals into offer experiments,
            selects winners, and stores reusable learning patterns.
          </CardDescription>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Active signals" value={metrics.activeSignals.toString()} />
        <Metric label="Offer variants" value={metrics.offerVariants.toString()} />
        <Metric label="Running experiments" value={metrics.runningExperiments.toString()} />
        <Metric label="Selected to scale" value={metrics.offersSelectedToScale.toString()} />
        <Metric label="Killed" value={metrics.offersKilled.toString()} />
        <Metric label="Avg fitness" value={metrics.averageFitnessScore.toString()} />
      </section>

      <GrowthNavCards />

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle>Top Offers by Fitness</CardTitle>
            <CardDescription>Latest selection decisions ranked by fitness score.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.topOffersByFitness.length ? (
              metrics.topOffersByFitness.map((item) => (
                <div key={item.offer.id} className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-white">{item.offer.title}</div>
                    <Badge variant="teal">{item.score}/100</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.decision} - {item.offer.promise}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No selection decisions yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle>Latest Learning Genome Items</CardTitle>
            <CardDescription>Reusable patterns ready for replication and expansion.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.latestGenomeItems.length ? (
              metrics.latestGenomeItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-white">{item.title}</div>
                    <Badge variant={item.status === "Active" ? "teal" : "outline"}>{item.status}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.content}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No genome items yet.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function GrowthNavCards() {
  const cards = [
    ["Dashboard", "/adaptive-growth/dashboard", BarChart3, "See adaptation velocity, fitness, loops, and Ralph status."],
    ["Signals", "/adaptive-growth/signals", Sprout, "Capture weak signals from the market."],
    ["Offers", "/adaptive-growth/offers", Layers3, "Generate and manage offer variants."],
    ["Experiments", "/adaptive-growth/experiments", FlaskConical, "Test offers through channels and clients."],
    ["Selection", "/adaptive-growth/selection", Target, "Score fitness and choose winners."],
    ["Genome", "/adaptive-growth/genome", BrainCircuit, "Store patterns for replication."],
  ] as const;

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      {cards.map(([title, href, Icon, body]) => (
        <Link key={href} href={href} className="rounded-lg border border-white/10 bg-white/[0.04] p-4 transition hover:border-teal-300/40 hover:bg-teal-300/10">
          <Icon className="h-5 w-5 text-teal-100" />
          <div className="mt-3 font-semibold text-white">{title}</div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
        </Link>
      ))}
    </section>
  );
}

function SignalsView({
  data,
  notice,
  onRefresh,
}: {
  data: AdaptiveGrowthData;
  notice: string;
  onRefresh: () => Promise<void>;
}) {
  const [signal, setSignal] = useState<MarketSignal>(
    normalizeMarketSignal({ title: "", sourceType: "Client Conversation" }),
  );
  const [tagText, setTagText] = useState("");
  const [status, setStatus] = useState("");

  async function saveSignal() {
    await saveGrowthRecord("signal", { ...signal, tags: normalizeTags(tagText) });
    setSignal(normalizeMarketSignal({ title: "", sourceType: "Client Conversation" }));
    setTagText("");
    setStatus("Signal saved.");
    await onRefresh();
  }

  return (
    <CrudShell
      title="Market Signals"
      description="Capture market, client, competitor, policy, sales, and feedback signals."
      notice={notice}
      status={status}
    >
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>New Signal</CardTitle>
          <CardDescription>Variation starts from signal capture.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Title">
            <Input value={signal.title} onChange={(event) => setSignal({ ...signal, title: event.target.value })} />
          </Field>
          <Field label="Description">
            <Textarea value={signal.description} onChange={(event) => setSignal({ ...signal, description: event.target.value })} />
          </Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Source type">
              <Select value={signal.sourceType} onChange={(event) => setSignal({ ...signal, sourceType: event.target.value as GrowthSourceType })}>
                {growthSourceTypes.map((item) => <option key={item}>{item}</option>)}
              </Select>
            </Field>
            <Field label="Source name">
              <Input value={signal.sourceName} onChange={(event) => setSignal({ ...signal, sourceName: event.target.value })} />
            </Field>
            <Field label="Status">
              <Select value={signal.status} onChange={(event) => setSignal({ ...signal, status: event.target.value as MarketSignalStatus })}>
                {marketSignalStatuses.map((item) => <option key={item}>{item}</option>)}
              </Select>
            </Field>
            <Field label="Sector">
              <Input value={signal.sector} onChange={(event) => setSignal({ ...signal, sector: event.target.value })} />
            </Field>
            <Field label="Audience">
              <Input value={signal.audience} onChange={(event) => setSignal({ ...signal, audience: event.target.value })} />
            </Field>
            <Field label="Tags">
              <Input value={tagText} onChange={(event) => setTagText(event.target.value)} placeholder="AI, banking, managers" />
            </Field>
            <Field label="Urgency score">
              <Input type="number" value={signal.urgencyScore ?? ""} onChange={(event) => setSignal({ ...signal, urgencyScore: Number(event.target.value) })} />
            </Field>
            <Field label="Confidence score">
              <Input type="number" value={signal.confidenceScore ?? ""} onChange={(event) => setSignal({ ...signal, confidenceScore: Number(event.target.value) })} />
            </Field>
          </div>
          <Button type="button" variant="gold" onClick={saveSignal}>
            <Save className="h-4 w-4" />
            Save Signal
          </Button>
        </CardContent>
      </Card>
      <RecordGrid
        emptyLabel="No signals yet."
        items={data.signals.map((item) => ({
          id: item.id,
          title: item.title,
          badge: item.status,
          body: item.description,
          meta: [item.sourceType, item.sector, item.audience].filter(Boolean).join(" - "),
          kind: "signal" as const,
          actionHref: `/adaptive-growth/offers?signalId=${encodeURIComponent(item.id)}`,
          actionLabel: "Generate Variants from Signal",
        }))}
        onDelete={onRefresh}
      />
    </CrudShell>
  );
}

function OffersView({
  data,
  notice,
  onRefresh,
}: {
  data: AdaptiveGrowthData;
  notice: string;
  onRefresh: () => Promise<void>;
}) {
  const [offer, setOffer] = useState<OfferVariant>(
    normalizeOfferVariant({ title: "", format: "Workshop" }),
  );
  const [status, setStatus] = useState("");

  async function saveOffer() {
    await saveGrowthRecord("offer", offer);
    setOffer(normalizeOfferVariant({ title: "", format: "Workshop" }));
    setStatus("Offer variant saved.");
    await onRefresh();
  }

  return (
    <CrudShell
      title="Offer Variants"
      description="Variation: turn market signals into many product and training offer variants."
      notice={notice}
      status={status}
    >
      <MutationFactory data={data} onRefresh={onRefresh} />

      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>New Offer Variant</CardTitle>
          <CardDescription>Each variant can become a package, experiment, or genome item.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Source signal">
              <Select value={offer.signalId ?? ""} onChange={(event) => setOffer({ ...offer, signalId: event.target.value || null })}>
                <option value="">No signal</option>
                {data.signals.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </Select>
            </Field>
            <Field label="Title">
              <Input value={offer.title} onChange={(event) => setOffer({ ...offer, title: event.target.value })} />
            </Field>
          </div>
          <Field label="Description">
            <Textarea value={offer.description} onChange={(event) => setOffer({ ...offer, description: event.target.value })} />
          </Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Target audience">
              <Input value={offer.targetAudience} onChange={(event) => setOffer({ ...offer, targetAudience: event.target.value })} />
            </Field>
            <Field label="Sector">
              <Input value={offer.sector} onChange={(event) => setOffer({ ...offer, sector: event.target.value })} />
            </Field>
            <Field label="Format">
              <Select value={offer.format} onChange={(event) => setOffer({ ...offer, format: event.target.value as OfferFormat })}>
                {offerFormats.map((item) => <option key={item}>{item}</option>)}
              </Select>
            </Field>
            <Field label="Duration">
              <Input value={offer.duration} onChange={(event) => setOffer({ ...offer, duration: event.target.value })} />
            </Field>
            <Field label="Price assumption">
              <Input type="number" value={offer.priceAssumption ?? ""} onChange={(event) => setOffer({ ...offer, priceAssumption: Number(event.target.value) })} />
            </Field>
            <Field label="Status">
              <Select value={offer.status} onChange={(event) => setOffer({ ...offer, status: event.target.value as OfferVariantStatus })}>
                {offerVariantStatuses.map((item) => <option key={item}>{item}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Promise">
            <Textarea value={offer.promise} onChange={(event) => setOffer({ ...offer, promise: event.target.value })} />
          </Field>
          <Button type="button" variant="gold" onClick={saveOffer}>
            <Save className="h-4 w-4" />
            Save Offer
          </Button>
        </CardContent>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        {data.offers.length ? data.offers.map((item) => (
          <OfferCard key={item.id} offer={item} data={data} onRefresh={onRefresh} />
        )) : <EmptyCard label="No offer variants yet." />}
      </div>
    </CrudShell>
  );
}

function MutationFactory({
  data,
  onRefresh,
}: {
  data: AdaptiveGrowthData;
  onRefresh: () => Promise<void>;
}) {
  const searchParams = useSearchParams();
  const signalIdFromUrl = searchParams.get("signalId") ?? "";
  const [signalId, setSignalId] = useState(signalIdFromUrl);
  const selectedSignal = data.signals.find((signal) => signal.id === signalId);
  const [baseIdea, setBaseIdea] = useState("");
  const [sector, setSector] = useState("");
  const [audience, setAudience] = useState("");
  const [desiredFormat, setDesiredFormat] = useState("");
  const [constraints, setConstraints] = useState("");
  const [numberOfVariants, setNumberOfVariants] = useState(7);
  const [mutationStrategy, setMutationStrategy] =
    useState<MutationStrategy>("Random creative mutation");
  const [variants, setVariants] = useState<EditableMutationVariant[]>([]);
  const [recommendedTop3, setRecommendedTop3] = useState<string[]>([]);
  const [rationale, setRationale] = useState("");
  const [notice, setNotice] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (signalIdFromUrl) {
      setSignalId(signalIdFromUrl);
    }
  }, [signalIdFromUrl]);

  useEffect(() => {
    if (selectedSignal) {
      setBaseIdea(selectedSignal.description || selectedSignal.title);
      setSector(selectedSignal.sector);
      setAudience(selectedSignal.audience);
    }
  }, [selectedSignal]);

  async function generateVariants() {
    setIsGenerating(true);
    setNotice("");

    try {
      const response = await fetch("/api/adaptive-growth/generate-offer-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signal_id: signalId || undefined,
          base_idea: baseIdea,
          sector,
          audience,
          desired_format: desiredFormat,
          constraints,
          number_of_variants: numberOfVariants,
          mutation_strategy: mutationStrategy,
        }),
      });
      const payload = (await response.json()) as {
        variants?: OfferMutationVariant[];
        recommended_top_3?: string[];
        rationale?: string;
        mode?: "mock" | "openai";
        notice?: string;
        error?: string;
      };

      if (!response.ok || !payload.variants) {
        throw new Error(payload.error ?? "Offer mutation failed.");
      }

      setVariants(
        payload.variants.map((variant, index) => ({
          ...variant,
          localId: `${Date.now()}-${index}`,
          selected: index < 3,
        })),
      );
      setRecommendedTop3(payload.recommended_top_3 ?? []);
      setRationale(payload.rationale ?? "");
      setNotice(payload.notice ?? `Generated ${payload.variants.length} variants in ${payload.mode} mode.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Offer mutation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  function updateVariant<K extends keyof OfferMutationVariant>(
    localId: string,
    key: K,
    value: OfferMutationVariant[K],
  ) {
    setVariants((current) =>
      current.map((variant) =>
        variant.localId === localId ? { ...variant, [key]: value } : variant,
      ),
    );
  }

  async function saveVariant(variant: EditableMutationVariant) {
    await saveGrowthRecord("offer", {
      signalId: signalId || null,
      title: variant.title,
      description: [
        `Pain point: ${variant.pain_point}`,
        `Why now: ${variant.why_now}`,
        `Test method: ${variant.test_method}`,
        `Buying trigger: ${variant.expected_buying_trigger}`,
        `Risk: ${variant.risk}`,
        `Suggested price range: ${variant.suggested_price_range}`,
      ].join("\n"),
      targetAudience: variant.target_audience,
      sector: variant.sector,
      format: offerFormats.includes(variant.format as OfferFormat)
        ? variant.format
        : "Other",
      duration: variant.duration,
      promise: variant.promise,
      priceAssumption: parsePriceAssumption(variant.suggested_price_range),
      status: "Draft",
    });
    setVariants((current) => current.filter((item) => item.localId !== variant.localId));
    setNotice(`Saved offer variant: ${variant.title}`);
    await onRefresh();
  }

  async function saveSelectedVariants() {
    const selected = variants.filter((variant) => variant.selected);

    for (const variant of selected) {
      await saveVariant(variant);
    }

    setNotice(`Saved ${selected.length} selected offer variants.`);
  }

  return (
    <Card className="border-teal-300/20 bg-teal-300/10 shadow-executive">
      <CardHeader>
        <div className="mb-2 flex flex-wrap gap-2">
          <Badge variant="teal">Micro-Offer Mutation Factory</Badge>
          <Badge variant="outline">Variation engine</Badge>
        </div>
        <CardTitle>Generate Offer Variants</CardTitle>
        <CardDescription>
          Create many small, testable offers from one signal, trend, or business idea.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-3">
          <Field label="Market signal">
            <Select value={signalId} onChange={(event) => setSignalId(event.target.value)}>
              <option value="">No signal</option>
              {data.signals.map((signal) => (
                <option key={signal.id} value={signal.id}>
                  {signal.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mutation strategy">
            <Select
              value={mutationStrategy}
              onChange={(event) => setMutationStrategy(event.target.value as MutationStrategy)}
            >
              {mutationStrategies.map((strategy) => (
                <option key={strategy}>{strategy}</option>
              ))}
            </Select>
          </Field>
          <Field label="Number of variants">
            <Input
              type="number"
              min={1}
              max={20}
              value={numberOfVariants}
              onChange={(event) => setNumberOfVariants(Number(event.target.value))}
            />
          </Field>
          <Field label="Sector">
            <Input value={sector} onChange={(event) => setSector(event.target.value)} />
          </Field>
          <Field label="Audience">
            <Input value={audience} onChange={(event) => setAudience(event.target.value)} />
          </Field>
          <Field label="Desired format">
            <Select value={desiredFormat} onChange={(event) => setDesiredFormat(event.target.value)}>
              <option value="">Any format</option>
              {offerFormats.map((format) => (
                <option key={format}>{format}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Base idea or market signal">
          <Textarea
            value={baseIdea}
            onChange={(event) => setBaseIdea(event.target.value)}
            placeholder="Example: Cambodian bank managers need practical AI workflow adoption training."
          />
        </Field>
        <Field label="Constraints">
          <Textarea
            value={constraints}
            onChange={(event) => setConstraints(event.target.value)}
            placeholder="Budget, duration, sector, delivery constraints, buyer concerns, or risks."
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="gold" onClick={generateVariants} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate Offer Variants
          </Button>
          {variants.some((variant) => variant.selected) ? (
            <Button type="button" variant="outline" onClick={saveSelectedVariants}>
              <Save className="h-4 w-4" />
              Save Selected
            </Button>
          ) : null}
        </div>
        {notice ? (
          <p className="rounded-lg border border-teal-300/20 bg-[#07111f]/55 p-3 text-sm text-teal-50">
            {notice}
          </p>
        ) : null}
        {rationale ? (
          <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4 text-sm leading-6 text-slate-200">
            <div className="mb-2 font-semibold text-white">Mutation rationale</div>
            {rationale}
            {recommendedTop3.length ? (
              <div className="mt-3 text-teal-50">
                Recommended top 3: {recommendedTop3.join(", ")}
              </div>
            ) : null}
          </div>
        ) : null}
        {variants.length ? (
          <MutationComparisonTable
            variants={variants}
            onUpdate={updateVariant}
            onToggle={(localId) =>
              setVariants((current) =>
                current.map((variant) =>
                  variant.localId === localId
                    ? { ...variant, selected: !variant.selected }
                    : variant,
                ),
              )
            }
            onDiscard={(localId) =>
              setVariants((current) => current.filter((variant) => variant.localId !== localId))
            }
            onSave={saveVariant}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function MutationComparisonTable({
  variants,
  onUpdate,
  onToggle,
  onDiscard,
  onSave,
}: {
  variants: EditableMutationVariant[];
  onUpdate: <K extends keyof OfferMutationVariant>(
    localId: string,
    key: K,
    value: OfferMutationVariant[K],
  ) => void;
  onToggle: (localId: string) => void;
  onDiscard: (localId: string) => void;
  onSave: (variant: EditableMutationVariant) => Promise<void>;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#07111f]/55">
      <table className="min-w-[1180px] text-left text-sm">
        <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          <tr>
            <th className="px-3 py-3">Keep</th>
            <th className="px-3 py-3">Title</th>
            <th className="px-3 py-3">Audience</th>
            <th className="px-3 py-3">Sector</th>
            <th className="px-3 py-3">Promise</th>
            <th className="px-3 py-3">Format</th>
            <th className="px-3 py-3">Test method</th>
            <th className="px-3 py-3">Confidence</th>
            <th className="px-3 py-3">Risk</th>
            <th className="px-3 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((variant) => (
            <tr key={variant.localId} className="border-b border-white/10 align-top last:border-b-0">
              <td className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={variant.selected}
                  onChange={() => onToggle(variant.localId)}
                  className="h-4 w-4"
                  aria-label={`Select ${variant.title}`}
                />
              </td>
              <td className="px-3 py-3">
                <SmallTextarea
                  value={variant.title}
                  onChange={(value) => onUpdate(variant.localId, "title", value)}
                />
              </td>
              <td className="px-3 py-3">
                <SmallTextarea
                  value={variant.target_audience}
                  onChange={(value) =>
                    onUpdate(variant.localId, "target_audience", value)
                  }
                />
              </td>
              <td className="px-3 py-3">
                <SmallTextarea
                  value={variant.sector}
                  onChange={(value) => onUpdate(variant.localId, "sector", value)}
                />
              </td>
              <td className="px-3 py-3">
                <SmallTextarea
                  value={variant.promise}
                  onChange={(value) => onUpdate(variant.localId, "promise", value)}
                />
              </td>
              <td className="px-3 py-3">
                <Select
                  value={variant.format}
                  onChange={(event) =>
                    onUpdate(variant.localId, "format", event.target.value)
                  }
                  className="min-w-40"
                >
                  {offerFormats.map((format) => (
                    <option key={format}>{format}</option>
                  ))}
                  {!offerFormats.includes(variant.format as OfferFormat) ? (
                    <option>{variant.format}</option>
                  ) : null}
                </Select>
                <Input
                  value={variant.duration}
                  onChange={(event) =>
                    onUpdate(variant.localId, "duration", event.target.value)
                  }
                  className="mt-2 min-w-32"
                  placeholder="Duration"
                />
              </td>
              <td className="px-3 py-3">
                <SmallTextarea
                  value={variant.test_method}
                  onChange={(value) => onUpdate(variant.localId, "test_method", value)}
                />
              </td>
              <td className="px-3 py-3">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={variant.confidence_score}
                  onChange={(event) =>
                    onUpdate(
                      variant.localId,
                      "confidence_score",
                      Number(event.target.value),
                    )
                  }
                  className="w-24"
                />
              </td>
              <td className="px-3 py-3">
                <SmallTextarea
                  value={variant.risk}
                  onChange={(value) => onUpdate(variant.localId, "risk", value)}
                />
              </td>
              <td className="space-y-2 px-3 py-3">
                <Button type="button" variant="gold" size="sm" onClick={() => onSave(variant)}>
                  Save
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => onDiscard(variant.localId)}>
                  Discard
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SmallTextarea({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-20 w-56 rounded-lg border border-white/10 bg-[#07111f] px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-teal-300/60"
    />
  );
}

function parsePriceAssumption(value: string) {
  const numbers = value.match(/\d+(?:,\d{3})*(?:\.\d+)?/g)?.map((item) =>
    Number(item.replace(/,/g, "")),
  );

  if (!numbers?.length) {
    return null;
  }

  return numbers.length > 1
    ? Math.round((numbers[0] + numbers[numbers.length - 1]) / 2)
    : numbers[0];
}

function ExperimentsView({
  data,
  notice,
  onRefresh,
}: {
  data: AdaptiveGrowthData;
  notice: string;
  onRefresh: () => Promise<void>;
}) {
  const [experiment, setExperiment] = useState<GrowthExperiment>(
    normalizeGrowthExperiment({ status: "Planned" }),
  );
  const [metric, setMetric] = useState<ExperimentMetrics>(
    normalizeExperimentMetrics({}),
  );
  const [status, setStatus] = useState("");

  async function saveExperiment() {
    await saveGrowthRecord("experiment", experiment);
    setExperiment(normalizeGrowthExperiment({ status: "Planned" }));
    setStatus("Experiment saved.");
    await onRefresh();
  }

  async function saveMetric() {
    await saveGrowthRecord("metric", metric);
    setMetric(normalizeExperimentMetrics({}));
    setStatus("Experiment metrics recorded.");
    await onRefresh();
  }

  return (
    <CrudShell
      title="Growth Experiments"
      description="Feedback: test offers in the market and capture evidence."
      notice={notice}
      status={status}
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle>New Experiment</CardTitle>
            <CardDescription>Define hypothesis, method, channel, owner, and success criteria.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Offer variant">
              <Select value={experiment.offerVariantId} onChange={(event) => setExperiment({ ...experiment, offerVariantId: event.target.value })}>
                <option value="">Select offer</option>
                {data.offers.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </Select>
            </Field>
            <Field label="Hypothesis">
              <Textarea value={experiment.hypothesis} onChange={(event) => setExperiment({ ...experiment, hypothesis: event.target.value })} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Test method">
                <Input value={experiment.testMethod} onChange={(event) => setExperiment({ ...experiment, testMethod: event.target.value })} />
              </Field>
              <Field label="Channel">
                <Input value={experiment.channel} onChange={(event) => setExperiment({ ...experiment, channel: event.target.value })} />
              </Field>
              <Field label="Start date">
                <Input type="date" value={experiment.startDate} onChange={(event) => setExperiment({ ...experiment, startDate: event.target.value })} />
              </Field>
              <Field label="End date">
                <Input type="date" value={experiment.endDate} onChange={(event) => setExperiment({ ...experiment, endDate: event.target.value })} />
              </Field>
              <Field label="Owner">
                <Input value={experiment.owner} onChange={(event) => setExperiment({ ...experiment, owner: event.target.value })} />
              </Field>
              <Field label="Status">
                <Select value={experiment.status} onChange={(event) => setExperiment({ ...experiment, status: event.target.value as GrowthExperimentStatus })}>
                  {growthExperimentStatuses.map((item) => <option key={item}>{item}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Success criteria">
              <Textarea value={experiment.successCriteria} onChange={(event) => setExperiment({ ...experiment, successCriteria: event.target.value })} />
            </Field>
            <Field label="Notes">
              <Textarea value={experiment.notes} onChange={(event) => setExperiment({ ...experiment, notes: event.target.value })} />
            </Field>
            <Button type="button" variant="gold" onClick={saveExperiment}>
              <Save className="h-4 w-4" />
              Save Experiment
            </Button>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle>Record Metrics</CardTitle>
            <CardDescription>Evidence used later for selection fitness.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Experiment">
              <Select value={metric.experimentId} onChange={(event) => setMetric({ ...metric, experimentId: event.target.value })}>
                <option value="">Select experiment</option>
                {data.experiments.map((item) => <option key={item.id} value={item.id}>{experimentTitle(item, data.offers)}</option>)}
              </Select>
            </Field>
            <div className="grid gap-4 md:grid-cols-3">
              {metricNumberFields.map(([key, label]) => (
                <Field key={key} label={label}>
                  <Input type="number" value={metric[key] ?? ""} onChange={(event) => setMetric({ ...metric, [key]: Number(event.target.value) })} />
                </Field>
              ))}
            </div>
            <Field label="Metric notes">
              <Textarea value={metric.notes} onChange={(event) => setMetric({ ...metric, notes: event.target.value })} />
            </Field>
            <Button type="button" variant="gold" onClick={saveMetric}>
              <BarChart3 className="h-4 w-4" />
              Save Metrics
            </Button>
          </CardContent>
        </Card>
      </div>
      <RecordGrid
        emptyLabel="No experiments yet."
        items={data.experiments.map((item) => ({
          id: item.id,
          title: experimentTitle(item, data.offers),
          badge: item.status,
          body: item.hypothesis,
          meta: [item.channel, item.owner, item.startDate].filter(Boolean).join(" - "),
          kind: "experiment" as const,
        }))}
        onDelete={onRefresh}
      />
    </CrudShell>
  );
}

const metricNumberFields: Array<[keyof ExperimentMetrics, string]> = [
  ["impressions", "Impressions"],
  ["inquiries", "Inquiries"],
  ["meetings", "Meetings"],
  ["proposalsSent", "Proposals sent"],
  ["dealsWon", "Deals won"],
  ["revenue", "Revenue"],
  ["estimatedMargin", "Estimated margin"],
  ["deliveryQualityScore", "Delivery quality"],
  ["clientInterestScore", "Client interest"],
  ["strategicFitScore", "Strategic fit"],
  ["reusabilityScore", "Reusability"],
];

function SelectionRankingPanel({
  data,
  onRefresh,
}: {
  data: AdaptiveGrowthData;
  onRefresh: () => Promise<void>;
}) {
  const [decisionFilter, setDecisionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const latestDecisionByOffer = new Map<string, SelectionDecision>();

  data.decisions
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .forEach((decisionItem) => {
      if (!latestDecisionByOffer.has(decisionItem.offerVariantId)) {
        latestDecisionByOffer.set(decisionItem.offerVariantId, decisionItem);
      }
    });

  const sectors = Array.from(
    new Set(data.offers.map((offer) => offer.sector).filter(Boolean)),
  ).sort();
  const ranked = data.offers
    .map((offer) => {
      const evaluation = evaluateOfferFromData(offer, data);
      const latestDecision = latestDecisionByOffer.get(offer.id);
      return {
        offer,
        experiment: evaluation.experiment,
        fitness: evaluation.fitness,
        latestDecision,
        effectiveDecision: latestDecision?.decision ?? evaluation.fitness.recommendation,
      };
    })
    .filter((item) => !decisionFilter || item.effectiveDecision === decisionFilter)
    .filter((item) => !statusFilter || item.offer.status === statusFilter)
    .filter((item) => !sectorFilter || item.offer.sector === sectorFilter)
    .sort((a, b) => b.fitness.fitnessScore - a.fitness.fitnessScore);

  async function createDecision(item: (typeof ranked)[number]) {
    await saveGrowthRecord("decision", {
      offerVariantId: item.offer.id,
      experimentId: item.experiment?.id ?? null,
      decision: item.fitness.recommendation,
      fitnessScore: item.fitness.fitnessScore,
      rationale: item.fitness.rationale,
      nextAction: nextActionForRecommendation(item.fitness.recommendation),
      decidedBy: "DG Academy",
    });
    await onRefresh();
  }

  return (
    <Card className="border-teal-300/20 bg-teal-300/10 shadow-executive">
      <CardHeader>
        <CardTitle>Ranked Fitness Board</CardTitle>
        <CardDescription>
          Selection: compare offers by deterministic fitness evidence, then choose what scales or dies.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Decision">
            <Select value={decisionFilter} onChange={(event) => setDecisionFilter(event.target.value)}>
              <option value="">All decisions</option>
              {selectionDecisions.map((item) => <option key={item}>{item}</option>)}
            </Select>
          </Field>
          <Field label="Offer status">
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              {offerVariantStatuses.map((item) => <option key={item}>{item}</option>)}
            </Select>
          </Field>
          <Field label="Sector">
            <Select value={sectorFilter} onChange={(event) => setSectorFilter(event.target.value)}>
              <option value="">All sectors</option>
              {sectors.map((sector) => <option key={sector}>{sector}</option>)}
            </Select>
          </Field>
        </div>

        <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#07111f]/55">
          <table className="min-w-[900px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-3 py-3">Offer</th>
                <th className="px-3 py-3">Sector</th>
                <th className="px-3 py-3">Score</th>
                <th className="px-3 py-3">Recommendation</th>
                <th className="px-3 py-3">Evidence</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {ranked.length ? ranked.map((item) => (
                <tr
                  key={item.offer.id}
                  className={
                    item.fitness.recommendation === "Scale"
                      ? "border-b border-teal-300/20 bg-teal-300/10 align-top last:border-b-0"
                      : item.fitness.recommendation === "Kill"
                        ? "border-b border-red-300/20 bg-red-400/10 align-top last:border-b-0"
                        : "border-b border-white/10 align-top last:border-b-0"
                  }
                >
                  <td className="px-3 py-3">
                    <div className="font-semibold text-white">{item.offer.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.offer.status}</div>
                  </td>
                  <td className="px-3 py-3">{item.offer.sector || "General"}</td>
                  <td className="px-3 py-3 font-semibold text-white">{item.fitness.fitnessScore}/100</td>
                  <td className="px-3 py-3">
                    <Badge
                      variant={
                        item.fitness.recommendation === "Scale" ||
                        item.fitness.recommendation === "Productize"
                          ? "teal"
                          : item.fitness.recommendation === "Kill"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {item.fitness.recommendation}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {item.fitness.isIncomplete
                      ? `${item.fitness.scoreCompletenessPercent}% complete`
                      : "Complete"}
                  </td>
                  <td className="px-3 py-3">
                    <Button type="button" variant="outline" size="sm" onClick={() => createDecision(item)}>
                      <Target className="h-4 w-4" />
                      Create Decision
                    </Button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td className="px-3 py-6 text-muted-foreground" colSpan={6}>
                    No offers match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SelectionView({
  data,
  notice,
  onRefresh,
}: {
  data: AdaptiveGrowthData;
  notice: string;
  onRefresh: () => Promise<void>;
}) {
  const [decision, setDecision] = useState<SelectionDecision>(
    normalizeSelectionDecision({ decision: "Iterate", fitnessScore: 50 }),
  );
  const [status, setStatus] = useState("");
  const selectedOffer = data.offers.find((item) => item.id === decision.offerVariantId);
  const selectedExperiment =
    data.experiments.find((item) => item.id === decision.experimentId) ??
    (selectedOffer ? latestExperimentForOffer(selectedOffer, data) : null);
  const selectedMetric = latestMetricsForExperiment(selectedExperiment, data);
  const selectedSignal =
    selectedOffer?.signalId
      ? data.signals.find((item) => item.id === selectedOffer.signalId) ?? null
      : null;
  const suggestedEvaluation = calculateOfferFitness({
    offer: selectedOffer,
    signal: selectedSignal,
    experiment: selectedExperiment,
    metrics: selectedMetric,
  });

  async function saveDecision() {
    await saveGrowthRecord("decision", {
      ...decision,
      experimentId: decision.experimentId || selectedExperiment?.id || null,
      decision: decision.decision || suggestedEvaluation.recommendation,
      fitnessScore: decision.fitnessScore || suggestedEvaluation.fitnessScore,
    });
    setDecision(normalizeSelectionDecision({ decision: "Iterate", fitnessScore: 50 }));
    setStatus("Selection decision saved.");
    await onRefresh();
  }

  return (
    <CrudShell
      title="Selection"
      description="Selection: score offers and decide what to scale, iterate, park, kill, bundle, partner, or productize."
      notice={notice}
      status={status}
    >
      <SelectionRankingPanel data={data} onRefresh={onRefresh} />

      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>Selection Decision</CardTitle>
          <CardDescription>Fitness can be calculated from metrics, then overridden by human judgment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Offer variant">
              <Select value={decision.offerVariantId} onChange={(event) => setDecision({ ...decision, offerVariantId: event.target.value })}>
                <option value="">Select offer</option>
                {data.offers.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </Select>
            </Field>
            <Field label="Experiment">
              <Select value={decision.experimentId ?? ""} onChange={(event) => setDecision({ ...decision, experimentId: event.target.value || null })}>
                <option value="">No experiment</option>
                {data.experiments.map((item) => <option key={item.id} value={item.id}>{experimentTitle(item, data.offers)}</option>)}
              </Select>
            </Field>
            <Field label="Decision">
              <Select value={decision.decision} onChange={(event) => setDecision({ ...decision, decision: event.target.value as SelectionDecisionValue })}>
                {selectionDecisions.map((item) => <option key={item}>{item}</option>)}
              </Select>
            </Field>
            <Field label="Fitness score">
              <Input type="number" value={decision.fitnessScore || suggestedEvaluation.fitnessScore} onChange={(event) => setDecision({ ...decision, fitnessScore: Number(event.target.value) })} />
              <p className="mt-1 text-xs text-muted-foreground">
                Suggested: {suggestedEvaluation.fitnessScore}/100 - {suggestedEvaluation.recommendation}
                {suggestedEvaluation.isIncomplete ? ` (${suggestedEvaluation.scoreCompletenessPercent}% complete)` : ""}
              </p>
            </Field>
            <Field label="Decided by">
              <Input value={decision.decidedBy} onChange={(event) => setDecision({ ...decision, decidedBy: event.target.value })} />
            </Field>
          </div>
          <Field label="Rationale">
            <Textarea value={decision.rationale} onChange={(event) => setDecision({ ...decision, rationale: event.target.value })} />
          </Field>
          <Field label="Next action">
            <Textarea value={decision.nextAction} onChange={(event) => setDecision({ ...decision, nextAction: event.target.value })} />
          </Field>
          <Button type="button" variant="gold" onClick={saveDecision}>
            <Target className="h-4 w-4" />
            Save Decision
          </Button>
        </CardContent>
      </Card>
      <RecordGrid
        emptyLabel="No selection decisions yet."
        items={data.decisions.map((item) => ({
          id: item.id,
          title: data.offers.find((offer) => offer.id === item.offerVariantId)?.title ?? "Unknown offer",
          badge: `${item.decision} - ${item.fitnessScore}/100`,
          body: item.rationale,
          meta: item.nextAction,
          kind: "decision" as const,
        }))}
        onDelete={onRefresh}
      />
    </CrudShell>
  );
}

function GenomeView({
  data,
  notice,
  onRefresh,
}: {
  data: AdaptiveGrowthData;
  notice: string;
  onRefresh: () => Promise<void>;
}) {
  const [item, setItem] = useState<LearningGenomeItem>(
    normalizeLearningGenomeItem({ type: "Winning Pattern" }),
  );
  const [tagText, setTagText] = useState("");
  const [status, setStatus] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState("");
  const [sourceOfferFilter, setSourceOfferFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const sectors = Array.from(
    new Set(data.offers.map((offer) => offer.sector).filter(Boolean)),
  ).sort();
  const filteredGenomeItems = data.genomeItems
    .filter((genomeItem) => !typeFilter || genomeItem.type === typeFilter)
    .filter((genomeItem) => !statusFilter || genomeItem.status === statusFilter)
    .filter(
      (genomeItem) =>
        !sourceOfferFilter || genomeItem.sourceOfferVariantId === sourceOfferFilter,
    )
    .filter((genomeItem) => {
      if (!sectorFilter) return true;
      const offer = data.offers.find(
        (candidate) => candidate.id === genomeItem.sourceOfferVariantId,
      );
      return offer?.sector === sectorFilter || genomeItem.tags.includes(sectorFilter);
    })
    .filter((genomeItem) => {
      if (!confidenceFilter) return true;
      return Number(genomeItem.confidenceScore ?? 0) >= Number(confidenceFilter);
    });

  async function saveItem() {
    await saveGrowthRecord("genome", { ...item, tags: normalizeTags(tagText) });
    setItem(normalizeLearningGenomeItem({ type: "Winning Pattern" }));
    setTagText("");
    setStatus("Learning genome item saved.");
    await onRefresh();
  }

  return (
    <CrudShell
      title="Learning Genome"
      description="Replication: store reusable patterns that can be adapted into new sectors, formats, and markets."
      notice={notice}
      status={status}
    >
      <ReplicationPanel data={data} onRefresh={onRefresh} />

      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>New Genome Item</CardTitle>
          <CardDescription>Capture what worked, failed, sold, delivered well, or should be reused.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Title">
            <Input value={item.title} onChange={(event) => setItem({ ...item, title: event.target.value })} />
          </Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Type">
              <Select value={item.type} onChange={(event) => setItem({ ...item, type: event.target.value as GenomeItemType })}>
                {genomeItemTypes.map((value) => <option key={value}>{value}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={item.status} onChange={(event) => setItem({ ...item, status: event.target.value as GenomeItemStatus })}>
                {genomeItemStatuses.map((value) => <option key={value}>{value}</option>)}
              </Select>
            </Field>
            <Field label="Confidence score">
              <Input type="number" value={item.confidenceScore ?? ""} onChange={(event) => setItem({ ...item, confidenceScore: Number(event.target.value) })} />
            </Field>
            <Field label="Source offer">
              <Select value={item.sourceOfferVariantId ?? ""} onChange={(event) => setItem({ ...item, sourceOfferVariantId: event.target.value || null })}>
                <option value="">No offer</option>
                {data.offers.map((offer) => <option key={offer.id} value={offer.id}>{offer.title}</option>)}
              </Select>
            </Field>
            <Field label="Source experiment">
              <Select value={item.sourceExperimentId ?? ""} onChange={(event) => setItem({ ...item, sourceExperimentId: event.target.value || null })}>
                <option value="">No experiment</option>
                {data.experiments.map((experiment) => <option key={experiment.id} value={experiment.id}>{experimentTitle(experiment, data.offers)}</option>)}
              </Select>
            </Field>
            <Field label="Tags">
              <Input value={tagText} onChange={(event) => setTagText(event.target.value)} />
            </Field>
          </div>
          <Field label="Content">
            <Textarea value={item.content} onChange={(event) => setItem({ ...item, content: event.target.value })} />
          </Field>
          <Button type="button" variant="gold" onClick={saveItem}>
            <BrainCircuit className="h-4 w-4" />
            Save Genome Item
          </Button>
        </CardContent>
      </Card>
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>Learning Genome Library</CardTitle>
          <CardDescription>
            Filter reusable patterns, failed patterns, sales language, pricing insights, and training assets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            <Field label="Type">
              <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="">All types</option>
                {genomeItemTypes.map((value) => <option key={value}>{value}</option>)}
              </Select>
            </Field>
            <Field label="Sector">
              <Select value={sectorFilter} onChange={(event) => setSectorFilter(event.target.value)}>
                <option value="">All sectors</option>
                {sectors.map((sector) => <option key={sector}>{sector}</option>)}
              </Select>
            </Field>
            <Field label="Confidence">
              <Select value={confidenceFilter} onChange={(event) => setConfidenceFilter(event.target.value)}>
                <option value="">Any confidence</option>
                <option value="80">80+</option>
                <option value="60">60+</option>
                <option value="40">40+</option>
              </Select>
            </Field>
            <Field label="Source offer">
              <Select value={sourceOfferFilter} onChange={(event) => setSourceOfferFilter(event.target.value)}>
                <option value="">All offers</option>
                {data.offers.map((offer) => <option key={offer.id} value={offer.id}>{offer.title}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">All statuses</option>
                {genomeItemStatuses.map((value) => <option key={value}>{value}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {filteredGenomeItems.length ? (
              filteredGenomeItems.map((genomeItem) => (
                <GenomeItemCard key={genomeItem.id} item={genomeItem} onRefresh={onRefresh} />
              ))
            ) : (
              <EmptyCard label="No learning genome items match these filters." />
            )}
          </div>
        </CardContent>
      </Card>
    </CrudShell>
  );
}

function winningDecisionOptions(data: AdaptiveGrowthData) {
  return data.decisions
    .filter((decision) =>
      ["Scale", "Productize", "Bundle", "Partner", "Park", "Kill"].includes(decision.decision),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function ReplicationPanel({
  data,
  onRefresh,
}: {
  data: AdaptiveGrowthData;
  onRefresh: () => Promise<void>;
}) {
  const decisions = winningDecisionOptions(data);
  const [decisionId, setDecisionId] = useState(decisions[0]?.id ?? "");
  const selectedDecision = data.decisions.find((decision) => decision.id === decisionId);
  const selectedOffer = selectedDecision
    ? data.offers.find((offer) => offer.id === selectedDecision.offerVariantId)
    : null;
  const isFailure =
    selectedDecision?.decision === "Kill" || selectedDecision?.decision === "Park";
  const [includePackageAssets, setIncludePackageAssets] = useState(true);
  const [includeSalesAssets, setIncludeSalesAssets] = useState(true);
  const [includeDeliveryAssets, setIncludeDeliveryAssets] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState("");
  const [isReplicating, setIsReplicating] = useState(false);

  useEffect(() => {
    if (!decisionId && decisions[0]?.id) {
      setDecisionId(decisions[0].id);
    }
  }, [decisionId, decisions]);

  async function replicateOffer() {
    if (!selectedDecision || !selectedOffer) {
      setStatus("Select a selection decision first.");
      return;
    }

    setIsReplicating(true);
    setStatus("");

    try {
      const response = await fetch("/api/adaptive-growth/replicate-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offer_variant_id: selectedOffer.id,
          selection_decision_id: selectedDecision.id,
          include_package_assets: includePackageAssets,
          include_sales_assets: includeSalesAssets,
          include_delivery_assets: includeDeliveryAssets,
          feedback,
        }),
      });
      const payload = (await response.json()) as {
        createdGenomeItems?: LearningGenomeItem[];
        createdTemplates?: Array<{ title: string }>;
        recommendedExpansionPaths?: string[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Offer replication failed.");
      }

      setStatus(
        `${isFailure ? "Failed pattern recorded" : "Offer replicated"}: ${payload.createdGenomeItems?.length ?? 0} genome items and ${payload.createdTemplates?.length ?? 0} internal knowledge templates created.`,
      );
      setFeedback("");
      await onRefresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Offer replication failed.");
    } finally {
      setIsReplicating(false);
    }
  }

  return (
    <Card className="border-teal-300/20 bg-teal-300/10 shadow-executive">
      <CardHeader>
        <div className="mb-2 flex flex-wrap gap-2">
          <Badge variant="teal">Replication Engine</Badge>
          <Badge variant="outline">Business DNA</Badge>
        </div>
        <CardTitle>Replicate a Winning Offer</CardTitle>
        <CardDescription>
          Turn selected offers into templates, sales language, delivery assets, and searchable genome items.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Selection decision">
          <Select value={decisionId} onChange={(event) => setDecisionId(event.target.value)}>
            <option value="">Select decision</option>
            {decisions.map((decision) => {
              const offer = data.offers.find((item) => item.id === decision.offerVariantId);
              return (
                <option key={decision.id} value={decision.id}>
                  {offer?.title ?? "Unknown offer"} - {decision.decision} ({decision.fitnessScore}/100)
                </option>
              );
            })}
          </Select>
        </Field>
        {isFailure ? (
          <p className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-50">
            Parked and killed offers become Failed Pattern genome items so future generation can avoid repeating weak offers without stronger evidence.
          </p>
        ) : null}
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#07111f]/55 p-3 text-sm text-slate-200">
            <input type="checkbox" checked={includePackageAssets} onChange={(event) => setIncludePackageAssets(event.target.checked)} />
            Package assets
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#07111f]/55 p-3 text-sm text-slate-200">
            <input type="checkbox" checked={includeSalesAssets} onChange={(event) => setIncludeSalesAssets(event.target.checked)} />
            Sales assets
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#07111f]/55 p-3 text-sm text-slate-200">
            <input type="checkbox" checked={includeDeliveryAssets} onChange={(event) => setIncludeDeliveryAssets(event.target.checked)} />
            Delivery assets
          </label>
        </div>
        <Field label={isFailure ? "Why should this pattern be avoided?" : "Feedback or evidence to include"}>
          <Textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} />
        </Field>
        <Button type="button" variant="gold" onClick={replicateOffer} disabled={isReplicating || !decisionId}>
          {isReplicating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers3 className="h-4 w-4" />}
          {isFailure ? "Record Failed Pattern" : "Replicate Offer"}
        </Button>
        {status ? <p className="text-sm text-teal-50">{status}</p> : null}
      </CardContent>
    </Card>
  );
}

function templateTitleForGenome(item: LearningGenomeItem, mode: string) {
  const label: Record<string, string> = {
    package: "Package template",
    prompt: "Prompt template suggestion",
    proposal: "Proposal snippet",
    sales: "Sales follow-up snippet",
    knowledge: "Learning genome",
  };

  return `${label[mode] ?? "Template"}: ${item.title}`;
}

async function createKnowledgeTemplateFromGenome(
  item: LearningGenomeItem,
  mode: "package" | "prompt" | "proposal" | "sales" | "knowledge",
) {
  const typeMap = {
    package: "SOP",
    prompt: "Prompt Template",
    proposal: "Proposal",
    sales: "Proposal",
    knowledge: item.type === "Training Activity" ? "Exercise" : "Other",
  } as const;

  const response = await fetch("/api/knowledge-documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: templateTitleForGenome(item, mode),
      type: typeMap[mode],
      content: [
        item.content,
        "",
        `Source genome item: ${item.title}`,
        "Visibility: Internal by default. Mark Client-safe only after human review.",
      ].join("\n"),
      tags: ["learning-genome", mode, ...item.tags],
      source: `Learning genome item: ${item.id}`,
      visibility: "Internal",
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Template creation failed.");
  }
}

function GenomeItemCard({
  item,
  onRefresh,
}: {
  item: LearningGenomeItem;
  onRefresh: () => Promise<void>;
}) {
  const [status, setStatus] = useState("");
  const isActive = item.status === "Active";

  async function createTemplate(mode: "package" | "prompt" | "proposal" | "sales" | "knowledge") {
    try {
      await createKnowledgeTemplateFromGenome(item, mode);

      if (mode === "prompt") {
        await saveGrowthRecord("genome", {
          title: `Prompt improvement suggestion: ${item.title}`,
          type: "Prompt Improvement",
          content: `Use this genome item to improve the relevant agent prompt after human review:\n\n${item.content}`,
          sourceOfferVariantId: item.sourceOfferVariantId,
          sourceExperimentId: item.sourceExperimentId,
          tags: ["prompt-suggestion", ...item.tags],
          confidenceScore: item.confidenceScore ?? 60,
          status: "Draft",
        });
      }

      setStatus(`${templateTitleForGenome(item, mode)} created as Internal knowledge.`);
      await onRefresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Template creation failed.");
    }
  }

  return (
    <Card className="border-white/10 bg-[#07111f]/55">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={isActive ? "teal" : "outline"}>{item.status}</Badge>
              <Badge variant="outline">{item.type}</Badge>
              {item.confidenceScore !== null ? <Badge variant="gold">{item.confidenceScore}/100</Badge> : null}
            </div>
            <CardTitle className="mt-3 text-lg">{item.title}</CardTitle>
            <CardDescription>{item.tags.join(" - ") || "No tags"}</CardDescription>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={async () => { await deleteGrowthRecord("genome", item.id); await onRefresh(); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="line-clamp-5 text-sm leading-6 text-muted-foreground">{item.content}</p>
        {isActive ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => createTemplate("package")}>Package Template</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => createTemplate("proposal")}>Proposal Snippet</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => createTemplate("sales")}>Sales Snippet</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => createTemplate("prompt")}>Prompt Suggestion</Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Activate this genome item before creating reusable templates.</p>
        )}
        {status ? <p className="text-sm text-teal-50">{status}</p> : null}
      </CardContent>
    </Card>
  );
}

export function AdaptiveGrowthPackageLinkPanel({ pkg }: { pkg: TrainingPackage }) {
  const { data, refresh } = useAdaptiveGrowthData();
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [status, setStatus] = useState("");

  async function linkPackageToOffer() {
    const offer = data.offers.find((item) => item.id === selectedOfferId);
    if (!offer) {
      setStatus("Select an offer variant.");
      return;
    }

    await saveGrowthRecord("genome", {
      title: `Package template: ${pkg.title}`,
      type: "Proposal Language",
      content: `Training package "${pkg.title}" is linked to offer variant "${offer.title}". Reuse syllabus, proposal language, workbook, and commercial framing where applicable.`,
      sourceOfferVariantId: offer.id,
      tags: ["package-template", pkg.client, pkg.audience].filter(Boolean),
      confidenceScore: 70,
      status: "Draft",
    });
    await refresh();
    setStatus("Package linked to offer variant as a draft learning genome item.");
  }

  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardTitle>Adaptive Growth Link</CardTitle>
        <CardDescription>
          Connect this package to an offer variant so winners can become reusable templates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Select value={selectedOfferId} onChange={(event) => setSelectedOfferId(event.target.value)}>
            <option value="">Select offer variant</option>
            {data.offers.map((offer) => <option key={offer.id} value={offer.id}>{offer.title}</option>)}
          </Select>
          <Button type="button" variant="outline" onClick={linkPackageToOffer}>
            Link to Offer Variant
          </Button>
        </div>
        {status ? <p className="text-sm text-teal-50">{status}</p> : null}
      </CardContent>
    </Card>
  );
}

function OfferCard({
  offer,
  data,
  onRefresh,
}: {
  offer: OfferVariant;
  data: AdaptiveGrowthData;
  onRefresh: () => Promise<void>;
}) {
  const packageHref = `/packages/new?courseTitle=${encodeURIComponent(offer.title)}&audience=${encodeURIComponent(offer.targetAudience)}&duration=${encodeURIComponent(offer.duration)}&client=${encodeURIComponent(offer.sector || "Market")}&promise=${encodeURIComponent(offer.promise)}&context=${encodeURIComponent(`${offer.description}\n\nSector: ${offer.sector}\nFormat: ${offer.format}`)}&tone=${encodeURIComponent("Executive, practical, market-tested")}&offerVariantId=${encodeURIComponent(offer.id)}`;

  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <Badge variant={offer.status === "Scaling" || offer.status === "Selected" ? "teal" : "outline"}>{offer.status}</Badge>
            <CardTitle className="mt-3 text-lg">{offer.title}</CardTitle>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={async () => { await deleteGrowthRecord("offer", offer.id); await onRefresh(); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>{offer.format} - {offer.duration || "Duration TBD"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">{offer.promise || offer.description}</p>
        <OfferFitnessCard offer={offer} data={data} onRefresh={onRefresh} />
        <Button asChild variant="gold" size="sm">
          <Link href={packageHref}>
            <Plus className="h-4 w-4" />
            Create Training Package from Offer
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function latestExperimentForOffer(offer: OfferVariant, data: AdaptiveGrowthData) {
  return (
    data.experiments
      .filter((experiment) => experiment.offerVariantId === offer.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
  );
}

function latestMetricsForExperiment(
  experiment: GrowthExperiment | null,
  data: AdaptiveGrowthData,
) {
  if (!experiment) return null;

  return (
    data.metrics
      .filter((metric) => metric.experimentId === experiment.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
  );
}

function evaluateOfferFromData(offer: OfferVariant, data: AdaptiveGrowthData) {
  const experiment = latestExperimentForOffer(offer, data);
  const metrics = latestMetricsForExperiment(experiment, data);
  const signal = offer.signalId
    ? data.signals.find((item) => item.id === offer.signalId) ?? null
    : null;

  return {
    experiment,
    metrics,
    signal,
    fitness: calculateOfferFitness({ offer, signal, experiment, metrics }),
  };
}

function nextActionForRecommendation(recommendation: SelectionDecisionValue) {
  const map: Record<SelectionDecisionValue, string> = {
    Scale: "Package this offer, prepare sales assets, and identify the next 3 target clients.",
    Productize: "Turn the offer into a reusable template, sales page, and delivery checklist.",
    Iterate: "Run one sharper test with a clearer audience, promise, or channel.",
    Park: "Pause active selling until stronger market pull or strategic fit appears.",
    Kill: "Stop investing in this variant and capture the learning before moving on.",
    Bundle: "Combine this offer with a stronger adjacent offer before the next test.",
    Partner: "Explore one partner channel before committing internal resources.",
  };

  return map[recommendation];
}

function OfferFitnessCard({
  offer,
  data,
  onRefresh,
}: {
  offer: OfferVariant;
  data: AdaptiveGrowthData;
  onRefresh: () => Promise<void>;
}) {
  const localEvaluation = evaluateOfferFromData(offer, data);
  const [evaluation, setEvaluation] = useState<FitnessEvaluationResult>(
    localEvaluation.fitness,
  );
  const [rationale, setRationale] = useState(localEvaluation.fitness.rationale);
  const [status, setStatus] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);

  useEffect(() => {
    const next = evaluateOfferFromData(offer, data).fitness;
    setEvaluation(next);
    setRationale(next.rationale);
  }, [offer, data]);

  async function evaluateWithApi() {
    setIsEvaluating(true);
    setStatus("");

    try {
      const response = await fetch("/api/adaptive-growth/evaluate-fitness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offer_variant_id: offer.id,
          experiment_id: localEvaluation.experiment?.id ?? undefined,
        }),
      });
      const payload = (await response.json()) as
        | (FitnessEvaluationResult & { rationale?: string; error?: string })
        | { error?: string };

      if (!response.ok || "error" in payload && payload.error) {
        throw new Error(payload.error ?? "Fitness evaluation failed.");
      }

      setEvaluation(payload as FitnessEvaluationResult);
      setRationale(
        "rationale" in payload && payload.rationale
          ? payload.rationale
          : (payload as FitnessEvaluationResult).rationale,
      );
      setStatus("Fitness evaluated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Fitness evaluation failed.");
    } finally {
      setIsEvaluating(false);
    }
  }

  async function createSelectionDecision() {
    await saveGrowthRecord("decision", {
      offerVariantId: offer.id,
      experimentId: localEvaluation.experiment?.id ?? null,
      decision: evaluation.recommendation,
      fitnessScore: evaluation.fitnessScore,
      rationale,
      nextAction: nextActionForRecommendation(evaluation.recommendation),
      decidedBy: "DG Academy",
    });
    setStatus("Selection decision created.");
    await onRefresh();
  }

  return (
    <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Fitness score
          </div>
          <div className="mt-1 text-3xl font-semibold text-white">
            {evaluation.fitnessScore}
            <span className="text-base text-muted-foreground">/100</span>
          </div>
        </div>
        <Badge
          variant={
            evaluation.recommendation === "Scale" ||
            evaluation.recommendation === "Productize"
              ? "teal"
              : evaluation.recommendation === "Kill"
                ? "destructive"
                : "outline"
          }
        >
          {evaluation.recommendation}
        </Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{rationale}</p>
      {evaluation.isIncomplete ? (
        <p className="mt-2 text-xs text-amber-200">
          Incomplete score: {evaluation.scoreCompletenessPercent}% evidence available.
        </p>
      ) : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {evaluation.componentDetails.map((component) => (
          <div key={component.key} className="rounded-md border border-white/10 p-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">{component.label}</span>
              <span className="font-semibold text-white">
                {component.score === null ? "Missing" : `${component.score}/100`}
              </span>
            </div>
          </div>
        ))}
      </div>
      {evaluation.missingDataWarnings.length ? (
        <ul className="mt-3 space-y-1 text-xs text-amber-100">
          {evaluation.missingDataWarnings.slice(0, 3).map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={evaluateWithApi} disabled={isEvaluating}>
          {isEvaluating ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
          Evaluate Fitness
        </Button>
        <Button type="button" variant="gold" size="sm" onClick={createSelectionDecision}>
          <Target className="h-4 w-4" />
          Create Selection Decision
        </Button>
      </div>
      {status ? <p className="mt-3 text-sm text-teal-50">{status}</p> : null}
    </div>
  );
}

function RecordGrid({
  items,
  emptyLabel,
  onDelete,
}: {
  items: Array<{
    id: string;
    title: string;
    badge: string;
    body: string;
    meta: string;
    kind: AdaptiveGrowthKind;
    actionHref?: string;
    actionLabel?: string;
  }>;
  emptyLabel: string;
  onDelete: () => Promise<void>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.length ? (
        items.map((item) => (
          <Card key={item.id} className="border-white/10 bg-white/[0.04] shadow-executive">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge variant="outline">{item.badge}</Badge>
                  <CardTitle className="mt-3 text-lg">{item.title}</CardTitle>
                  <CardDescription>{item.meta}</CardDescription>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={async () => { await deleteGrowthRecord(item.kind, item.id); await onDelete(); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">{item.body}</p>
              {item.actionHref ? (
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href={item.actionHref}>
                    <Sparkles className="h-4 w-4" />
                    {item.actionLabel ?? "Open"}
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))
      ) : (
        <EmptyCard label={emptyLabel} />
      )}
    </div>
  );
}

function CrudShell({
  title,
  description,
  notice,
  status,
  children,
}: {
  title: string;
  description: string;
  notice: string;
  status: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <Card className="border-teal-300/20 bg-teal-300/10 shadow-executive">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-teal-50/90">{notice}</p>
          {status ? <p className="text-sm font-medium text-teal-50">{status}</p> : null}
        </CardContent>
      </Card>
      {children}
    </div>
  );
}

function experimentTitle(experiment: GrowthExperiment, offers: OfferVariant[]) {
  const offer = offers.find((item) => item.id === experiment.offerVariantId);
  return offer ? `${offer.title} - ${experiment.testMethod || "Experiment"}` : experiment.hypothesis || "Experiment";
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-2 font-mono text-2xl font-semibold text-white">{value}</div>
      </CardContent>
    </Card>
  );
}

function EmptyCard({ label }: { label: string }) {
  return (
    <Card className="border-dashed border-white/15 bg-white/[0.03] shadow-executive">
      <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
        <ClipboardList className="h-5 w-5 text-teal-100" />
        {label}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-white">{label}</span>
      {children}
    </label>
  );
}
