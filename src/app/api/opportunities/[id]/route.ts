import { NextResponse } from "next/server";

import { deleteOpportunity, getOpportunity } from "@/lib/crm-storage";

type Context = {
  params: Promise<{ id: string }>;
};

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Opportunity request failed.";
}

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const opportunity = await getOpportunity(id);

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    }

    return NextResponse.json({ opportunity });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const result = await deleteOpportunity(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
