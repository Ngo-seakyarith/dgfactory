import type { AuthUser } from "@/lib/auth";

let requestAuthUser: AuthUser | null = null;

export function setRequestAuthUser(user: AuthUser | null) {
  requestAuthUser = user;
}

export function getRequestAuthUser() {
  return requestAuthUser;
}

export function withAppScope<T extends Record<string, unknown>>(row: T) {
  return row;
}

export function scopeAppData<T>(query: T) {
  return query;
}
