export const userRoles = ["Pending", "Approved"] as const;

export type UserRole = (typeof userRoles)[number];

export type AuthUser = {
  actor: string;
  role: UserRole;
  userId?: string;
  email?: string;
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && userRoles.includes(value as UserRole);
}

export function hasAppAccess(role: UserRole) {
  return role === "Approved";
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

export function extractBearerToken(authorizationHeader: string | null) {
  return authorizationHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? null;
}
