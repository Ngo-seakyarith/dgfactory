import { NextResponse, type NextRequest } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import { createPortalToken, hashPortalToken } from "@/lib/client-portal/token";
import {
  listPortalAccess,
  publicPortalAccess,
  savePortalAccess,
} from "@/lib/client-portal/storage";
import { requirePermission } from "@/lib/route-guards";

function buildPortalLink(request: NextRequest, token: string) {
  const origin =
    request.headers.get("origin") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    new URL(request.url).origin;
  return `${origin}/client-portal/${encodeURIComponent(token)}`;
}

export async function GET(request: NextRequest) {
  const guard = await requirePermission(request, "manage_clients");
  if (!guard.ok) {
    return guard.response;
  }

  const clientId = request.nextUrl.searchParams.get("clientId") ?? undefined;
  const access = await listPortalAccess(clientId);

  return NextResponse.json({
    access: access.map(publicPortalAccess),
  });
}

export async function POST(request: NextRequest) {
  const guard = await requirePermission(request, "manage_clients");
  if (!guard.ok) {
    return guard.response;
  }

  const body = (await request.json().catch(() => ({}))) as {
    clientId?: string;
    contactEmail?: string;
    expiresAt?: string | null;
  };

  if (!body.clientId || !body.contactEmail) {
    return NextResponse.json(
      { error: "Client and contact email are required." },
      { status: 400 },
    );
  }

  const token = createPortalToken();
  const saved = await savePortalAccess({
    clientId: body.clientId,
    contactEmail: body.contactEmail,
    accessTokenHash: hashPortalToken(token),
    status: "Active",
    expiresAt: body.expiresAt || null,
  });
  const link = buildPortalLink(request, token);

  await saveAuditLog({
    actor: guard.user.actor,
    action: "client_portal_access_created",
    entityType: "client",
    entityId: body.clientId,
    metadata: {
      contactEmail: body.contactEmail,
      expiresAt: body.expiresAt || null,
      storage: saved.storage,
    },
  });

  return NextResponse.json({
    access: publicPortalAccess(saved.access),
    token,
    link,
    suggestedEmail: `Subject: DG Academy training proposal portal

Hi,

DG Academy has prepared a secure review portal for your proposal and training documents:

${link}

Please review the published documents and share your feedback through the portal.

Best,
DG Academy`,
    storage: saved.storage,
  });
}
