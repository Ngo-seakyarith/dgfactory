import { PackageForm } from "@/components/training-package-factory";

export default function NewPackagePage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">New Training Package</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Capture the training brief and commercial assumptions, then generate the
          complete DG Academy package.
        </p>
      </div>
      <PackageForm />
    </div>
  );
}
