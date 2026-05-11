"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card className="border-red-300/25 bg-red-400/10 shadow-executive">
      <CardHeader>
        <CardTitle>Something needs attention</CardTitle>
        <CardDescription>
          The Factory caught an interface error before it broke the whole app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-red-100/85">
          {error.message || "Please retry the page. If it repeats, check server logs."}
        </p>
        <Button type="button" variant="outline" onClick={reset}>
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
