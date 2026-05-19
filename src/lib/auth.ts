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
  | "run_loops";

export type AuthUser = {
  actor: string;
  role: UserRole;
  userId?: string;
  email?: string;
  organizationId?: string;
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

export function extractBearerToken(authorizationHeader: string | null) {
  return authorizationHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? null;
}

export function getSupabaseAccessTokenFromCookies(cookieHeader: string | null) {
  const cookies = parseCookieHeader(cookieHeader);
  const directToken = cookies.get("sb-access-token");

  if (directToken) {
    return directToken;
  }

  const chunkGroups = new Map<string, Array<[number, string]>>();

  for (const [name, value] of cookies.entries()) {
    const match = name.match(/^(sb-.+-auth-token)\.(\d+)$/);
    if (!match) {
      continue;
    }

    const [, baseName, index] = match;
    const group = chunkGroups.get(baseName) ?? [];
    group.push([Number(index), value]);
    chunkGroups.set(baseName, group);
  }

  for (const chunks of chunkGroups.values()) {
    const combined = chunks
      .sort(([left], [right]) => left - right)
      .map(([, value]) => value)
      .join("");
    const token = readAccessTokenFromSupabaseCookieValue(combined);

    if (token) {
      return token;
    }
  }

  for (const [name, value] of cookies.entries()) {
    if (!name.startsWith("sb-") || !name.includes("auth-token")) {
      continue;
    }

    const token = readAccessTokenFromSupabaseCookieValue(value);

    if (token) {
      return token;
    }
  }

  return null;
}

function readAccessTokenFromSupabaseCookieValue(value: string) {
  const normalized = value.startsWith("base64-")
    ? decodeBase64(value.slice("base64-".length))
    : value;

  try {
    const parsed = JSON.parse(normalized) as { access_token?: unknown } | unknown[];
    if (Array.isArray(parsed) && typeof parsed[0] === "string") {
      return parsed[0];
    }
    if (
      parsed &&
      !Array.isArray(parsed) &&
      typeof parsed === "object" &&
      typeof (parsed as { access_token?: unknown }).access_token === "string"
    ) {
      return (parsed as { access_token: string }).access_token;
    }
  } catch {
    if (normalized.includes(".")) {
      return normalized;
    }
  }

  return null;
}

function decodeBase64(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  if (typeof atob === "function") {
    return atob(padded);
  }

  return value;
}

export function getRequestUserFallback(request: Request): AuthUser {
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

export const getRequestUser = getRequestUserFallback;

export function getClientSessionFromCookiesFallback(cookieHeader: string | null): AuthUser {
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

export const getClientSessionFromCookies = getClientSessionFromCookiesFallback;
