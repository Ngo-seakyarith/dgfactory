import { redirect } from "next/navigation";

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ clientId?: string }> }) {
  const { clientId } = await searchParams;
  redirect(`/pipeline?${new URLSearchParams({ newProject: "1", ...(clientId ? { clientId } : {}) })}`);
}
