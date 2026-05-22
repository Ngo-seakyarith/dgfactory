import { NextResponse, type NextRequest } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import {
  listPortalItems,
  savePortalItem,
} from "@/lib/client-portal/storage";
import { isPortalItemType } from "@/lib/client-portal/types";
import { requireApproved } from "@/lib/route-guards";

export async function GET(request: NextRequest) {
  const guard = await requireApproved(request);
  if (!guard.ok) {
    return guard.response;
  }

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId is required." }, { status: 400 });
  }

  const items = await listPortalItems(clientId);
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const guard = await requireApproved(request);
  if (!guard.ok) {
    return guard.response;
  }

  const body = (await request.json().catch(() => ({}))) as {
    clientId?: string;
    itemType?: string;
    itemId?: string;
    title?: string;
    visibility?: string;
    status?: string;
  };

  if (!body.clientId || !body.itemId || !isPortalItemType(body.itemType)) {
    return NextResponse.json(
      { error: "Client, item type, and item ID are required." },
      { status: 400 },
    );
  }

  const saved = await savePortalItem({
    clientId: body.clientId,
    itemType: body.itemType,
    itemId: body.itemId,
    title: body.title || body.itemType,
    visibility: body.visibility === "Hidden" ? "Hidden" : "Client Visible",
    status: body.status === "Draft" || body.status === "Archived" ? body.status : "Published",
  });

  await saveAuditLog({
    actor: guard.user.actor,
    action: "client_portal_item_published",
    entityType: "client",
    entityId: body.clientId,
    metadata: {
      itemType: saved.item.itemType,
      itemId: saved.item.itemId,
      title: saved.item.title,
      storage: saved.storage,
    },
  });

  return NextResponse.json({
    item: saved.item,
    storage: saved.storage,
  });
}
