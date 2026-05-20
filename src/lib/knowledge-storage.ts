import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scopeByOrganization, withOrganizationId } from "@/lib/organization-scope";
import {
  createKnowledgeChunks,
  normalizeKnowledgeChunk,
  normalizeKnowledgeDocument,
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

export async function listKnowledgeDocuments() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to list knowledge documents.");
  }

  const query = supabase
    .from("knowledge_documents")
    .select("*")
    .order("updated_at", { ascending: false });
  const { data, error } = await scopeByOrganization(query);

  if (error) {
    throw new Error(error.message);
  }

  return (data as KnowledgeDocumentRow[]).map(documentFromRow).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function getKnowledgeDocument(id: string) {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await scopeByOrganization(
      supabase.from("knowledge_documents").select("*").eq("id", id),
    ).maybeSingle();

    if (!error && data) {
      return documentFromRow(data as KnowledgeDocumentRow);
    }
  }

  throw new Error("Supabase is required to load knowledge documents.");
}

export async function saveKnowledgeDocument(input: Partial<KnowledgeDocument>) {
  const document = normalizeKnowledgeDocument({
    ...input,
    updatedAt: new Date().toISOString(),
  });
  const chunks = createKnowledgeChunks(document);

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to save knowledge documents.");
  }

  const { data, error } = await supabase
    .from("knowledge_documents")
    .upsert(withOrganizationId(documentToRow(document)), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await scopeByOrganization(
    supabase.from("knowledge_chunks").delete().eq("document_id", document.id),
  );
  await supabase.from("knowledge_chunks").upsert(chunks.map((chunk) => withOrganizationId(chunkToRow(chunk))), {
    onConflict: "id",
  });

  return {
    document: documentFromRow(data as KnowledgeDocumentRow),
    chunks,
    storage: "supabase" as const,
  };
}

export async function deleteKnowledgeDocument(id: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to delete knowledge documents.");
  }

  const { error } = await scopeByOrganization(
    supabase.from("knowledge_documents").delete().eq("id", id),
  );
  if (error) {
    throw new Error(error.message);
  }
  return { deleted: true, storage: "supabase" as const };
}

export async function listKnowledgeChunks(documentId?: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required to list knowledge chunks.");
  }

  let query = scopeByOrganization(supabase.from("knowledge_chunks").select("*").order("chunk_index"));

  if (documentId) {
    query = query.eq("document_id", documentId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data as KnowledgeChunkRow[]).map(chunkFromRow);
}
