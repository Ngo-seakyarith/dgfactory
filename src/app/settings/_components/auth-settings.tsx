"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, UserCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { userRoles, type AuthUser, type UserRole } from "@/lib/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SessionPayload = {
  user?: AuthUser;
  authRequired?: boolean;
  error?: string;
};

export function AuthSettings() {
  const [actor, setActor] = useState("DG Academy Operator");
  const [role, setRole] = useState<UserRole>("Admin");
  const [adminPin, setAdminPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthRequired, setIsAuthRequired] = useState(false);

  async function loadSession() {
    const response = await fetch("/api/auth/session");
    const payload = (await response.json()) as SessionPayload;

    if (payload.user) {
      setActor(payload.user.actor);
      setRole(payload.user.role);
    }
    setIsAuthRequired(Boolean(payload.authRequired));
  }

  async function signInWithSupabase() {
    setIsSaving(true);
    setNotice("");

    try {
      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        throw new Error("Supabase browser auth is not configured.");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      setNotice("Signed in. Refreshing session...");
      window.location.reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Sign in failed.");
    } finally {
      setIsSaving(false);
    }
  }

  async function signOut() {
    setIsSaving(true);
    setNotice("");

    try {
      const supabase = createSupabaseBrowserClient();
      await supabase?.auth.signOut();
      await fetch("/api/auth/session", { method: "DELETE" });
      setNotice("Signed out.");
      window.location.href = "/login";
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Sign out failed.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveSession() {
    setIsSaving(true);
    setNotice("");

    try {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor, role, adminPin }),
      });
      const payload = (await response.json()) as SessionPayload;

      if (!response.ok || !payload.user) {
        throw new Error(payload.error ?? "Role update failed.");
      }

      setNotice(`Active role set to ${payload.user.role}. Refresh if navigation does not update immediately.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Role update failed.");
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    void loadSession();
  }, []);

  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-[#f7d889]" />
          Internal Access
        </CardTitle>
        <CardDescription>
          {isAuthRequired
            ? "Sign in with Supabase Auth. Roles come from active organization memberships."
            : "Select an internal role for this browser session while production auth is disabled."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAuthRequired ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-white">Email</span>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-white">Password</span>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="gold" onClick={signInWithSupabase} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Sign in
              </Button>
              <Button type="button" variant="outline" onClick={signOut} disabled={isSaving}>
                Sign out
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-white">Actor</span>
                <Input value={actor} onChange={(event) => setActor(event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-white">Role</span>
                <Select
                  value={role}
                  onChange={(event) => setRole(event.target.value as UserRole)}
                >
                  {userRoles.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </Select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-white">Admin PIN</span>
                <Input
                  type="password"
                  value={adminPin}
                  onChange={(event) => setAdminPin(event.target.value)}
                  placeholder="Only if configured"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="gold" onClick={saveSession} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Save Role
              </Button>
            </div>
          </>
        )}
        {notice ? (
          <p className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-3 text-sm text-teal-50">
            {notice}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
