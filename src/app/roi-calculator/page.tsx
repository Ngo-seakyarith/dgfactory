import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { RoiCalculator } from "@/app/product/_components/productization-components";
import { Button } from "@/components/ui/button";

export default function RoiCalculatorPage() {
  return (
    <div className="space-y-5">
      <Button asChild variant="outline">
        <Link href="/product">
          <ArrowLeft className="h-4 w-4" />
          Product Page
        </Link>
      </Button>
      <RoiCalculator />
    </div>
  );
}
