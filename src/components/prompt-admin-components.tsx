"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, Check, GitCompare, Loader2, RotateCcw, Sparkles } from "lucide-react";

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
import type {
  PromptTemplate,
  PromptTemplateChange,
} from "@/lib/prompt-templates";

type PromptTemplatePayload = {
  templates?: PromptTemplate[];
  changes?: PromptTemplateChange[];
  template?: PromptTemplate;
  error?: string;
};

export function PromptAdmin() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [changes, setChanges] = useState<PromptTemplateChange[]>([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [compareTemplateId, setCompareTemplateId] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftSystemPrompt, setDraftSystemPrompt] = useState("");
  const [draftUserPrompt, setDraftUserPrompt] = useState("");
  const [approvedBy, setApprovedBy] = useState("Sopheap");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState("");

  async function loadTemplates() {
    setIsLoading(true);
    setNotice("");

    try {
      const response = await fetch("/api/prompt-templates");
      const payload = (await response.json()) as PromptTemplatePayload;

      if (!response.ok || !payload.templates) {
        throw new Error(payload.error ?? "Prompt templates could not load.");
      }

      setTemplates(payload.templates);
      setChanges(payload.changes ?? []);

      const firstAgent = payload.templates[0]?.agentName ?? "";
      setSelectedAgent((current) => current || firstAgent);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Prompt templates failed.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTemplates();
  }, []);

  const agentNames = useMemo(
    () => [...new Set(templates.map((template) => template.agentName))],
    [templates],
  );
  const agentTemplates = useMemo(
    () =>
      templates
        .filter((template) =>
          selectedAgent ? template.agentName === selectedAgent : true,
        )
        .sort((a, b) => b.version - a.version),
    [selectedAgent, templates],
  );
  const activeTemplate = agentTemplates.find(
    (template) => template.status === "Active",
  );
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ??
    activeTemplate ??
    agentTemplates[0];
  const compareTemplate =
    templates.find((template) => template.id === compareTemplateId) ??
    agentTemplates.find((template) => template.id !== selectedTemplate?.id);

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }

    setDraftTitle(`${selectedTemplate.title} draft`);
    setDraftSystemPrompt(selectedTemplate.systemPrompt);
    setDraftUserPrompt(selectedTemplate.userPromptTemplate);
  }, [selectedTemplate]);

  async function createDraft() {
    if (!selectedTemplate) {
      return;
    }

    setIsWorking("draft");
    setNotice("");

    try {
      const response = await fetch("/api/prompt-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceTemplateId: selectedTemplate.id,
          title: draftTitle,
          systemPrompt: draftSystemPrompt,
          userPromptTemplate: draftUserPrompt,
          reason: "Manual admin draft from prompt template page.",
        }),
      });
      const payload = (await response.json()) as PromptTemplatePayload;

      if (!response.ok || !payload.template) {
        throw new Error(payload.error ?? "Draft could not be created.");
      }

      setNotice(`Draft v${payload.template.version} created for ${payload.template.agentName}.`);
      await loadTemplates();
      setSelectedTemplateId(payload.template.id);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Draft could not be created.");
    } finally {
      setIsWorking("");
    }
  }

  async function updateTemplate(
    template: PromptTemplate,
    action: "approve" | "archive" | "rollback",
  ) {
    setIsWorking(`${action}-${template.id}`);
    setNotice("");

    try {
      const response = await fetch(`/api/prompt-templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          approvedBy,
          agentName: template.agentName,
          version: template.version,
          changeSummary:
            action === "rollback"
              ? `Rollback ${template.agentName} to v${template.version}`
              : `${action} ${template.agentName} v${template.version}`,
          reason: "Human-approved prompt template admin action.",
        }),
      });
      const payload = (await response.json()) as PromptTemplatePayload;

      if (!response.ok) {
        throw new Error(payload.error ?? "Prompt template update failed.");
      }

      setNotice(`${template.agentName} v${template.version} ${action} completed.`);
      await loadTemplates();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Prompt template update failed.",
      );
    } finally {
      setIsWorking("");
    }
  }

  if (isLoading) {
    return (
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading prompt templates...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-teal-300/20 bg-teal-300/10 p-6 shadow-executive">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
            V2.2 Prompt System
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">
            Prompt and Template Optimization
          </h1>
          <p className="mt-3 text-sm leading-7 text-teal-50/80">
            Version DG Academy agent prompts, create drafts from feedback, activate
            only after human approval, and roll back when needed.
          </p>
        </div>
      </section>

      {notice ? (
        <p className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-3 text-sm text-teal-50">
          {notice}
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle>Templates</CardTitle>
            <CardDescription>
              One active template per agent. Drafts require approval before use.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={selectedAgent}
              onChange={(event) => {
                setSelectedAgent(event.target.value);
                setSelectedTemplateId("");
                setCompareTemplateId("");
              }}
            >
              {agentNames.map((agentName) => (
                <option key={agentName} value={agentName}>
                  {agentName}
                </option>
              ))}
            </Select>
            <div className="space-y-2">
              {agentTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(template.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    selectedTemplate?.id === template.id
                      ? "border-teal-300/45 bg-teal-300/12"
                      : "border-white/10 bg-[#07111f]/55 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-white">
                      v{template.version} - {template.title}
                    </div>
                    <Badge
                      variant={
                        template.status === "Active"
                          ? "teal"
                          : template.status === "Draft"
                            ? "gold"
                            : "outline"
                      }
                    >
                      {template.status}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Updated {new Date(template.updatedAt).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle>Version Detail</CardTitle>
            <CardDescription>
              Compare versions, create a draft, approve a draft, archive, or roll back.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTemplate ? (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <PromptMetric label="Agent" value={selectedTemplate.agentName} />
                  <PromptMetric label="Version" value={`v${selectedTemplate.version}`} />
                  <PromptMetric label="Status" value={selectedTemplate.status} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="gold"
                    size="sm"
                    onClick={() => updateTemplate(selectedTemplate, "approve")}
                    disabled={
                      selectedTemplate.status !== "Draft" ||
                      Boolean(isWorking)
                    }
                  >
                    {isWorking === `approve-${selectedTemplate.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Approve Draft
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateTemplate(selectedTemplate, "archive")}
                    disabled={
                      selectedTemplate.status === "Archived" ||
                      Boolean(isWorking)
                    }
                  >
                    <Archive className="h-4 w-4" />
                    Archive
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateTemplate(selectedTemplate, "rollback")}
                    disabled={
                      selectedTemplate.status !== "Archived" ||
                      Boolean(isWorking)
                    }
                  >
                    <RotateCcw className="h-4 w-4" />
                    Roll Back To This Version
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200">
                    Approved by
                  </label>
                  <Input
                    value={approvedBy}
                    onChange={(event) => setApprovedBy(event.target.value)}
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <PromptTextBlock title="Selected system prompt" value={selectedTemplate.systemPrompt} />
                  <PromptTextBlock title="Selected user template" value={selectedTemplate.userPromptTemplate} />
                </div>

                <div className="rounded-lg border border-[#d7a842]/25 bg-[#d7a842]/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#f7d889]">
                    <Sparkles className="h-4 w-4" />
                    Create draft version
                  </div>
                  <div className="mt-3 grid gap-3">
                    <Input
                      value={draftTitle}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      placeholder="Draft title"
                    />
                    <Textarea
                      value={draftSystemPrompt}
                      onChange={(event) => setDraftSystemPrompt(event.target.value)}
                      className="min-h-[12rem]"
                    />
                    <Textarea
                      value={draftUserPrompt}
                      onChange={(event) => setDraftUserPrompt(event.target.value)}
                      className="min-h-[8rem]"
                    />
                    <Button
                      type="button"
                      variant="gold"
                      onClick={createDraft}
                      disabled={Boolean(isWorking)}
                    >
                      {isWorking === "draft" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Create Draft Version
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <GitCompare className="h-4 w-4" />
                    Compare versions
                  </div>
                  <Select
                    className="mt-3"
                    value={compareTemplate?.id ?? ""}
                    onChange={(event) => setCompareTemplateId(event.target.value)}
                  >
                    {agentTemplates
                      .filter((template) => template.id !== selectedTemplate.id)
                      .map((template) => (
                        <option key={template.id} value={template.id}>
                          v{template.version} - {template.status}
                        </option>
                      ))}
                  </Select>
                  {compareTemplate ? (
                    <div className="mt-3 grid gap-3 xl:grid-cols-2">
                      <PromptTextBlock
                        title={`Selected v${selectedTemplate.version}`}
                        value={selectedTemplate.systemPrompt}
                      />
                      <PromptTextBlock
                        title={`Compare v${compareTemplate.version}`}
                        value={compareTemplate.systemPrompt}
                      />
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      No other version exists for comparison yet.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No prompt templates available.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>Activation Audit</CardTitle>
          <CardDescription>
            Every activation or rollback records a change entry.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {changes.length ? (
            changes.slice(0, 12).map((change) => (
              <div
                key={change.id}
                className="rounded-lg border border-white/10 bg-[#07111f]/55 p-3"
              >
                <div className="text-sm font-semibold text-white">
                  v{change.oldVersion} to v{change.newVersion}
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {change.changeSummary}
                </p>
                <div className="mt-1 text-xs text-muted-foreground">
                  Approved by {change.approvedBy || "not recorded"} on{" "}
                  {new Date(change.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-white/15 bg-[#07111f]/45 p-4 text-sm text-muted-foreground">
              No prompt activation changes recorded yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PromptMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function PromptTextBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-3">
      <div className="text-sm font-semibold text-white">{title}</div>
      <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
        {value}
      </pre>
    </div>
  );
}
