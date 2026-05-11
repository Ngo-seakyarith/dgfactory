import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  createKnowledgeChunks,
  normalizeKnowledgeChunk,
  normalizeKnowledgeDocument,
  seedKnowledgeDocuments,
  type KnowledgeChunk,
  type KnowledgeDocument,
  type KnowledgeDocumentType,
  type KnowledgeVisibility,
} from "@/lib/knowledge";

type KnowledgeDocumentRow = {
  id: string;
  title: string;
  type: KnowledgeDocumentType | null;
  content: string;
  tags: string[] | null;
  source: string | null;
  visibility: KnowledgeVisibility | null;
  created_at: string;
  updated_at: string;
};

type KnowledgeChunkRow = {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  embedding?: number[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type KnowledgeStore = {
  documents: KnowledgeDocument[];
  chunks: KnowledgeChunk[];
};

const globalForKnowledgeStore = globalThis as typeof globalThis & {
  __dgKnowledgeStore?: KnowledgeStore;
};

const localStore =
  globalForKnowledgeStore.__dgKnowledgeStore ??
  (globalForKnowledgeStore.__dgKnowledgeStore = {
    documents: [...seedKnowledgeDocuments],
    chunks: seedKnowledgeDocuments.flatMap(createKnowledgeChunks),
  });

function documentToRow(document: KnowledgeDocument) {
  return {
    id: document.id,
    title: document.title,
    type: document.type,
    content: document.content,
    tags: document.tags,
    source: document.source || null,
    visibility: document.visibility,
    created_at: document.createdAt,
    updated_at: document.updatedAt,
  };
}

function documentFromRow(row: KnowledgeDocumentRow): KnowledgeDocument {
  return normalizeKnowledgeDocument({
    id: row.id,
    title: row.title,
    type: row.type ?? "Other",
    content: row.content,
    tags: row.tags ?? [],
    source: row.source ?? "",
    visibility: row.visibility ?? "Internal",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function chunkToRow(chunk: KnowledgeChunk) {
  return {
    id: chunk.id,
    document_id: chunk.documentId,
    chunk_index: chunk.chunkIndex,
    content: chunk.content,
    metadata: chunk.metadata,
    created_at: chunk.createdAt,
  };
}

function chunkFromRow(row: KnowledgeChunkRow): KnowledgeChunk {
  return normalizeKnowledgeChunk({
    id: row.id,
    documentId: row.document_id,
    chunkIndex: row.chunk_index,
    content: row.content,
    embedding: row.embedding ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  });
}

function upsertLocalDocument(document: KnowledgeDocument) {
  const index = localStore.documents.findIndex((item) => item.id === document.id);

  if (index >= 0) {
    localStore.documents[index] = document;
  } else {
    localStore.documents.unshift(document);
  }

  localStore.chunks = [
    ...localStore.chunks.filter((chunk) => chunk.documentId !== document.id),
    ...createKnowledgeChunks(document),
  ];

  return document;
}

export async function listKnowledgeDocuments() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return [...localStore.documents].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  const { data, error } = await supabase
    .from("knowledge_documents")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return [...localStore.documents].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  const remoteDocuments = (data as KnowledgeDocumentRow[]).map(documentFromRow);
  const merged = new Map<string, KnowledgeDocument>();
  [...seedKnowledgeDocuments, ...remoteDocuments, ...localStore.documents].forEach(
    (document) => merged.set(document.id, document),
  );

  return Array.from(merged.values()).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function getKnowledgeDocument(id: string) {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("knowledge_documents")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      return documentFromRow(data as KnowledgeDocumentRow);
    }
  }

  return localStore.documents.find((document) => document.id === id) ?? null;
}

export async function saveKnowledgeDocument(input: Partial<KnowledgeDocument>) {
  const document = normalizeKnowledgeDocument({
    ...input,
    updatedAt: new Date().toISOString(),
  });
  const chunks = createKnowledgeChunks(document);
  upsertLocalDocument(document);

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { document, chunks, storage: "local" as const };
  }

  const { data, error } = await supabase
    .from("knowledge_documents")
    .upsert(documentToRow(document), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    return { document, chunks, storage: "local" as const };
  }

  await supabase.from("knowledge_chunks").delete().eq("document_id", document.id);
  await supabase.from("knowledge_chunks").upsert(chunks.map(chunkToRow), {
    onConflict: "id",
  });

  return {
    document: documentFromRow(data as KnowledgeDocumentRow),
    chunks,
    storage: "supabase" as const,
  };
}

export async function deleteKnowledgeDocument(id: string) {
  localStore.documents = localStore.documents.filter((document) => document.id !== id);
  localStore.chunks = localStore.chunks.filter((chunk) => chunk.documentId !== id);

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { deleted: true, storage: "local" as const };
  }

  const { error } = await supabase.from("knowledge_documents").delete().eq("id", id);
  return { deleted: true, storage: error ? "local" as const : "supabase" as const };
}

export async function listKnowledgeChunks(documentId?: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return localStore.chunks
      .filter((chunk) => (documentId ? chunk.documentId === documentId : true))
      .sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  let query = supabase.from("knowledge_chunks").select("*").order("chunk_index");

  if (documentId) {
    query = query.eq("document_id", documentId);
  }

  const { data, error } = await query;

  if (error) {
    return localStore.chunks.filter((chunk) =>
      documentId ? chunk.documentId === documentId : true,
    );
  }

  const remoteChunks = (data as KnowledgeChunkRow[]).map(chunkFromRow);
  const seededChunks = seedKnowledgeDocuments.flatMap(createKnowledgeChunks);

  return [...seededChunks, ...remoteChunks];
}
