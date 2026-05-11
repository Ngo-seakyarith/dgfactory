"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Loader2,
  Plus,
  Save,
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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  knowledgeDocumentTypes,
  knowledgeVisibilityOptions,
  normalizeKnowledgeDocument,
  normalizeTags,
  type KnowledgeDocument,
  type KnowledgeDocumentType,
  type KnowledgeRetrievalResult,
  type KnowledgeVisibility,
} from "@/lib/knowledge";

const knowledgeStorageKey = "dg-academy-knowledge-documents-v1";

function readLocalKnowledgeDocuments() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(knowledgeStorageKey);
    return raw
      ? (JSON.parse(raw) as KnowledgeDocument[]).map(normalizeKnowledgeDocument)
      : [];
  } catch {
    return [];
  }
}

export function saveKnowledgeDocumentLocally(document: KnowledgeDocument) {
  const documents = readLocalKnowledgeDocuments();
  const index = documents.findIndex((item) => item.id === document.id);

  if (index >= 0) {
    documents[index] = document;
  } else {
    documents.unshift(document);
  }

  window.localStorage.setItem(knowledgeStorageKey, JSON.stringify(documents));
}

function deleteKnowledgeDocumentLocally(id: string) {
  window.localStorage.setItem(
    knowledgeStorageKey,
    JSON.stringify(readLocalKnowledgeDocuments().filter((item) => item.id !== id)),
  );
}

