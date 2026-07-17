import { SavedPackagesClient } from "@/features/training-packages/components";

export default function PackagesPage() {
  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div className="page-eyebrow">Training production</div>
        <h1 className="page-title">Saved packages</h1>
        <p className="page-description">
          Reopen, revise, regenerate, and export every saved client training package.
        </p>
      </div>
      <SavedPackagesClient />
    </div>
  );
}
