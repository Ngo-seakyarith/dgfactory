import { NextResponse } from "next/server";

import { roleHasPermission, type Permission } from "@/lib/auth";
import { getAuthenticatedRequestUser } from "@/lib/auth-production";
import { setRequestAuthUser } from "@/lib/organization-scope";

export async function requirePermission(request: Request, permission: Permission) {
  const user = await getAuthenticatedRequestUser(request);
  setRequestAuthUser(user);

  if (!roleHasPermission(user.role, permission)) {
    return {
      ok: false as const,
      user,
      response: NextResponse.json(
        {
          error: `Role ${user.role} does not have permission: ${permission}.`,
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true as const, user };
}

export function forbidden(message = "You do not have permission for this action.") {
  return NextResponse.json({ error: message }, { status: 403 });
}