function mergeByUpdatedAt<T extends { id: string; updatedAt: string }>(
  localItems: T[],
  remoteItems: T[],
) {
  const merged = new Map<string, T>();

  [...remoteItems, ...localItems].forEach((item) => {
    const existing = merged.get(item.id);
    if (!existing || item.updatedAt > existing.updatedAt) {
      merged.set(item.id, item);
    }
  });

  return Array.from(merged.values()).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

function useKnowledgeData() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState("Loading DG Academy knowledge...");

  async function refresh() {
    const localDocuments = readLocalKnowledgeDocuments();
    setDocuments(localDocuments);

    try {
      const response = await fetch("/api/knowledge-documents", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        documents?: KnowledgeDocument[];
      };
      const remoteDocuments = payload.documents ?? [];

      remoteDocuments.forEach(saveKnowledgeDocumentLocally);
      setDocuments(mergeByUpdatedAt(localDocuments, remoteDocuments));
      setNotice(
        remoteDocuments.length
          ? "Showing seed, local, and Supabase-backed knowledge documents."
          : "Showing local knowledge. Supabase will appear when configured.",
      );
    } catch {
      setNotice("Showing local knowledge. Database read was unavailable.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return { documents, isLoading, notice, refresh };
}

export function KnowledgeVisibilityBadge({
  visibility,
}: {
  visibility: KnowledgeVisibility;
}) {
  return (
    <Badge variant={visibility === "Client-safe" ? "teal" : "gold"}>
      {visibility}
    </Badge>
  );
}

export function KnowledgeDocumentForm({
  existingDocument,
}: {
  existingDocument?: KnowledgeDocument;
}) {
  const router = useRouter();
  const [document, setDocument] = useState<KnowledgeDocument>(
    existingDocument ??
      normalizeKnowledgeDocument({
        title: "",
        type: "Framework",
        content: "",
        tags: [],
        source: "",
        visibility: "Internal",
      }),
  );
  const [tagText, setTagText] = useState(document.tags.join(", "));
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");

  function updateField<K extends keyof KnowledgeDocument>(
    key: K,
    value: KnowledgeDocument[K],
  ) {
    setDocument((current) => ({ ...current, [key]: value }));
  }

  async function saveDocument() {
    setIsSaving(true);
    setNotice("");

    const documentToSave = normalizeKnowledgeDocument({
      ...document,
      tags: normalizeTags(tagText),
      updatedAt: new Date().toISOString(),
    });

    try {
      saveKnowledgeDocumentLocally(documentToSave);
      const response = await fetch("/api/knowledge-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(documentToSave),
      });
      const payload = (await response.json()) as {
        document?: KnowledgeDocument;
        error?: string;
      };

      if (!response.ok || !payload.document) {
        throw new Error(payload.error ?? "Knowledge save failed.");
      }

      saveKnowledgeDocumentLocally(payload.document);
      router.push(`/knowledge/${payload.document.id}`);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Knowledge document saved locally only.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardTitle>
          {existingDocument ? "Edit Knowledge Document" : "New Knowledge Document"}
        </CardTitle>
        <CardDescription>
          Add DG Academy positioning, frameworks, examples, SOPs, proposal language,
          or client notes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Title">
          <Input
            value={document.title}
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="AI Skills for Managers Framework"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <Select
              value={document.type}
              onChange={(event) =>
                updateField("type", event.target.value as KnowledgeDocumentType)
              }
            >
              {knowledgeDocumentTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </Select>
          </Field>
          <Field label="Visibility">
            <Select
              value={document.visibility}
              onChange={(event) =>
                updateField("visibility", event.target.value as KnowledgeVisibility)
              }
            >
              {knowledgeVisibilityOptions.map((visibility) => (
                <option key={visibility}>{visibility}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Tags">
          <Input
            value={tagText}
            onChange={(event) => setTagText(event.target.value)}
            placeholder="Cambodia, executive, AI adoption"
          />
        </Field>
        <Field label="Source">
          <Input
            value={document.source}
            onChange={(event) => updateField("source", event.target.value)}
            placeholder="Seed, proposal archive, workshop notes"
          />
        </Field>
        <Field label="Content">
          <Textarea
            value={document.content}
            onChange={(event) => updateField("content", event.target.value)}
            placeholder="Paste reusable knowledge, frameworks, examples, or notes."
            rows={12}
          />
        </Field>
        {notice ? (
          <p className="rounded-lg border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">
            {notice}
          </p>
        ) : null}
        <Button type="button" variant="gold" onClick={saveDocument} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Knowledge
        </Button>
      </CardContent>
    </Card>
  );
}

export function KnowledgeLibrary() {
  const { documents, notice } = useKnowledgeData();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<KnowledgeDocumentType | "">("");
  const [tag, setTag] = useState("");
  const [visibility, setVisibility] = useState<KnowledgeVisibility | "Any">("Any");
  const [results, setResults] = useState<KnowledgeRetrievalResult[]>([]);
  const [searchNotice, setSearchNotice] = useState("");
  const allTags = useMemo(
    () => Array.from(new Set(documents.flatMap((document) => document.tags))).sort(),
    [documents],
  );
  const filteredDocuments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return documents.filter((document) => {
      if (type && document.type !== type) {
        return false;
      }
      if (visibility !== "Any" && document.visibility !== visibility) {
        return false;
      }
      if (tag && !document.tags.includes(tag)) {
        return false;
      }
      if (!normalized) {
        return true;
      }
      return [document.title, document.type, document.content, document.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [documents, query, tag, type, visibility]);

  async function runSearch() {
    setSearchNotice("");
    const response = await fetch("/api/knowledge-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        type,
        tags: tag ? [tag] : [],
        visibility,
      }),
    });
    const payload = (await response.json()) as {
      results?: KnowledgeRetrievalResult[];
      error?: string;
    };

    if (!response.ok) {
      setSearchNotice(payload.error ?? "Search failed.");
      return;
    }

    setResults(payload.results ?? []);
    setSearchNotice(
      payload.results?.length
        ? `${payload.results.length} relevant knowledge items found.`
        : "No relevant knowledge found for that query.",
    );
  }

  return (
    <div className="space-y-5">
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_auto]">
            <KnowledgeSearch query={query} onQueryChange={setQuery} onSearch={runSearch} />
            <Select value={type} onChange={(event) => setType(event.target.value as KnowledgeDocumentType | "")}>
              <option value="">All types</option>
              {knowledgeDocumentTypes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
            <KnowledgeTagFilter tags={allTags} value={tag} onChange={setTag} />
            <Select value={visibility} onChange={(event) => setVisibility(event.target.value as KnowledgeVisibility | "Any")}>
              <option>Any</option>
              {knowledgeVisibilityOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
            <Button asChild variant="gold">
              <Link href="/knowledge/new">
                <Plus className="h-4 w-4" />
                New
              </Link>
            </Button>
          </div>
          {searchNotice ? (
            <p className="text-sm text-teal-50">{searchNotice}</p>
          ) : null}
        </CardContent>
      </Card>

      {results.length ? (
        <Card className="border-teal-300/20 bg-teal-300/10 shadow-executive">
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
            <CardDescription>Keyword retrieval results. Vector search is a future upgrade.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {results.map((result) => (
              <KnowledgeCard
                key={result.document.id}
                document={result.document}
                score={result.score}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>Knowledge Library</CardTitle>
          <CardDescription>{notice}</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredDocuments.map((document) => (
                <KnowledgeCard key={document.id} document={document} />
              ))}
            </div>
          ) : (
            <EmptyKnowledgeState />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function KnowledgeDocumentDetail({ id }: { id: string }) {
  const router = useRouter();
  const { documents, isLoading } = useKnowledgeData();
  const document = documents.find((item) => item.id === id);

  async function deleteDocument() {
    if (!document || !window.confirm(`Delete "${document.title}"?`)) {
      return;
    }

    deleteKnowledgeDocumentLocally(document.id);
    await fetch(`/api/knowledge-documents/${document.id}`, { method: "DELETE" });
    router.push("/knowledge");
  }

  if (isLoading && !document) {
    return (
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading knowledge document...
        </CardContent>
      </Card>
    );
  }

  if (!document) {
    return (
      <Card className="border-red-300/25 bg-red-400/10 shadow-executive">
        <CardContent className="p-6">
          <div className="font-semibold text-red-100">Knowledge document not found</div>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/knowledge">Go Back</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="outline">{document.type}</Badge>
              <KnowledgeVisibilityBadge visibility={document.visibility} />
            </div>
            <CardTitle>{document.title}</CardTitle>
            <CardDescription className="mt-2">
              {document.source || "No source"} - {document.tags.join(", ") || "No tags"}
            </CardDescription>
          </div>
          <Button type="button" variant="destructive" onClick={deleteDocument}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-lg border border-white/10 bg-[#07111f]/55 p-4 font-sans text-sm leading-7 text-slate-100">
            {document.content}
          </pre>
        </CardContent>
      </Card>

      <KnowledgeDocumentForm existingDocument={document} />
    </div>
  );
}

export function KnowledgeSearch({
  query,
  onQueryChange,
  onSearch,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onSearch();
          }
        }}
        placeholder="Search DG Academy knowledge"
        className="pl-9"
      />
    </div>
  );
}

export function KnowledgeTagFilter({
  tags,
  value,
  onChange,
}: {
  tags: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">All tags</option>
      {tags.map((tag) => (
        <option key={tag}>{tag}</option>
      ))}
    </Select>
  );
}

function KnowledgeCard({
  document,
  score,
}: {
  document: KnowledgeDocument;
  score?: number;
}) {
  return (
    <Link
      href={`/knowledge/${document.id}`}
      className="group rounded-lg border border-white/10 bg-[#07111f]/55 p-4 transition hover:border-teal-300/35 hover:bg-teal-300/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-2 font-semibold leading-6 text-white">
            {document.title}
          </div>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
            {document.content}
          </p>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-teal-100" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline">{document.type}</Badge>
        <KnowledgeVisibilityBadge visibility={document.visibility} />
        {score !== undefined ? <Badge variant="teal">Score {score}</Badge> : null}
        {document.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="outline">{tag}</Badge>
        ))}
      </div>
    </Link>
  );
}

function EmptyKnowledgeState() {
  return (
    <div className="rounded-lg border border-dashed border-white/15 bg-[#07111f]/45 p-8 text-center">
      <BookOpen className="mx-auto h-8 w-8 text-teal-100" />
      <div className="mt-4 text-base font-semibold text-white">
        No knowledge documents yet
      </div>
      <Button asChild variant="gold" className="mt-5">
        <Link href="/knowledge/new">
          <Plus className="h-4 w-4" />
          Add Knowledge
        </Link>
      </Button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-white">{label}</span>
      {children}
    </label>
  );
}
