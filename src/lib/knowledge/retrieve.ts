import {
  listKnowledgeChunks,
  listKnowledgeDocuments,
} from "@/lib/knowledge-storage";
import type {
  KnowledgeDocument,
  KnowledgeDocumentType,
  KnowledgeRetrievalResult,
  KnowledgeVisibility,
} from "@/lib/knowledge";

export type KnowledgeRetrieveFilters = {
  type?: KnowledgeDocumentType | "";
  tags?: string[];
  visibility?: KnowledgeVisibility | "Any";
};

const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "into",
  "your",
  "their",
  "course",
  "training",
  "program",
]);

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((term) => term.trim())
    .filter((term) => term.length > 2 && !stopWords.has(term));
}

function uniqueTerms(value: string) {
  return Array.from(new Set(tokenize(value)));
}

function tagMatches(document: KnowledgeDocument, tags: string[] = []) {
  if (!tags.length) {
    return true;
  }

  const documentTags = document.tags.map((tag) => tag.toLowerCase());
  return tags.some((tag) => documentTags.includes(tag.toLowerCase()));
}

function scoreText({
  queryTerms,
  title,
  content,
  tags,
}: {
  queryTerms: string[];
  title: string;
  content: string;
  tags: string[];
}) {
  const normalizedTitle = title.toLowerCase();
  const normalizedContent = content.toLowerCase();
  const normalizedTags = tags.map((tag) => tag.toLowerCase());
  const matchedTerms: string[] = [];
  let score = 0;

  queryTerms.forEach((term) => {
    if (normalizedTitle.includes(term)) {
      score += 8;
      matchedTerms.push(term);
    }

    if (normalizedTags.some((tag) => tag.includes(term))) {
      score += 5;
      matchedTerms.push(term);
    }

    const matches = normalizedContent.match(new RegExp(term, "g"))?.length ?? 0;
    if (matches) {
      score += Math.min(10, matches * 2);
      matchedTerms.push(term);
    }
  });

  return { score, matchedTerms: Array.from(new Set(matchedTerms)) };
}

export async function retrieveKnowledge({
  query,
  filters = {},
  limit = 6,
}: {
  query: string;
  filters?: KnowledgeRetrieveFilters;
  limit?: number;
}): Promise<KnowledgeRetrievalResult[]> {
  const queryTerms = uniqueTerms(query);
  const documents = await listKnowledgeDocuments();
  const chunks = await listKnowledgeChunks();

  if (!queryTerms.length) {
    return [];
  }

  const filteredDocuments = documents.filter((document) => {
    if (filters.type && document.type !== filters.type) {
      return false;
    }

    if (filters.visibility && filters.visibility !== "Any" && document.visibility !== filters.visibility) {
      return false;
    }

    return tagMatches(document, filters.tags);
  });
  const documentMap = new Map(filteredDocuments.map((document) => [document.id, document]));
  const chunkResults = chunks
    .filter((chunk) => documentMap.has(chunk.documentId))
    .map((chunk) => {
      const document = documentMap.get(chunk.documentId)!;
      const scored = scoreText({
        queryTerms,
        title: document.title,
        content: `${chunk.content} ${document.content}`,
        tags: document.tags,
      });

      return {
        document,
        chunk,
        score: scored.score,
        matchedTerms: scored.matchedTerms,
      };
    })
    .filter((result) => result.score > 0);
  const documentResults = filteredDocuments
    .map((document) => {
      const scored = scoreText({
        queryTerms,
        title: document.title,
        content: document.content,
        tags: document.tags,
      });

      return {
        document,
        score: scored.score,
        matchedTerms: scored.matchedTerms,
      };
    })
    .filter((result) => result.score > 0);

  const bestByDocument = new Map<string, KnowledgeRetrievalResult>();

  [...chunkResults, ...documentResults].forEach((result) => {
    const existing = bestByDocument.get(result.document.id);
    if (!existing || result.score > existing.score) {
      bestByDocument.set(result.document.id, result);
    }
  });

  return Array.from(bestByDocument.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function formatKnowledgeForBrain(results: KnowledgeRetrievalResult[]) {
  if (!results.length) {
    return "No relevant DG Academy knowledge retrieved.";
  }

  return results
    .map((result, index) => {
      const visibility =
        result.document.visibility === "Internal"
          ? "Internal only"
          : "Client-safe";
      return [
        `Knowledge ${index + 1}: ${result.document.title}`,
        `Type: ${result.document.type}`,
        `Visibility: ${visibility}`,
        `Score: ${result.score}`,
        `Tags: ${result.document.tags.join(", ") || "None"}`,
        `Content: ${result.chunk?.content ?? result.document.content}`,
      ].join("\n");
    })
    .join("\n\n");
}
