"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileInput,
  Plus,
  RotateCcw,
} from "lucide-react";

import { QueryErrorState } from "@/components/query-error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import type {
  SyllabusImportStatus,
  SyllabusProposalImport,
} from "../domain/types";
import { useSyllabusImportsQuery } from "../queries";

function statusPresentation(status: SyllabusImportStatus) {
  switch (status) {
    case "Completed":
      return { label: "Completed", variant: "teal" as const, icon: CheckCircle2 };
    case "Needs Input":
      return { label: "Needs input", variant: "gold" as const, icon: CircleAlert };
    case "Failed":
      return { label: "Failed", variant: "destructive" as const, icon: CircleAlert };
    case "Finalizing":
      return { label: "Finalizing", variant: "secondary" as const, icon: Clock3 };
    default:
      return { label: "In progress", variant: "secondary" as const, icon: Clock3 };
  }
}

function importDestination(value: SyllabusProposalImport) {
  return `/packages/from-syllabus/${value.id}`;
}

function ImportRow({ value }: { value: SyllabusProposalImport }) {
  const status = statusPresentation(value.status);
  const StatusIcon = status.icon;
  const client = value.corrections.clientName || value.mapping?.clientName || "Client pending";

  return (
    <Link
      href={importDestination(value)}
      className="group grid gap-4 border-t border-border px-5 py-4 transition-colors first:border-t-0 hover:bg-muted/40 md:grid-cols-[minmax(0,1fr)_180px_150px_auto] md:items-center"
    >
      <div className="min-w-0">
        <div className="truncate font-semibold text-foreground">{value.originalName}</div>
        <div className="mt-1 truncate text-sm text-muted-foreground">{client}</div>
      </div>
      <Badge variant={status.variant} className="w-fit gap-1.5">
        <StatusIcon className="h-3 w-3" />
        {status.label}
      </Badge>
      <div className="text-sm text-muted-foreground">
        {new Date(value.updatedAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}

function ImportListSkeleton() {
  return (
    <div aria-label="Loading syllabus imports" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="grid gap-4 border-t border-border px-5 py-4 first:border-t-0 md:grid-cols-[minmax(0,1fr)_180px_150px_auto] md:items-center"
        >
          <div className="space-y-2">
            <Skeleton className="h-5 w-64 max-w-full" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </div>
      ))}
    </div>
  );
}

export function SyllabusImportList() {
  const importsQuery = useSyllabusImportsQuery();
  const imports = importsQuery.data ?? [];

  return (
    <div className="space-y-5">
      <div className="page-heading flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="page-eyebrow">Training production</div>
          <h1 className="page-title">Syllabus Imports</h1>
          <p className="page-description">
            Resume proposal generation, provide missing information, or open completed packages.
          </p>
        </div>
        <Button asChild>
          <Link href="/packages/from-syllabus/new">
            <Plus className="h-4 w-4" />New import
          </Link>
        </Button>
      </div>

      {importsQuery.isError ? (
        <QueryErrorState
          detail={importsQuery.error.message}
          onRetry={() => void importsQuery.refetch()}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileInput className="h-4 w-4 text-teal-700" />Import history
            </CardTitle>
            <CardDescription>
              In-progress and completed imports remain available from this list.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {importsQuery.isPending ? (
              <ImportListSkeleton />
            ) : imports.length ? (
              imports.map((value) => <ImportRow key={value.id} value={value} />)
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center">
                <FileInput className="h-8 w-8 text-muted-foreground" />
                <div className="mt-4 font-semibold text-foreground">No syllabus imports yet</div>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Upload an external syllabus to create a DG Academy proposal.
                </p>
                <Button asChild className="mt-5">
                  <Link href="/packages/from-syllabus/new">
                    <Plus className="h-4 w-4" />New import
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {importsQuery.isFetching && importsQuery.data ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RotateCcw className="h-3 w-3 animate-spin" />Refreshing imports
        </div>
      ) : null}
    </div>
  );
}
