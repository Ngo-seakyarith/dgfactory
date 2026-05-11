export const userRoles = ["Admin", "Trainer", "Sales", "Viewer"] as const;

export type UserRole = (typeof userRoles)[number];

export type Permission =
  | "admin"
  | "read"
  | "manage_prompts"
  | "approve_prompts"
  | "view_pricing"
  | "view_internal_notes"
  | "manage_delivery"
  | "manage_course_materials"
  | "manage_feedback"
  | "manage_post_training_reports"
  | "manage_clients"
  | "manage_opportunities"
  | "manage_proposals"
  | "generate_follow_ups"
  | "client_exports"
  | "approve_requests"
  | "run_loops"
  | "seed_demo_data";

export type AuthUser = {
  actor: string;
  role: UserRole;
};

const rolePermissions: Record<UserRole, Permission[]> = {
  Admin: [
    "admin",
    "read",
    "manage_prompts",
    "approve_prompts",
    "view_pricing",
    "view_internal_notes",
    "manage_delivery",
    "manage_course_materials",
    "manage_feedback",
    "manage_post_training_reports",
    "manage_clients",
    "manage_opportunities",
    "manage_proposals",
    "generate_follow_ups",
    "client_exports",
    "approve_requests",
    "run_loops",
    "seed_demo_data",
  ],
  Trainer: [
    "read",
    "manage_delivery",
    "manage_course_materials",
    "manage_feedback",
    "manage_post_training_reports",
  ],
  Sales: [
    "read",
    "manage_clients",
    "manage_opportunities",
    "manage_proposals",
    "generate_follow_ups",
    "client_exports",
  ],
  Viewer: ["read"],
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && userRoles.includes(value as UserRole);
}

export function roleHasPermission(role: UserRole, permission: Permission) {
  return rolePermissions[role].includes(permission);
}

export function parseCookieHeader(cookieHeader: string | null) {
  const cookies = new Map<string, string>();

  if (!cookieHeader) {
    return cookies;
  }

  cookieHeader.split(";").forEach((part) => {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) {
      return;
    }
    cookies.set(rawKey, decodeURIComponent(rawValue.join("=")));
  });

  return cookies;
}

export function isAuthRequired() {
  return process.env.DG_REQUIRE_AUTH === "true";
}

export function isTrustedRoleHeaderEnabled() {
  return process.env.DG_TRUST_ROLE_HEADERS === "true";
}

export function isDevRoleSessionEnabled() {
  return process.env.DG_DEV_ROLE_SESSION !== "false" && !isAuthRequired();
}

export function getRequestUser(request: Request): AuthUser {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const headerRole = isTrustedRoleHeaderEnabled()
    ? request.headers.get("x-dg-role")
    : null;
  const cookieRole = cookies.get("dg_role");
  const roleCandidate = headerRole || cookieRole;
  const role = isUserRole(roleCandidate)
    ? roleCandidate
    : isAuthRequired()
      ? "Viewer"
      : "Admin";
  const actor =
    (isTrustedRoleHeaderEnabled() ? request.headers.get("x-dg-actor") : null) ||
    cookies.get("dg_actor") ||
    process.env.DG_DEFAULT_ACTOR ||
    "DG Academy Operator";

  return {
    actor,
    role,
  };
}

export function getClientSessionFromCookies(cookieHeader: string | null): AuthUser {
  const cookies = parseCookieHeader(cookieHeader);
  const role = isUserRole(cookies.get("dg_role"))
    ? (cookies.get("dg_role") as UserRole)
    : isAuthRequired()
      ? "Viewer"
      : "Admin";

  return {
    actor: cookies.get("dg_actor") || process.env.DG_DEFAULT_ACTOR || "DG Academy Operator",
    role,
  };
}
