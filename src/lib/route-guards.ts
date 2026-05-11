import { NextResponse } from "next/server";

import {
  getRequestUser,
  roleHasPermission,
  type Permission,
} from "@/lib/auth";

export function requirePermission(request: Request, permission: Permission) {
  const user = getRequestUser(request);

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
