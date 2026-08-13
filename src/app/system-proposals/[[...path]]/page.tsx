import { redirect } from "next/navigation";

export default async function LegacySystemProposalRoute({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await params;
  redirect(`/solution-proposals${path?.length ? `/${path.join("/")}` : ""}`);
}
