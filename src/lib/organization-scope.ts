import { isAuthRequired, type AuthUser } from "@/lib/auth";

let requestAuthUser: AuthUser | null = null;

export function setRequestAuthUser(user: AuthUser) {
  requestAuthUser = user;
}

export function getRequestAuthUser() {
  return requestAuthUser;
}

export function getRequestOrganizationId() {
  const user = getRequestAuthUser();
  const systemOrganizationId = process.env.DG_SYSTEM_ORGANIZATION_ID;

  if (!isAuthRequired()) {
    return user?.organizationId ?? systemOrganizationId;
  }

  if (!user?.organizationId && !systemOrganizationId) {
    throw new Error("Authenticated production requests must include an organization.");
  }

  return user?.organizationId ?? systemOrganizationId;
}

export function withOrganizationId<T extends Record<string, unknown>>(row: T) {
  const organizationId = getRequestOrganizationId();
  return organizationId ? { ...row, organization_id: organizationId } : row;
}

export function scopeByOrganization<T extends { eq: (column: string, value: string) => T }>(
  query: T,
) {
  const organizationId = getRequestOrganizationId();
  return organizationId ? query.eq("organization_id", organizationId) : query;
}
