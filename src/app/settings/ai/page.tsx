import { AiSettingsPanel } from "@/app/settings/_components/ai-settings";

export default function AiSettingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">AI Settings</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Verify the Brain Layer model, credential status, and generation errors.
        </p>
      </div>
      <AiSettingsPanel />
    </div>
  );
}
