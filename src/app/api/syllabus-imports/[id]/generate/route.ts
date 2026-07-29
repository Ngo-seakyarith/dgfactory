import { startGenerationJob } from "@/features/generation-jobs/server/start-job";
import { generateSyllabusImportRequest } from "@/features/syllabus-imports/server/handlers";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return generateSyllabusImportRequest(request, context, startGenerationJob);
}
