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
  organizationId: string;
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

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id, role, status, profiles(full_name, email)")
    .eq("user_id", user.id)
    .eq("status", "Active")
    .limit(1)
    .maybeSingle();

  if (!membership || !isUserRole((membership as { role?: unknown }).role)) {
    return null;
  }

  const rawProfile = (membership as {
    profiles?: { full_name?: string; email?: string } | Array<{ full_name?: string; email?: string }>;
  }).profiles;
  const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;

  return {
    userId: user.id,
    email: profile?.email || user.email || "",
    fullName: profile?.full_name || user.email || "DG Academy User",
    organizationId: String((membership as { organization_id: string }).organization_id),
    role: (membership as { role: UserRole }).role,
  };
}

function profileToAuthUser(profile: ProductionAuthProfile): AuthUser {
  return {
    actor: profile.fullName || profile.email || "DG Academy User",
    role: profile.role,
    userId: profile.userId,
    email: profile.email,
    organizationId: profile.organizationId,
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
        role: "Viewer",
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
        role: "Viewer",
      };
}
