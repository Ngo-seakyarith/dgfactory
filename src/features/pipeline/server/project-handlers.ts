import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApproved } from "@/lib/route-guards";
import { saveAuditLog } from "@/lib/audit";
import { databaseIdSchema } from "@/lib/database-id";
import { projectInputSchema, projectStages } from "../project-domain";
import { deleteClientProject, getClientProject, listClientProjects, saveClientProject } from "./project-storage";
import { ProjectRequestError } from "./errors";

type Context = { params: Promise<{ id: string }> };

function errorResponse(error: unknown) {
  return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "Project request failed." }, {
    status: error instanceof z.ZodError || error instanceof SyntaxError ? 400 : error instanceof ProjectRequestError ? error.status : 500,
  });
}

export async function listProjectsRequest(request: Request) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try { return NextResponse.json({ projects: await listClientProjects() }); }
  catch (error) { return errorResponse(error); }
}

export async function getProjectRequest(request: Request, context: Context) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const id = databaseIdSchema.parse((await context.params).id);
    const project = await getClientProject(id);
    return project ? NextResponse.json({ project }) : NextResponse.json({ error: "Project not found." }, { status: 404 });
  } catch (error) { return errorResponse(error); }
}

export async function saveProjectRequest(request: Request, context?: Context) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const id = context ? databaseIdSchema.parse((await context.params).id) : undefined;
    const body = await request.json();
    const stageOnly = z.object({ stage: z.enum(projectStages) }).strict().safeParse(body);
    const previous = id && stageOnly.success ? await getClientProject(id) : null;
    if (id && stageOnly.success && !previous) throw new ProjectRequestError("Project not found.", 404);
    const input = projectInputSchema.parse(previous && stageOnly.success ? { ...previous, stage: stageOnly.data.stage } : body);
    const project = await saveClientProject(input, id);
    await saveAuditLog({ actor: auth.user.actor, action: "client_project_saved", entityType: "client_project", entityId: project.id, metadata: { title: project.title, stage: project.stage } });
    return NextResponse.json({ project }, { status: id ? 200 : 201 });
  } catch (error) { return errorResponse(error); }
}

export async function deleteProjectRequest(request: Request, context: Context) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;
  try {
    const id = databaseIdSchema.parse((await context.params).id);
    await deleteClientProject(id);
    await saveAuditLog({ actor: auth.user.actor, action: "client_project_deleted", entityType: "client_project", entityId: id, metadata: {} });
    return NextResponse.json({ deleted: true });
  } catch (error) { return errorResponse(error); }
}
