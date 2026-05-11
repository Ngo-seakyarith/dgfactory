"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, FileJson, Loader2, RefreshCw, Send, X } from "lucide-react";

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
  buildCodexPrompt,
  improvementCategories,
  improvementSourceTypes,
  improvementStatuses,
  type ImprovementCategory,
  type ImprovementOpportunity,
  type ImprovementSourceType,
  type ImprovementStatus,
  type RalphStory,
} from "@/lib/improvements";

type ImprovementPayload = {
  opportunities?: ImprovementOpportunity[];
  opportunity?: ImprovementOpportunity;
  error?: string;
  codexPrompt?: string;
  story?: RalphStory;
  storyContent?: string;
  written?: boolean;
  message?: string;
};

const emptyOpportunity: Partial<ImprovementOpportunity> = {
  sourceType: "Other",
  category: "Product Feature",
  priority: 3,
  status: "Suggested",
};

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export function ImprovementsWorkspace() {
  const [opportunities, setOpportunities] = useState<ImprovementOpportunity[]>([]);
  const [selected, setSelected] = useState<ImprovementOpportunity | null>(null);
  const [draft, setDraft] = useState<Partial<ImprovementOpportunity>>(emptyOpportunity);
  const [sourceFilter, setSourceFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceSummary, setSourceSummary] = useState("");
  const [notice, setNotice] = useState("Loading improvement opportunities...");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const filtered = useMemo(
    () =>
      opportunities
        .filter((item) => !sourceFilter || item.sourceType === sourceFilter)
        .filter((item) => !categoryFilter || item.category === categoryFilter)
        .filter((item) => !statusFilter || item.status === statusFilter),
    [opportunities, sourceFilter, categoryFilter, statusFilter],
  );

  async function refresh() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/improvements", { cache: "no-store" });
      const payload = (await response.json()) as ImprovementPayload;

      if (!response.ok || !payload.opportunities) {
        throw new Error(payload.error ?? "Improvements could not load.");
      }

      setOpportunities(payload.opportunities);
      setSelected((current) =>
        current
          ? payload.opportunities?.find((item) => item.id === current.id) ?? null
          : payload.opportunities?.[0] ?? null,
      );
      setNotice("Improvement opportunities loaded.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Improvements could not load.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function saveDraft() {
    const response = await fetch("/api/improvements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...draft,
        suggestedFiles:
          typeof draft.suggestedFiles === "string"
            ? draft.suggestedFiles
            : draft.suggestedFiles,
        acceptanceCriteria:
          typeof draft.acceptanceCriteria === "string"
            ? draft.acceptanceCriteria
            : draft.acceptanceCriteria,
      }),
    });
    const payload = (await response.json()) as ImprovementPayload;

    if (!response.ok || !payload.opportunity) {
      setNotice(payload.error ?? "Improvement save failed.");
      return;
    }

    setDraft(emptyOpportunity);
    setSelected(payload.opportunity);
    setNotice("Improvement opportunity saved.");
    await refresh();
  }

  async function generateOpportunity() {
    if (!sourceSummary.trim()) {
      setNotice("Add source learning before generating.");
      return;
    }

    setIsGenerating(true);
    setNotice("");

    try {
      const response = await fetch("/api/improvements/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: draft.sourceType ?? "Other",
          sourceSummary,
          context: draft.description ?? "",
        }),
      });
      const payload = (await response.json()) as ImprovementPayload & {
        mode?: string;
      };

      if (!response.ok || !payload.opportunity) {
        throw new Error(payload.error ?? "Improvement generation failed.");
      }

      setSourceSummary("");
      setSelected(payload.opportunity);
      setNotice(`Improvement generated in ${payload.mode ?? "mock"} mode.`);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Improvement generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function updateOpportunity(
    id: string,
    patch: Partial<ImprovementOpportunity>,
  ) {
    const response = await fetch(`/api/improvements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const payload = (await response.json()) as ImprovementPayload;

    if (!response.ok || !payload.opportunity) {
      setNotice(payload.error ?? "Improvement update failed.");
      return;
    }

    setSelected(payload.opportunity);
    setNotice("Improvement updated.");
    await refresh();
  }

  async function convertToPrd(id: string) {
    const response = await fetch(`/api/improvements/${id}/convert-to-prd`, {
      method: "POST",
    });
    const payload = (await response.json()) as ImprovementPayload;

    if (!response.ok) {
      setNotice(payload.error ?? "PRD conversion failed.");
      return;
    }

    setNotice(
      payload.written
        ? `Converted to Ralph story ${payload.story?.id}.`
        : `PRD story generated but not written. ${payload.message ?? ""}`,
    );
    if (payload.opportunity) setSelected(payload.opportunity);
    await refresh();
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-teal-300/20 bg-teal-300/10 p-6 shadow-executive">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
              RALPH Business + Software Self-Improvement
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">
              Improvement Opportunities
            </h1>
            <p className="mt-3 text-sm leading-7 text-teal-50/80">
              Convert user feedback, QA results, growth loops, eval failures, and
              learning genome insights into Codex-ready one-story improvements.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/improvements/ralph">
              <FileJson className="h-4 w-4" />
              Ralph Dashboard
            </Link>
          </Button>
        </div>
      </section>

      {notice ? (
        <p className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-3 text-sm text-teal-50">
          {notice}
        </p>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle>Create Opportunity</CardTitle>
            <CardDescription>
              Create manually or let the Improvement Agent draft one from a learning.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Source">
                <Select
                  value={draft.sourceType}
                  onChange={(event) =>
                    setDraft({ ...draft, sourceType: event.target.value as ImprovementSourceType })
                  }
                >
                  {improvementSourceTypes.map((item) => <option key={item}>{item}</option>)}
                </Select>
              </Field>
              <Field label="Category">
                <Select
                  value={draft.category}
                  onChange={(event) =>
                    setDraft({ ...draft, category: event.target.value as ImprovementCategory })
                  }
                >
                  {improvementCategories.map((item) => <option key={item}>{item}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Source learning for agent">
              <Textarea
                value={sourceSummary}
                onChange={(event) => setSourceSummary(event.target.value)}
                placeholder="Example: weekly_selection_review repeatedly recommends scaling offers, but users need clearer approval links."
              />
            </Field>
            <Button type="button" variant="gold" onClick={generateOpportunity} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Generate Improvement
            </Button>

            <div className="border-t border-white/10 pt-4">
              <Field label="Title">
                <Input
                  value={draft.title ?? ""}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                />
              </Field>
              <Field label="Description">
                <Textarea
                  value={draft.description ?? ""}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Priority">
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={draft.priority ?? 3}
                    onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) })}
                  />
                </Field>
                <Field label="Status">
                  <Select
                    value={draft.status}
                    onChange={(event) => setDraft({ ...draft, status: event.target.value as ImprovementStatus })}
                  >
                    {improvementStatuses.map((item) => <option key={item}>{item}</option>)}
                  </Select>
                </Field>
              </div>
              <Field label="Recommended action">
                <Textarea
                  value={draft.recommendedAction ?? ""}
                  onChange={(event) => setDraft({ ...draft, recommendedAction: event.target.value })}
                />
              </Field>
              <Button type="button" variant="outline" onClick={saveDraft}>
                Save Opportunity
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border-white/10 bg-white/[0.04] shadow-executive">
            <CardHeader>
              <CardTitle>Opportunity List</CardTitle>
              <CardDescription>
                Approve, reject, convert, or export Codex prompts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Source">
                  <Select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
                    <option value="">All sources</option>
                    {improvementSourceTypes.map((item) => <option key={item}>{item}</option>)}
                  </Select>
                </Field>
                <Field label="Category">
                  <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                    <option value="">All categories</option>
                    {improvementCategories.map((item) => <option key={item}>{item}</option>)}
                  </Select>
                </Field>
                <Field label="Status">
                  <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="">All statuses</option>
                    {improvementStatuses.map((item) => <option key={item}>{item}</option>)}
                  </Select>
                </Field>
              </div>
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading improvements...
                </div>
              ) : filtered.length ? (
                <div className="grid gap-3">
                  {filtered.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setSelected(item)}
                      className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4 text-left transition hover:border-teal-300/40"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={item.status === "Approved" ? "teal" : "outline"}>{item.status}</Badge>
                            <Badge variant="gold">P{item.priority}</Badge>
                          </div>
                          <div className="mt-3 font-semibold text-white">{item.title}</div>
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground">{item.category}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-white/15 bg-[#07111f]/45 p-4 text-sm text-muted-foreground">
                  No improvement opportunities match these filters.
                </div>
              )}
            </CardContent>
          </Card>

          {selected ? (
            <ImprovementDetail
              opportunity={selected}
              onUpdate={updateOpportunity}
              onConvert={convertToPrd}
              onNotice={setNotice}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

function ImprovementDetail({
  opportunity,
  onUpdate,
  onConvert,
  onNotice,
}: {
  opportunity: ImprovementOpportunity;
  onUpdate: (id: string, patch: Partial<ImprovementOpportunity>) => Promise<void>;
  onConvert: (id: string) => Promise<void>;
  onNotice: (notice: string) => void;
}) {
  const [prompt, setPrompt] = useState(buildCodexPrompt(opportunity));

  useEffect(() => {
    setPrompt(buildCodexPrompt(opportunity));
  }, [opportunity]);

  async function copyPrompt() {
    await copyText(prompt);
    onNotice("Codex prompt copied.");
  }

  async function savePrompt() {
    await onUpdate(opportunity.id, { codexPrompt: prompt });
  }

  return (
    <Card className="border-teal-300/20 bg-teal-300/10 shadow-executive">
      <CardHeader>
        <div className="flex flex-wrap gap-2">
          <Badge variant="teal">{opportunity.sourceType}</Badge>
          <Badge variant="outline">{opportunity.category}</Badge>
          <Badge variant="gold">Priority {opportunity.priority}</Badge>
        </div>
        <CardTitle className="mt-3">{opportunity.title}</CardTitle>
        <CardDescription>{opportunity.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Button type="button" variant="outline" onClick={() => onUpdate(opportunity.id, { status: "Approved" })}>
            <Check className="h-4 w-4" />
            Approve
          </Button>
          <Button type="button" variant="outline" onClick={() => onUpdate(opportunity.id, { status: "Rejected" })}>
            <X className="h-4 w-4" />
            Reject
          </Button>
          <Button type="button" variant="outline" onClick={() => onUpdate(opportunity.id, { status: "Implemented" })}>
            <Check className="h-4 w-4" />
            Mark Implemented
          </Button>
        </div>
        <Field label="Codex-ready prompt">
          <Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={14} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={savePrompt}>
            Save Prompt
          </Button>
          <Button type="button" variant="outline" onClick={copyPrompt}>
            <Clipboard className="h-4 w-4" />
            Export Codex Prompt
          </Button>
          <Button
            type="button"
            variant="gold"
            onClick={() => onConvert(opportunity.id)}
            disabled={opportunity.status !== "Approved" && opportunity.status !== "Converted to PRD"}
          >
            <Send className="h-4 w-4" />
            Convert to Ralph Story
          </Button>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
          <div className="font-semibold text-white">Acceptance criteria</div>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
            {opportunity.acceptanceCriteria.map((item) => <li key={item}>- {item}</li>)}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export function RalphDashboard() {
  const [data, setData] = useState<{
    pendingStories?: RalphStory[];
    completedStories?: RalphStory[];
    suggestedNextStory?: RalphStory | null;
    latestProgressNotes?: string[];
    suggestedImprovements?: ImprovementOpportunity[];
    prdAccessible?: boolean;
    progressAccessible?: boolean;
  }>({});
  const [notice, setNotice] = useState("Loading Ralph dashboard...");

  async function refresh() {
    const response = await fetch("/api/improvements/ralph", { cache: "no-store" });
    const payload = await response.json();
    setData(payload);
    setNotice("Ralph dashboard loaded.");
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-teal-300/20 bg-teal-300/10 p-6 shadow-executive">
        <h1 className="text-3xl font-semibold text-white">Ralph Dashboard</h1>
        <p className="mt-3 text-sm leading-7 text-teal-50/80">
          Read the current `tasks/prd.json`, recent progress notes, and the next
          recommended one-story Codex task. Production UI never runs Codex directly.
        </p>
      </section>
      <p className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-3 text-sm text-teal-50">
        {notice} PRD accessible: {data.prdAccessible ? "yes" : "no"}. Progress accessible: {data.progressAccessible ? "yes" : "no"}.
      </p>
      <section className="grid gap-5 lg:grid-cols-3">
        <StoryCard title="Suggested Next Story" stories={data.suggestedNextStory ? [data.suggestedNextStory] : []} />
        <StoryCard title="Pending Stories" stories={data.pendingStories ?? []} />
        <StoryCard title="Completed Stories" stories={data.completedStories ?? []} />
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle>Latest Progress Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-6 text-muted-foreground">
            {data.latestProgressNotes?.length ? data.latestProgressNotes.map((note) => <div key={note}>{note}</div>) : "No progress notes found."}
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle>Suggested Improvements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.suggestedImprovements?.length ? data.suggestedImprovements.map((item) => (
              <div key={item.id} className="rounded-lg border border-white/10 bg-[#07111f]/55 p-3">
                <Badge variant="outline">{item.status}</Badge>
                <div className="mt-2 text-sm font-semibold text-white">{item.title}</div>
              </div>
            )) : <div className="text-sm text-muted-foreground">No suggested improvements.</div>}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StoryCard({ title, stories }: { title: string; stories: RalphStory[] }) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stories.length ? stories.map((story) => (
          <div key={story.id} className="rounded-lg border border-white/10 bg-[#07111f]/55 p-3">
            <Badge variant={story.passes ? "teal" : "gold"}>{story.passes ? "Done" : "Pending"}</Badge>
            <div className="mt-2 text-sm font-semibold text-white">{story.title}</div>
            <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">{story.description}</p>
          </div>
        )) : <div className="text-sm text-muted-foreground">None yet.</div>}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-200">{label}</span>
      {children}
    </label>
  );
}
