import { createHash } from "node:crypto";

import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  extractBearerToken,
  isUserRole,
  parseCookieHeader,
  type AuthUser,
  type UserRole,
} from "@/lib/auth";

export type ProductionAuthProfile = {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
};

const AUTH_CACHE_TTL_MS = 5_000;
const AUTH_CACHE_MAX_ENTRIES = 100;
const requestAuthCache = new Map<
  string,
  { expiresAt: number; value: Promise<AuthUser | null> }
>();

export function isSupabaseAuthConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

async function getProductionAuthProfile(user: User | null) {
  if (!user) {
    return null;
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, access_status")
    .eq("id", user.id)
    .maybeSingle();

  const role = isUserRole((profile as { access_status?: unknown } | null)?.access_status)
    ? ((profile as { access_status: UserRole }).access_status)
    : "Pending";

  return {
    userId: user.id,
    email: (profile as { email?: string } | null)?.email || user.email || "",
    fullName:
      (profile as { full_name?: string } | null)?.full_name ||
      user.email ||
      user.id,
    role,
  };
}

async function getUserFromCookies(cookieHeader: string | null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) return null;

  const cookies = [...parseCookieHeader(cookieHeader)].map(([name, value]) => ({
    name,
    value,
  }));
  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return cookies;
      },
      setAll() {},
    },
  });
  const { data, error } = await supabase.auth.getUser();

  return error ? null : data.user;
}

async function getUserFromRequest(request: Request) {
  const accessToken = extractBearerToken(request.headers.get("authorization"));

  if (!accessToken) {
    return getUserFromCookies(request.headers.get("cookie"));
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser(accessToken);
  return error ? null : data.user;
}

function profileToAuthUser(profile: ProductionAuthProfile): AuthUser {
  return {
    actor: profile.fullName || profile.email || profile.userId,
    role: profile.role,
    userId: profile.userId,
    email: profile.email,
  };
}

function requestAuthCacheKey(request: Request) {
  const credential =
    request.headers.get("authorization") || request.headers.get("cookie") || "";
  return credential
    ? createHash("sha256").update(credential).digest("hex")
    : "";
}

function pruneRequestAuthCache(now: number) {
  for (const [key, entry] of requestAuthCache) {
    if (entry.expiresAt <= now) requestAuthCache.delete(key);
  }
  while (requestAuthCache.size >= AUTH_CACHE_MAX_ENTRIES) {
    const oldestKey = requestAuthCache.keys().next().value;
    if (!oldestKey) break;
    requestAuthCache.delete(oldestKey);
  }
}

export async function getAuthenticatedRequestUser(request: Request): Promise<AuthUser | null> {
  const cacheKey = requestAuthCacheKey(request);
  if (!cacheKey) return null;

  const now = Date.now();
  const cached = requestAuthCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.value;

  pruneRequestAuthCache(now);
  const value = getUserFromRequest(request)
    .then(getProductionAuthProfile)
    .then((profile) => (profile ? profileToAuthUser(profile) : null));
  requestAuthCache.set(cacheKey, {
    expiresAt: now + AUTH_CACHE_TTL_MS,
    value,
  });

  return value;
}

export async function getAuthenticatedCookieUser(
  cookieHeader: string | null,
): Promise<AuthUser | null> {
  const profile = await getProductionAuthProfile(await getUserFromCookies(cookieHeader));

  return profile ? profileToAuthUser(profile) : null;
}
