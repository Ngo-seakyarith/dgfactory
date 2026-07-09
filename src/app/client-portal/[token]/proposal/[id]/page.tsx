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
import {
  getPortalItemForClient,
  validatePortalToken,
} from "@/lib/client-portal/storage";
import { buildClientSafePackageDocument } from "@/lib/client-portal/safe-renderer";
import { getTrainingPackage } from "@/features/training-packages/storage/training-storage";

export default async function PortalProposalPage({
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
  if (
    !item ||
    !["Proposal", "Syllabus", "Training Plan"].includes(item.itemType)
  ) {
    return <PortalMessage title="Document not found" token={token} />;
  }

  const pkg = await getTrainingPackage(item.itemId);
  if (!pkg) {
    return <PortalMessage title="Training package not found" token={token} />;
  }

  const content = buildClientSafePackageDocument({
    pkg,
    documentType: item.itemType as "Proposal" | "Syllabus" | "Training Plan",
  });

  return (
    <div className="space-y-5 py-8">
      <Button asChild variant="outline">
        <Link href={`/client-portal/${token}`}>Back to Portal</Link>
      </Button>
      <ClientSafeDocumentRenderer title={item.title} content={content} />
      <Card className="border-teal-300/20 bg-teal-300/10 shadow-executive">
        <CardHeader>
          <CardTitle>Share Feedback</CardTitle>
          <CardDescription>
            Use the feedback form to request revisions or confirm the next step.
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
          This document is not currently published for client review.
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
