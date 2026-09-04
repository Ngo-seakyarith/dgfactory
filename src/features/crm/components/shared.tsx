"use client";

import Link from "next/link";
import { useState } from "react";
import type React from "react";
import { Clipboard, DollarSign, Plus, Search } from "lucide-react";

import { DetailLoadingSkeleton } from "@/components/page-loading-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { OpportunityStatus } from "@/features/crm/domain";

export function OpportunityStatusBadge({ status }: { status: OpportunityStatus }) {
  const variant =
    status === "Won" || status === "Delivered"
      ? "teal"
      : status === "Lost" || status === "Dormant"
        ? "outline"
        : "gold";

  return <Badge variant={variant}>{status}</Badge>;
}

export function Toolbar({
  query,
  onQueryChange,
  placeholder,
  href,
  label,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder: string;
  href: string;
  label: string;
}) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={placeholder}
            className="pl-9"
          />
        </div>
        <Button asChild variant="gold" className="w-full sm:w-auto">
          <Link href={href}>
            <Plus className="h-4 w-4" />
            {label}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-white">{label}</span>
      {children}
    </label>
  );
}

export function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium leading-6 text-white">{value}</div>
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="data-label">{label}</div>
        <div className="mt-2 font-mono text-xl font-semibold text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}

export function EmptyCrmState({
  title,
  href,
  label,
}: {
  title: string;
  href: string;
  label: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-white/15 bg-[#07111f]/45 p-8 text-center">
      <DollarSign className="mx-auto h-8 w-8 text-teal-100" />
      <div className="mt-4 text-base font-semibold text-white">{title}</div>
      <Button asChild variant="gold" className="mt-5">
        <Link href={href}>
          <Plus className="h-4 w-4" />
          {label}
        </Link>
      </Button>
    </div>
  );
}

export function CrmGridSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2" aria-label="Loading records" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LoadingCard({ label }: { label: string }) {
  return <DetailLoadingSkeleton label={label} />;
}

export function MissingCard({ label, href }: { label: string; href: string }) {
  return (
    <Card className="border-destructive/25 bg-destructive/10 shadow-executive">
      <CardContent className="p-6">
        <div className="font-semibold text-destructive">{label}</div>
        <Button asChild variant="outline" className="mt-4">
          <Link href={href}>Go Back</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function DraftBlock({ title, value }: { title: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-white">{title}</div>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          <Clipboard className="h-4 w-4" />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-slate-100">
        {value}
      </pre>
    </div>
  );
}

