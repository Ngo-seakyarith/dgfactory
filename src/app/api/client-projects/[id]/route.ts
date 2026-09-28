import { saveProjectRequest } from "@/features/pipeline/server/project-handlers";

export { getProjectRequest as GET, deleteProjectRequest as DELETE } from "@/features/pipeline/server/project-handlers";

export function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return saveProjectRequest(request, context);
}
