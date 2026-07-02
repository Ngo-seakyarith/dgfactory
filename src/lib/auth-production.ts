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

export async function getAuthenticatedRequestUser(request: Request): Promise<AuthUser | null> {
  const profile = await getProductionAuthProfile(await getUserFromRequest(request));

  return profile ? profileToAuthUser(profile) : null;
}

export async function getAuthenticatedCookieUser(
  cookieHeader: string | null,
): Promise<AuthUser | null> {
  const profile = await getProductionAuthProfile(await getUserFromCookies(cookieHeader));

  return profile ? profileToAuthUser(profile) : null;
}
