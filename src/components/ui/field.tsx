import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
  description?: string;
};

function Field({ label, children, className, description }: FieldProps) {
  return (
    <Label className={cn("block space-y-2", className)}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {description ? (
        <span className="block text-xs leading-5 text-muted-foreground">
          {description}
        </span>
      ) : null}
    </Label>
  );
}

export { Field };
