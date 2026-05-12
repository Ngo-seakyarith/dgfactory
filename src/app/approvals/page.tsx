"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, ShieldAlert, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type {
  ApprovalRequest,
  ApprovalStatus,
} from "@/lib/orchestrator/commands";

type ApprovalPayload = {
  approvals?: ApprovalRequest[];
  approval?: ApprovalRequest;
  error?: string;
};

export default function ApprovalCenter() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function loadApprovals() {
    setIsLoading(true);
    setNotice("");

    try {
      const response = await fetch("/api/approvals");
      const payload = (await response.json()) as ApprovalPayload;

      if (!response.ok || !payload.approvals) {
        throw new Error(payload.error ?? "Approvals could not load.");
      }

      setApprovals(payload.approvals);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Approvals failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function updateApproval(approval: ApprovalRequest, status: ApprovalStatus) {
    setUpdatingId(approval.id);
    setNotice("");

    try {
      const response = await fetch(`/api/approvals/${approval.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          humanNote: notes[approval.id] ?? approval.humanNote,
        }),
      });
      const payload = (await response.json()) as ApprovalPayload;

      if (!response.ok || !payload.approval) {
        throw new Error(payload.error ?? "Approval update failed.");
      }

      setNotice(`Request ${status.toLowerCase()}. No external action was executed by this approval screen.`);
      await loadApprovals();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Approval update failed.");
    } finally {
      setUpdatingId("");
    }
  }

  useEffect(() => {
    void loadApprovals();
  }, []);

  if (isLoading) {
    return (
      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading approval requests...
        </CardContent>
      </Card>
    );
  }

  const pending = approvals.filter((approval) => approval.status === "Pending");

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-teal-300/20 bg-teal-300/10 p-6 shadow-executive">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
            V2.3 Approval Gate
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">
            Human Approval Center
          </h1>
          <p className="mt-3 text-sm leading-7 text-teal-50/80">
            Review OpenClaw requests before any external sending, deletion,
            deployment, payment, or client data export. Approving records a human
            decision; it does not execute external actions automatically.
          </p>
        </div>
      </section>

      {notice ? (
        <p className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-3 text-sm text-teal-50">
          {notice}
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Pending" value={String(pending.length)} />
        <Metric
          label="Approved"
          value={String(approvals.filter((item) => item.status === "Approved").length)}
        />
        <Metric
          label="Rejected"
          value={String(approvals.filter((item) => item.status === "Rejected").length)}
        />
      </section>

      <Card className="border-white/10 bg-white/[0.04] shadow-executive">
        <CardHeader>
          <CardTitle>Approval Requests</CardTitle>
          <CardDescription>
            Payloads are shown for review. Check client data carefully before approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {approvals.length ? (
            approvals.map((approval) => (
              <div
                key={approval.id}
                className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <ShieldAlert className="h-4 w-4 text-[#f7d889]" />
                      {approval.actionType}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Requested by {approval.requestedBy} on{" "}
                      {new Date(approval.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={approval.riskLevel === "High" ? "gold" : "teal"}>
                      {approval.riskLevel} risk
                    </Badge>
                    <Badge variant={approval.status === "Pending" ? "gold" : "outline"}>
                      {approval.status}
                    </Badge>
                  </div>
                </div>
                <pre className="mt-3 max-h-72 overflow-auto rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-5 text-muted-foreground">
                  {JSON.stringify(approval.payload, null, 2)}
                </pre>
                <Textarea
                  className="mt-3"
                  value={notes[approval.id] ?? approval.humanNote}
                  onChange={(event) =>
                    setNotes((current) => ({
                      ...current,
                      [approval.id]: event.target.value,
                    }))
                  }
                  placeholder="Human note, condition, or reason"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="gold"
                    size="sm"
                    onClick={() => updateApproval(approval, "Approved")}
                    disabled={approval.status !== "Pending" || updatingId === approval.id}
                  >
                    {updatingId === approval.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateApproval(approval, "Rejected")}
                    disabled={approval.status !== "Pending" || updatingId === approval.id}
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-white/15 bg-[#07111f]/45 p-4 text-sm text-muted-foreground">
              No approval requests yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
