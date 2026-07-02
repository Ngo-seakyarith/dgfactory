import { NextResponse } from "next/server";

import { hasAppAccess } from "@/lib/auth";
import { getAuthenticatedRequestUser } from "@/lib/auth-production";
import { setRequestAuthUser } from "@/lib/request-scope";

export async function requireApproved(request: Request) {
  const user = await getAuthenticatedRequestUser(request);
  setRequestAuthUser(user);

  if (!user) {
    return {
      ok: false as const,
      user: null,
      response: NextResponse.json(
        { error: "Sign in with Google to use DG Academy Factory." },
        { status: 401 },
      ),
    };
  }

  if (!hasAppAccess(user.role)) {
    return {
      ok: false as const,
      user,
      response: NextResponse.json(
        {
          error: "Your account is pending approval for DG Academy Factory access.",
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true as const, user };
}

export function forbidden(message = "Your account is pending approval for this action.") {
  return NextResponse.json({ error: message }, { status: 403 });
}
