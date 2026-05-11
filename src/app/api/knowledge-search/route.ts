import { NextResponse } from "next/server";

import { retrieveKnowledge } from "@/lib/knowledge/retrieve";
import {
  isKnowledgeDocumentType,
  isKnowledgeVisibility,
  normalizeTags,
  type KnowledgeDocumentType,
  type KnowledgeVisibility,
} from "@/lib/knowledge";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      query?: string;
      type?: KnowledgeDocumentType | "";
      tags?: string[];
      visibility?: KnowledgeVisibility | "Any";
      limit?: number;
    };
    const query = String(body.query ?? "").trim();

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    const results = await retrieveKnowledge({
      query,
      filters: {
        type: isKnowledgeDocumentType(body.type) ? body.type : "",
        tags: normalizeTags(body.tags),
        visibility:
          body.visibility === "Any" || isKnowledgeVisibility(body.visibility)
            ? body.visibility
            : "Any",
      },
      limit: body.limit ?? 8,
    });

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Knowledge search failed.",
      },
      { status: 500 },
    );
  }
}
