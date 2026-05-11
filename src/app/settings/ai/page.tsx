import { AiSettingsPanel } from "@/components/ai-settings";

export default function AiSettingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">AI Settings</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Verify the Brain Layer model, fallback behavior, and mock-mode status.
        </p>
      </div>
      <AiSettingsPanel />
    </div>
  );
}
