import { saveProjectRequest } from "@/features/pipeline/server/project-handlers";
export { listProjectsRequest as GET } from "@/features/pipeline/server/project-handlers";
export function POST(request: Request) { return saveProjectRequest(request); }
