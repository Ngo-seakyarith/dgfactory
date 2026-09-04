"use client";

import { useState } from "react";
import { Loader2, LogIn, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type SidebarAccount = {
  name?: string;
  email?: string;
  avatarUrl?: string;
};

type AccountButtonProps = {
  isAuthenticated: boolean;
  className?: string;
  account?: SidebarAccount;
  collapsed?: boolean;
};

function initialsOf(account: SidebarAccount | undefined) {
  const source = account?.name || account?.email || "User";
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function AccountButton({
  isAuthenticated,
  className,
  account,
  collapsed = false,
}: AccountButtonProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  // A Google avatar can still 403 on hotlink, so the initials stay as a fallback.
  const [avatarFailed, setAvatarFailed] = useState(false);

  async function signIn() {
    setIsLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();

      if (!supabase) throw new Error("Supabase browser auth is not configured.");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    setIsLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      await supabase?.auth.signOut();
      queryClient.clear();
      window.location.href = "/login";
    } finally {
      setIsLoading(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <Button
        type="button"
        variant="gold"
        onClick={signIn}
        disabled={isLoading}
        className={cn("w-full", collapsed ? "justify-center px-0" : "justify-start", className)}
        title="Sign in"
        aria-label={collapsed ? "Sign in" : undefined}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        {collapsed ? null : "Sign in"}
      </Button>
    );
  }

  const showAvatar = Boolean(account?.avatarUrl) && !avatarFailed;

  return (
    <div className={cn("flex items-center gap-3", collapsed && "flex-col gap-2", className)}>
      {showAvatar ? (
        // Google avatars are hotlinked and need the no-referrer policy.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={account?.avatarUrl}
          alt={account?.name ?? "Account"}
          width={32}
          height={32}
          referrerPolicy="no-referrer"
          onError={() => setAvatarFailed(true)}
          className="h-8 w-8 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-semibold text-stone-50">
          {initialsOf(account)}
        </div>
      )}

      {collapsed ? null : (
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-stone-50">
            {account?.name || "Signed in"}
          </div>
          <div className="truncate text-[11px] text-stone-400">{account?.email}</div>
        </div>
      )}

      <button
        type="button"
        onClick={signOut}
        disabled={isLoading}
        title="Sign out"
        aria-label="Sign out"
        className="shrink-0 rounded-sm p-1.5 text-stone-400 transition-colors hover:bg-white/[0.06] hover:text-stone-50 disabled:opacity-40"
      >
        {isLoading ? (
          <Loader2 className={cn("animate-spin", collapsed ? "h-5 w-5" : "h-[18px] w-[18px]")} />
        ) : (
          <LogOut className={cn(collapsed ? "h-5 w-5" : "h-[18px] w-[18px]")} />
        )}
      </button>
    </div>
  );
}
