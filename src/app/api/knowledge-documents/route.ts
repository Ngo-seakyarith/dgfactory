import { NextResponse } from "next/server";

import {
  listKnowledgeDocuments,
  saveKnowledgeDocument,
} from "@/lib/knowledge-storage";
import type { KnowledgeDocument } from "@/lib/knowledge";
import { requirePermission } from "@/lib/route-guards";

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Knowledge request failed.";
}

export async function GET(request: Request) {
  const auth = await requirePermission(request, "read");
  if (!auth.ok) return auth.response;

  try {
    const documents = await listKnowledgeDocuments();
    return NextResponse.json({ documents });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "manage_course_materials");
  if (!auth.ok) return auth.response;

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
