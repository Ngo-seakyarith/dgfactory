import { NextResponse } from "next/server";

import { isAuthRequired, isDevRoleSessionEnabled, isUserRole } from "@/lib/auth";
import { getAuthenticatedRequestUser } from "@/lib/auth-production";
import { saveAuditLog } from "@/lib/audit";

function cookieValue(value: string) {
  return encodeURIComponent(value).replace(/%20/g, "+");
}

function sessionCookie(name: string, value: string) {
  return `${name}=${cookieValue(value)}; Path=/; SameSite=Lax; HttpOnly; Max-Age=2592000`;
}

export async function GET(request: Request) {
  return NextResponse.json({
    user: await getAuthenticatedRequestUser(request),
    authRequired: process.env.DG_REQUIRE_AUTH === "true",
  });
}

export async function POST(request: Request) {
  if (isAuthRequired() && !isDevRoleSessionEnabled()) {
    return NextResponse.json(
      {
        error:
          "Cookie role selection is disabled when DG_REQUIRE_AUTH=true. Use Supabase Auth roles from organization_memberships.",
      },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    actor?: unknown;
    role?: unknown;
    adminPin?: unknown;
  };

  if (!isUserRole(body.role)) {
    return NextResponse.json({ error: "A valid role is required." }, { status: 400 });
  }

  const actor = String(body.actor ?? "DG Academy Operator").trim();
  const adminPin = process.env.ADMIN_ACCESS_PIN;

  if (
    body.role === "Admin" &&
    adminPin &&
    String(body.adminPin ?? "") !== adminPin
  ) {
    return NextResponse.json({ error: "Admin PIN is incorrect." }, { status: 403 });
  }

  await saveAuditLog({
    actor,
    action: "session_role_selected",
    entityType: "auth",
    entityId: body.role,
    metadata: { role: body.role },
  });

  const response = NextResponse.json({
    user: {
      actor,
      role: body.role,
    },
  });

  response.headers.append("Set-Cookie", sessionCookie("dg_role", body.role));
  response.headers.append("Set-Cookie", sessionCookie("dg_actor", actor));

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({
    user: {
      actor: "DG Academy Operator",
      role: isAuthRequired() ? "Viewer" : "Admin",
    },
  });

  response.headers.append("Set-Cookie", "dg_role=; Path=/; SameSite=Lax; Max-Age=0");
  response.headers.append("Set-Cookie", "dg_actor=; Path=/; SameSite=Lax; Max-Age=0");

  return response;
}
