import Link from "next/link";

import { ClientSafeDocumentRenderer } from "@/app/client-portal/_components/client-portal-components";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildClientSafeDeliveryDocument } from "@/lib/client-portal/safe-renderer";
import {
  getPortalItemForClient,
  validatePortalToken,
} from "@/lib/client-portal/storage";
import { getDeliveryProject } from "@/features/delivery/storage/delivery-storage";

export default async function PortalDeliveryPage({
  params,
}: {
  params: Promise<{ token: string; id: string }>;
}) {
  const { token, id } = await params;
  const validation = await validatePortalToken(token);

  if (validation.status !== "valid") {
    return <PortalMessage title="Portal access unavailable" />;
  }

  const item = await getPortalItemForClient(validation.access.clientId, id);
  if (!item || item.itemType !== "Delivery Report") {
    return <PortalMessage title="Delivery report not found" token={token} />;
  }

  const project = await getDeliveryProject(item.itemId);
  if (!project || project.clientId !== validation.access.clientId) {
    return <PortalMessage title="Delivery report not found" token={token} />;
  }

  return (
    <div className="space-y-5 py-8">
      <Button asChild variant="outline">
        <Link href={`/client-portal/${token}`}>Back to Portal</Link>
      </Button>
      <ClientSafeDocumentRenderer
        title={item.title}
        content={buildClientSafeDeliveryDocument(project)}
      />
      <Card className="border-teal-300/20 bg-teal-300/10 shadow-executive">
        <CardHeader>
          <CardTitle>Delivery Feedback</CardTitle>
          <CardDescription>
            Share comments or requested changes on the delivery report.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="gold">
            <Link href={`/client-portal/${token}/feedback/${item.id}`}>
              Give Feedback
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PortalMessage({ title, token }: { title: string; token?: string }) {
  return (
    <Card className="mx-auto mt-12 max-w-xl border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          This delivery document is not currently published for client review.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href={token ? `/client-portal/${token}` : "/client-portal/login"}>
            Back to Portal
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
