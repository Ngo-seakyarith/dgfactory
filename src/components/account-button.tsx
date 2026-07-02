"use client";

import { useState } from "react";
import { Loader2, LogIn, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AccountButtonProps = {
  isAuthenticated: boolean;
};

export function AccountButton({ isAuthenticated }: AccountButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function signIn() {
    setIsLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();

      if (!supabase) throw new Error("Supabase browser auth is not configured.");

      const next = window.location.pathname === "/login" ? "/dashboard" : window.location.pathname;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
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
      window.location.href = "/login";
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={isAuthenticated ? "outline" : "gold"}
      onClick={isAuthenticated ? signOut : signIn}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isAuthenticated ? (
        <LogOut className="h-4 w-4" />
      ) : (
        <LogIn className="h-4 w-4" />
      )}
      {isAuthenticated ? "Sign out" : "Sign in"}
    </Button>
  );
}
