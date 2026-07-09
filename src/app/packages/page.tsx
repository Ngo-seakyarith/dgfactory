import { SavedPackagesClient } from "@/features/training-packages/components";

export default function PackagesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Saved Packages</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Reopen locally saved packages or Supabase-backed packages when configured.
        </p>
      </div>
      <SavedPackagesClient />
    </div>
  );
}
