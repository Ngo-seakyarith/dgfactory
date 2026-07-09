"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Clipboard,
  ExternalLink,
  Eye,
  Loader2,
  Lock,
  Send,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  ClientFeedback,
  ClientPortalAccess,
  ClientPortalItem,
  ClientPortalItemType,
} from "@/lib/client-portal/types";
import { portalDecisionStatuses } from "@/lib/client-portal/types";
import type { Client, Opportunity } from "@/lib/crm";
import type { DeliveryProject } from "@/lib/delivery";
import type { TrainingPackage } from "@/features/training-packages";

type PublicAccess = Omit<ClientPortalAccess, "accessTokenHash">;

export function ClientPortalLogin() {
  const router = useRouter();
  const [token, setToken] = useState("");

  function openPortal() {
    const trimmed = token.trim();
    if (trimmed) {
      router.push(`/client-portal/${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <Card className="mx-auto max-w-2xl border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardTitle>Client Portal Login</CardTitle>
        <CardDescription>
          Enter the secure access token shared by DG Academy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Paste secure portal token"
        />
        <Button type="button" variant="gold" onClick={openPortal}>
          <Lock className="h-4 w-4" />
          Open Client Portal
        </Button>
      </CardContent>
    </Card>
  );
}

export function ClientSafeDocumentRenderer({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Client-safe view. Internal notes, margins, QA notes, private knowledge,
          and prompt details are excluded.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap rounded-lg border border-white/10 bg-[#07111f]/70 p-5 font-sans text-sm leading-7 text-slate-100">
          {content || "This document is empty."}
        </pre>
      </CardContent>
    </Card>
  );
}

export function ClientFeedbackForm({
  token,
  portalItemId,
  title,
}: {
  token: string;
  portalItemId: string;
  title: string;
}) {
  const [rating, setRating] = useState("5");
  const [comments, setComments] = useState("");
  const [requestedChanges, setRequestedChanges] = useState("");
  const [decisionStatus, setDecisionStatus] = useState("Reviewing");
  const [nextStepPreference, setNextStepPreference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  async function submitFeedback() {
    setIsSubmitting(true);
    setNotice("");

    try {
      const response = await fetch(`/api/client-portal/${encodeURIComponent(token)}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portalItemId,
          rating: Number(rating),
          comments,
          requestedChanges,
          decisionStatus,
          nextStepPreference,
        }),
      });
      const payload = (await response.json()) as {
        feedback?: ClientFeedback;
        error?: string;
      };

      if (!response.ok || !payload.feedback) {
        throw new Error(payload.error ?? "Feedback submission failed.");
      }

      setNotice("Thank you. Your feedback has been submitted to DG Academy.");
      setComments("");
      setRequestedChanges("");
      setNextStepPreference("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Feedback submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Share your review, revision requests, and preferred next step.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Satisfaction rating">
            <Select value={rating} onChange={(event) => setRating(event.target.value)}>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} / 5
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Decision status">
            <Select
              value={decisionStatus}
              onChange={(event) => setDecisionStatus(event.target.value)}
            >
              {portalDecisionStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Comments">
          <Textarea
            value={comments}
            onChange={(event) => setComments(event.target.value)}
            placeholder="What looks good, what needs clarification, and any decision context."
          />
        </Field>
        <Field label="Requested changes">
          <Textarea
            value={requestedChanges}
            onChange={(event) => setRequestedChanges(event.target.value)}
            placeholder="List any changes you want DG Academy to make."
          />
        </Field>
        <Field label="Preferred next step">
          <Input
            value={nextStepPreference}
            onChange={(event) => setNextStepPreference(event.target.value)}
            placeholder="Proposal review call, revised proposal, procurement discussion"
          />
        </Field>
        {notice ? (
          <p className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-3 text-sm text-teal-50">
            {notice}
          </p>
        ) : null}
        <Button type="button" variant="gold" onClick={submitFeedback} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit Feedback
        </Button>
      </CardContent>
    </Card>
  );
}

