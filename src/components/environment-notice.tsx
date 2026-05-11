import { AlertTriangle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function EnvironmentNotice({ missing }: { missing: string[] }) {
  if (missing.length === 0) {
    return null;
  }

  const missingSupabase =
    missing.includes("NEXT_PUBLIC_SUPABASE_URL") ||
    missing.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const missingOpenAI = missing.includes("OPENAI_API_KEY");

  return (
    <Card className="mb-4 border-[#d7a842]/30 bg-[#d7a842]/10">
      <CardContent className="flex gap-3 p-4 text-sm leading-6 text-[#f3d483]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1">
          {missingSupabase ? (
            <div>
              Supabase is not connected. Add NEXT_PUBLIC_SUPABASE_URL and
              NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart npm run
              dev. Local fallback data is being used.
            </div>
          ) : null}
          {missingOpenAI ? (
            <div>
              OpenAI is not connected. Add OPENAI_API_KEY in .env.local, then
              restart npm run dev. AI extraction and diagnosis will not run.
            </div>
          ) : null}
          {!missingSupabase && !missingOpenAI ? (
            <div>
              Missing environment variables: {missing.join(", ")}. Configure them in
              .env.local, then restart npm run dev.
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
