import { NextResponse, type NextRequest } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import { publicPortalAccess, revokePortalAccess } from "@/lib/client-portal/storage";
import { requirePermission } from "@/lib/route-guards";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = requirePermission(request, "manage_clients");
  if (!guard.ok) {
    return guard.response;
  }

  const { id } = await params;
  const result = await revokePortalAccess(id);

  await saveAuditLog({
    actor: guard.user.actor,
    action: "client_portal_access_revoked",
    entityType: "client_portal_access",
    entityId: id,
    metadata: { storage: result.storage },
  });

  return NextResponse.json({
    access: result.access ? publicPortalAccess(result.access) : null,
    storage: result.storage,
  });
}