export function ClientPortalManager({
  client,
  opportunities,
  packages,
}: {
  client: Client;
  opportunities: Opportunity[];
  packages: TrainingPackage[];
}) {
  const [access, setAccess] = useState<PublicAccess[]>([]);
  const [items, setItems] = useState<ClientPortalItem[]>([]);
  const [deliveryProjects, setDeliveryProjects] = useState<DeliveryProject[]>([]);
  const [contactEmail, setContactEmail] = useState(client.email);
  const [expiresAt, setExpiresAt] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [selectedPackageType, setSelectedPackageType] =
    useState<ClientPortalItemType>("Proposal");
  const [selectedDeliveryId, setSelectedDeliveryId] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [suggestedEmail, setSuggestedEmail] = useState("");

  const linkedPackageIds = useMemo(
    () =>
      new Set(
        opportunities
          .map((opportunity) => opportunity.linkedPackageId)
          .filter((id): id is string => Boolean(id)),
      ),
    [opportunities],
  );
  const clientPackages = useMemo(() => {
    const normalizedClientName = client.name.toLowerCase();
    return packages.filter(
      (pkg) =>
        linkedPackageIds.has(pkg.id) ||
        pkg.client.toLowerCase().includes(normalizedClientName),
    );
  }, [client.name, linkedPackageIds, packages]);
  const clientDeliveryProjects = deliveryProjects.filter(
    (project) => project.clientId === client.id,
  );

  async function refreshPortal() {
    const [accessResponse, itemsResponse, deliveryResponse] = await Promise.all([
      fetch(`/api/client-portal/access?clientId=${encodeURIComponent(client.id)}`, {
        cache: "no-store",
      }),
      fetch(`/api/client-portal/items?clientId=${encodeURIComponent(client.id)}`, {
        cache: "no-store",
      }),
      fetch("/api/delivery-projects", { cache: "no-store" }),
    ]);
    const accessPayload = (await accessResponse.json()) as { access?: PublicAccess[] };
    const itemsPayload = (await itemsResponse.json()) as { items?: ClientPortalItem[] };
    const deliveryPayload = (await deliveryResponse.json()) as {
      projects?: DeliveryProject[];
    };

    setAccess(accessPayload.access ?? []);
    setItems(itemsPayload.items ?? []);
    setDeliveryProjects(deliveryPayload.projects ?? []);
  }

  useEffect(() => {
    refreshPortal().catch(() => setNotice("Portal records could not be loaded."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id]);

  async function createAccessLink() {
    setIsBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/client-portal/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          contactEmail,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });
      const payload = (await response.json()) as {
        access?: PublicAccess;
        link?: string;
        suggestedEmail?: string;
        error?: string;
      };
      if (!response.ok || !payload.access || !payload.link) {
        throw new Error(payload.error ?? "Portal link creation failed.");
      }
      setShareLink(payload.link);
      setSuggestedEmail(payload.suggestedEmail ?? "");
      await refreshPortal();
      setNotice("Secure client portal link created. No email was sent automatically.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Portal link creation failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function revokeAccess(id: string) {
    setIsBusy(true);
    setNotice("");
    try {
      await fetch(`/api/client-portal/access/${id}`, { method: "PATCH" });
      await refreshPortal();
      setNotice("Client portal access revoked.");
    } catch {
      setNotice("Access could not be revoked.");
    } finally {
      setIsBusy(false);
    }
  }

  async function publishPackageItem() {
    if (!selectedPackageId) {
      setNotice("Select a package to publish.");
      return;
    }
    const pkg = packages.find((item) => item.id === selectedPackageId);
    await publishItem({
      itemType: selectedPackageType,
      itemId: selectedPackageId,
      title: `${selectedPackageType}: ${pkg?.title ?? "Training package"}`,
    });
  }

  async function publishDeliveryReport() {
    if (!selectedDeliveryId) {
      setNotice("Select a delivery project to publish.");
      return;
    }
    const project = deliveryProjects.find((item) => item.id === selectedDeliveryId);
    await publishItem({
      itemType: "Delivery Report",
      itemId: selectedDeliveryId,
      title: `Delivery Report: ${project?.title ?? "Training delivery"}`,
    });
  }

  async function publishFeedbackForm() {
    await publishItem({
      itemType: "Feedback Form",
      itemId: client.id,
      title: `${client.name} Feedback Form`,
    });
  }

  async function publishItem(input: {
    itemType: ClientPortalItemType;
    itemId: string;
    title: string;
  }) {
    setIsBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/client-portal/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          ...input,
          visibility: "Client Visible",
          status: "Published",
        }),
      });
      const payload = (await response.json()) as {
        item?: ClientPortalItem;
        error?: string;
      };
      if (!response.ok || !payload.item) {
        throw new Error(payload.error ?? "Publishing failed.");
      }
      await refreshPortal();
      setNotice(`${payload.item.title} is published to the client portal.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Publishing failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setNotice("Copied.");
  }

  return (
    <Card className="border-teal-300/20 bg-teal-300/10 shadow-executive">
      <CardHeader>
        <CardTitle>Client Portal</CardTitle>
        <CardDescription>
          Publish client-safe proposal and delivery documents. Internal margins,
          notes, QA, prompts, and private knowledge stay hidden.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <Input
            type="email"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            placeholder="Client contact email"
          />
          <Input
            type="date"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
          />
          <Button type="button" variant="gold" onClick={createAccessLink} disabled={isBusy}>
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Create Access Link
          </Button>
        </div>

        {shareLink ? (
          <div className="space-y-3 rounded-lg border border-teal-300/25 bg-[#07111f]/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 text-sm text-teal-50 break-all">{shareLink}</div>
              <Button type="button" variant="outline" size="sm" onClick={() => copy(shareLink)}>
                <Clipboard className="h-4 w-4" />
                Copy Link
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => copy(suggestedEmail)}>
                <Clipboard className="h-4 w-4" />
                Copy Suggested Email
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={shareLink} target="_blank">
                  <ExternalLink className="h-4 w-4" />
                  Open Portal
                </Link>
              </Button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-3 rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
            <div className="text-sm font-semibold text-white">Publish Package</div>
            <Select
              value={selectedPackageType}
              onChange={(event) =>
                setSelectedPackageType(event.target.value as ClientPortalItemType)
              }
            >
              <option value="Proposal">Proposal</option>
              <option value="Syllabus">Syllabus</option>
              <option value="Training Plan">Training Plan</option>
            </Select>
            <Select
              value={selectedPackageId}
              onChange={(event) => setSelectedPackageId(event.target.value)}
            >
              <option value="">Select package</option>
              {(clientPackages.length ? clientPackages : packages).map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.title}
                </option>
              ))}
            </Select>
            <Button type="button" variant="outline" onClick={publishPackageItem} disabled={isBusy}>
              <UploadCloud className="h-4 w-4" />
              Publish
            </Button>
          </div>

          <div className="space-y-3 rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
            <div className="text-sm font-semibold text-white">Publish Delivery Report</div>
            <Select
              value={selectedDeliveryId}
              onChange={(event) => setSelectedDeliveryId(event.target.value)}
            >
              <option value="">Select delivery project</option>
              {clientDeliveryProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </Select>
            <Button type="button" variant="outline" onClick={publishDeliveryReport} disabled={isBusy}>
              <UploadCloud className="h-4 w-4" />
              Publish Report
            </Button>
          </div>

          <div className="space-y-3 rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
            <div className="text-sm font-semibold text-white">Client Feedback</div>
            <p className="text-sm leading-6 text-muted-foreground">
              Publish a feedback form for proposal decisions and client comments.
            </p>
            <Button type="button" variant="outline" onClick={publishFeedbackForm} disabled={isBusy}>
              <Eye className="h-4 w-4" />
              Publish Feedback Form
            </Button>
          </div>
        </div>

        {notice ? (
          <p className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-3 text-sm text-teal-50">
            {notice}
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
            <div className="mb-3 text-sm font-semibold text-white">Access Links</div>
            <div className="space-y-2">
              {access.length ? (
                access.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div>
                      <div className="text-sm text-white">{item.contactEmail}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Expires {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : "never"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.status === "Active" ? "teal" : "outline"}>
                        {item.status}
                      </Badge>
                      {item.status === "Active" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => revokeAccess(item.id)}
                        >
                          <XCircle className="h-4 w-4" />
                          Revoke
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No portal access links yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-[#07111f]/55 p-4">
            <div className="mb-3 text-sm font-semibold text-white">Published Items</div>
            <div className="space-y-2">
              {items.length ? (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-medium text-white">{item.title}</div>
                      <Badge variant={item.status === "Published" ? "teal" : "outline"}>
                        {item.status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{item.itemType}</span>
                      <span>{item.visibility}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No portal items published yet.</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
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
