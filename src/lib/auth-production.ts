import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isUserRole, type UserRole } from "@/lib/auth";

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

  const profile = (membership as { profiles?: { full_name?: string; email?: string } }).profiles;

  return {
    userId: user.id,
    email: profile?.email || user.email || "",
    fullName: profile?.full_name || user.email || "DG Academy User",
    organizationId: String((membership as { organization_id: string }).organization_id),
    role: (membership as { role: UserRole }).role,
  };
}
