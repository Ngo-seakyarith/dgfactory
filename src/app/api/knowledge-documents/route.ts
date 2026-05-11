import { NextResponse } from "next/server";

import {
  listKnowledgeDocuments,
  saveKnowledgeDocument,
} from "@/lib/knowledge-storage";
import type { KnowledgeDocument } from "@/lib/knowledge";

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Knowledge request failed.";
}

export async function GET() {
  try {
    const documents = await listKnowledgeDocuments();
    return NextResponse.json({ documents });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<KnowledgeDocument>;

    if (!body.title?.trim() || !body.content?.trim()) {
      return NextResponse.json(
        { error: "Knowledge title and content are required." },
        { status: 400 },
      );
    }

    const result = await saveKnowledgeDocument(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
