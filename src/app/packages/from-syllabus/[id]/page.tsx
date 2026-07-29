import { SyllabusImportWorkspace } from "@/features/syllabus-imports/components";

export default async function SyllabusImportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SyllabusImportWorkspace initialImportId={id} />;
}
