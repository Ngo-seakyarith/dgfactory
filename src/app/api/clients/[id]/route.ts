import { NextResponse } from "next/server";

import { deleteClient, getClient } from "@/lib/crm-storage";
import { requirePermission } from "@/lib/route-guards";

type Context = {
  params: Promise<{ id: string }>;
};

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Client request failed.";
}

export async function GET(request: Request, context: Context) {
  const auth = await requirePermission(request, "read");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const client = await getClient(id);

    if (!client) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: Context) {
  const auth = await requirePermission(request, "manage_clients");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const result = await deleteClient(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
