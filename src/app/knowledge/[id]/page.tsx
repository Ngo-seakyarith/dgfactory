import { KnowledgeDocumentDetail } from "@/app/knowledge/_components/knowledge-components";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function KnowledgeDetailPage({ params }: PageProps) {
  const { id } = await params;

  return <KnowledgeDocumentDetail id={id} />;
}
