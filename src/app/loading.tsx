import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 text-sm text-muted-foreground shadow-executive">
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading DG Academy Factory...
      </div>
    </div>
  );
}
