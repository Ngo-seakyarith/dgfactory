import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  extractBearerToken,
  getRequestUserFallback,
  getSupabaseAccessTokenFromCookies,
  isAuthRequired,
  isUserRole,
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
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function getProductionAuthProfile(accessToken: string | null) {
  if (!accessToken || !isSupabaseAuthConfigured()) {
    return null;
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  const user = userData.user;

  if (userError || !user) {
    return null;
  }

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
      "DG Academy User",
    role,
  };
}

function profileToAuthUser(profile: ProductionAuthProfile): AuthUser {
  return {
    actor: profile.fullName || profile.email || "DG Academy User",
    role: profile.role,
    userId: profile.userId,
    email: profile.email,
  };
}

export async function getAuthenticatedRequestUser(request: Request): Promise<AuthUser> {
  if (!isAuthRequired()) {
    return getRequestUserFallback(request);
  }

  const token =
    extractBearerToken(request.headers.get("authorization")) ||
    getSupabaseAccessTokenFromCookies(request.headers.get("cookie"));
  const profile = await getProductionAuthProfile(token);

  return profile
    ? profileToAuthUser(profile)
    : {
        actor: process.env.DG_DEFAULT_ACTOR || "DG Academy Operator",
        role: "Pending",
      };
}

export async function getAuthenticatedCookieUser(
  cookieHeader: string | null,
): Promise<AuthUser> {
  if (!isAuthRequired()) {
    return getRequestUserFallback(
      new Request("http://dg.local", { headers: { cookie: cookieHeader ?? "" } }),
    );
  }

  const profile = await getProductionAuthProfile(
    getSupabaseAccessTokenFromCookies(cookieHeader),
  );

  return profile
    ? profileToAuthUser(profile)
    : {
        actor: process.env.DG_DEFAULT_ACTOR || "DG Academy Operator",
        role: "Pending",
      };
}
