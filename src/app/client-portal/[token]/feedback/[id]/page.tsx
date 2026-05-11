import Link from "next/link";

import { ClientFeedbackForm } from "@/components/client-portal-components";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getPortalItemForClient,
  validatePortalToken,
} from "@/lib/client-portal/storage";

export default async function PortalFeedbackPage({
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
  if (!item) {
    return <PortalMessage title="Feedback form not found" token={token} />;
  }

  return (
    <div className="space-y-5 py-8">
      <Button asChild variant="outline">
        <Link href={`/client-portal/${token}`}>Back to Portal</Link>
      </Button>
      <ClientFeedbackForm token={token} portalItemId={item.id} title={item.title} />
    </div>
  );
}

function PortalMessage({ title, token }: { title: string; token?: string }) {
  return (
    <Card className="mx-auto mt-12 max-w-xl border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          This feedback form is not currently available.
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
