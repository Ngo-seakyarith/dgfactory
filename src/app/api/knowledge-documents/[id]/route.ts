import { NextResponse } from "next/server";

import {
  deleteKnowledgeDocument,
  getKnowledgeDocument,
} from "@/lib/knowledge-storage";
import { requireApproved } from "@/lib/route-guards";

type Context = {
  params: Promise<{ id: string }>;
};

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Knowledge request failed.";
}

export async function GET(request: Request, context: Context) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const document = await getKnowledgeDocument(id);

    if (!document) {
      return NextResponse.json(
        { error: "Knowledge document not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ document });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: Context) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const result = await deleteKnowledgeDocument(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
