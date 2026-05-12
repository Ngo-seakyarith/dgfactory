"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ImprovementOpportunity, RalphStory } from "@/lib/improvements";

export default function RalphDashboardPage() {
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


