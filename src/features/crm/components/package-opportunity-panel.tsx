"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { normalizeOpportunity } from "@/features/crm/domain";
import {
  useClientsQuery,
  useOpportunitiesQuery,
  useSaveOpportunityMutation,
} from "@/features/crm/queries";
import type { TrainingPackage } from "@/features/training-packages";

export function PackageOpportunityPanel({ pkg }: { pkg: TrainingPackage }) {
  const clients = useClientsQuery().data ?? [];
  const opportunities = useOpportunitiesQuery().data ?? [];
  const saveMutation = useSaveOpportunityMutation();
  const linkedOpportunity = opportunities.find(
    (opportunity) => opportunity.linkedPackageId === pkg.id,
  );
  const linkedClient = clients.find(
    (client) => client.id === linkedOpportunity?.clientId,
  );
  const [selectedOpportunityId, setSelectedOpportunityId] = useState("");
  const [notice, setNotice] = useState("");

  async function linkExistingOpportunity() {
    const opportunity = opportunities.find((item) => item.id === selectedOpportunityId);

    if (!opportunity) {
      setNotice("Select an opportunity to link.");
      return;
    }

    const updated = normalizeOpportunity({
      ...opportunity,
      linkedPackageId: pkg.id,
      updatedAt: new Date().toISOString(),
    });
    try {
      await saveMutation.mutateAsync(updated);
      setNotice("Package linked to opportunity.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Opportunity link save failed.");
    }
  }

  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardTitle>Opportunity Link</CardTitle>
        <CardDescription>
          Connect this training package to the proposal pipeline.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {linkedOpportunity ? (
          <div className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-4">
            <div className="text-sm font-semibold text-teal-50">
              Linked to {linkedOpportunity.title}
            </div>
            <p className="mt-1 text-sm text-teal-50/80">
              {linkedClient?.name ?? "Client not found"} - {linkedOpportunity.status}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href={`/opportunities/${linkedOpportunity.id}`}>
                Open Opportunity
              </Link>
            </Button>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Select
            value={selectedOpportunityId}
            onChange={(event) => setSelectedOpportunityId(event.target.value)}
          >
            <option value="">Select opportunity to link</option>
            {opportunities.map((opportunity) => (
              <option key={opportunity.id} value={opportunity.id}>
                {opportunity.title}
              </option>
            ))}
          </Select>
          <Button type="button" variant="outline" onClick={linkExistingOpportunity} disabled={saveMutation.isPending}>
            Link to Opportunity
          </Button>
        </div>

        <Button asChild variant="gold">
          <Link href={`/opportunities/new?packageId=${pkg.id}`}>
            <Plus className="h-4 w-4" />
            Create Opportunity from Package
          </Link>
        </Button>

        {notice ? <p className="text-sm text-teal-50">{notice}</p> : null}
      </CardContent>
    </Card>
  );
}

