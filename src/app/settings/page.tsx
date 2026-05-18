import { CheckCircle2, CircleAlert } from "lucide-react";

import { AuthSettings } from "@/app/settings/_components/auth-settings";
import { AiSettingsPanel } from "@/app/settings/_components/ai-settings";
import { AutonomySettingsPanel } from "@/app/settings/_components/autonomy-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const checks = [
  ["OpenAI API", "OPENAI_API_KEY", Boolean(process.env.OPENAI_API_KEY)],
  ["Brain model", "AI_BRAIN_MODEL", Boolean(process.env.AI_BRAIN_MODEL)],
  [
    "Supabase URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  ],
  [
    "Supabase service role",
    "SUPABASE_SERVICE_ROLE_KEY",
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  ],
  [
    "Orchestrator API key",
    "ORCHESTRATOR_API_KEY",
    Boolean(process.env.ORCHESTRATOR_API_KEY),
  ],
  ["Loop API key", "LOOP_API_KEY", Boolean(process.env.LOOP_API_KEY)],
  ["Auth enforcement", "DG_REQUIRE_AUTH", process.env.DG_REQUIRE_AUTH === "true"],
  ["Admin PIN", "ADMIN_ACCESS_PIN", Boolean(process.env.ADMIN_ACCESS_PIN)],
];

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Missing production credentials are shown here so broken wiring is visible
          and can be fixed before handoff.
        </p>
      </div>
      <AiSettingsPanel />
      <AutonomySettingsPanel />
      <AuthSettings />
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>Environment Status</CardTitle>
          <CardDescription>Server-side configuration for this standalone Factory app.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {checks.map(([label, key, ready]) => (
            <div
              key={key.toString()}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-[#07111f]/55 p-4"
            >
              <div>
                <div className="font-medium text-white">{label}</div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">{key}</div>
              </div>
              <div className={ready ? "text-teal-100" : "text-[#f7d889]"}>
                {ready ? <CheckCircle2 className="h-5 w-5" /> : <CircleAlert className="h-5 w-5" />}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
