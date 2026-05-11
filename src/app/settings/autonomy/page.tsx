import { AutonomySettingsPanel } from "@/components/autonomy-settings";

export default function AutonomySettingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Autonomy Settings</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Configure how much bounded internal autonomy DG Academy agents have.
        </p>
      </div>
      <AutonomySettingsPanel />
    </div>
  );
}
