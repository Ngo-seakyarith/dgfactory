import Link from "next/link";
import { FileText, MessageSquare, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { saveAuditLog } from "@/lib/audit";
import {
  listPortalItems,
  validatePortalToken,
} from "@/lib/client-portal/storage";
import type { ClientPortalItem } from "@/lib/client-portal/types";
import { getClient } from "@/lib/crm-storage";

function itemHref(token: string, item: ClientPortalItem) {
  if (item.itemType === "Delivery Report") {
    return `/client-portal/${token}/delivery/${item.id}`;
  }

  if (item.itemType === "Feedback Form") {
    return `/client-portal/${token}/feedback/${item.id}`;
  }

  return `/client-portal/${token}/proposal/${item.id}`;
}

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const validation = await validatePortalToken(token);

  if (validation.status !== "valid") {
    return <BlockedPortal status={validation.status} />;
  }

  const [client, items] = await Promise.all([
    getClient(validation.access.clientId),
    listPortalItems(validation.access.clientId, { publishedOnly: true }),
  ]);

  await saveAuditLog({
    actor: validation.access.contactEmail || "Client portal visitor",
    action: "client_portal_opened",
    entityType: "client",
    entityId: validation.access.clientId,
    metadata: { itemCount: items.length },
  });

  return (
    <div className="space-y-6 py-8">
      <Card className="border-teal-300/20 bg-teal-300/10 shadow-executive">
        <CardHeader>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge variant="teal">Secure Portal</Badge>
            <Badge variant="outline">{validation.access.contactEmail}</Badge>
          </div>
          <CardTitle>{client?.name ?? "Client Portal"}</CardTitle>
          <CardDescription>
            Review published DG Academy documents and submit feedback. Only
            client-visible documents are shown here.
          </CardDescription>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
        {items.length ? (
          items.map((item) => (
            <Link
              key={item.id}
              href={itemHref(token, item)}
              className="group rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-executive transition hover:border-teal-300/40 hover:bg-teal-300/10"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                {item.itemType === "Feedback Form" ? (
                  <MessageSquare className="h-5 w-5 text-teal-100" />
                ) : (
                  <FileText className="h-5 w-5 text-teal-100" />
                )}
                <Badge variant="outline">{item.itemType}</Badge>
              </div>
              <div className="font-semibold text-white">{item.title}</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Published for client review.
              </p>
            </Link>
          ))
        ) : (
          <Card className="border-white/10 bg-white/[0.04] shadow-executive md:col-span-2">
            <CardContent className="p-8 text-center">
              <ShieldCheck className="mx-auto h-8 w-8 text-teal-100" />
              <div className="mt-4 font-semibold text-white">No published items yet</div>
              <p className="mt-2 text-sm text-muted-foreground">
                DG Academy will publish proposal or delivery documents when they
                are ready for your review.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

function BlockedPortal({ status }: { status: string }) {
  return (
    <Card className="mx-auto mt-12 max-w-xl border-red-300/25 bg-red-400/10 shadow-executive">
      <CardHeader>
        <CardTitle>Portal Access Unavailable</CardTitle>
        <CardDescription>
          This access link is {status.replace("_", " ")}. Please request a new
          link from DG Academy.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href="/client-portal/login">Back to Portal Login</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
