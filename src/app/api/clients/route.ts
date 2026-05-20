import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import { listClients, saveClient } from "@/lib/crm-storage";
import type { Client } from "@/lib/crm";
import { requirePermission } from "@/lib/route-guards";

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Client request failed.";
}

export async function GET(request: Request) {
  const auth = await requirePermission(request, "read");
  if (!auth.ok) return auth.response;

  try {
    const clients = await listClients();
    return NextResponse.json({ clients });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "manage_clients");

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as Partial<Client>;

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "Client name is required." },
        { status: 400 },
      );
    }

    const result = await saveClient(body);
    await saveAuditLog({
      actor: auth.user.actor,
      action: "client_saved",
      entityType: "client",
      entityId: result.client.id,
      metadata: {
        name: result.client.name,
        sector: result.client.sector,
        storage: result.storage,
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
