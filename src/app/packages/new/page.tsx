import { PackageForm } from "@/features/training-packages/components";

export default function NewPackagePage() {
  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div className="page-eyebrow">Training production</div>
        <h1 className="page-title">New training package</h1>
        <p className="page-description">
          Capture the client need, program design, trainer, and commercial inputs before generation.
        </p>
      </div>
      <PackageForm />
    </div>
  );
}
