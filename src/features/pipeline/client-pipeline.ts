import type { Client } from "@/features/crm/domain";
import type { ClientProject, ProjectStage } from "./project-domain";

export type ClientPipelineGroup = {
  id: string;
  client: Client | null;
  projects: ClientProject[];
};

export type ClientPipelineFilters = { search: string; owner: string; stage: ProjectStage | "All" };

export function groupClientPipeline(clients: readonly Client[], projects: readonly ClientProject[]): ClientPipelineGroup[] {
  const groups = new Map(clients.map((client) => [client.id, { id: client.id, client, projects: [] as ClientProject[] }]));
  const unassigned: ClientPipelineGroup = { id: "unassigned", client: null, projects: [] };
  for (const project of projects) {
    const group = project.clientId ? groups.get(project.clientId) : undefined;
    (group ?? unassigned).projects.push(project);
  }
  const result: ClientPipelineGroup[] = [...groups.values()];
  if (unassigned.projects.length) result.push(unassigned);
  for (const group of result) group.projects.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  return result;
}

export function filterClientPipeline(group: ClientPipelineGroup, filters: ClientPipelineFilters) {
  const owner = group.client?.accountOwner.trim() || "Unassigned";
  if (filters.owner !== "All" && owner !== filters.owner) return { visible: false, projects: [] };
  const search = filters.search.trim().toLowerCase();
  const matchesClient = !search || [group.client?.name, group.client?.contactPerson, group.client?.email, group.client?.phone, owner]
    .some((value) => value?.toLowerCase().includes(search));
  const projects = group.projects.filter((project) =>
    (filters.stage === "All" || project.stage === filters.stage) &&
    (matchesClient || [project.title, project.projectType, project.tier, project.source, project.statusNote, project.nextAction, project.nextStepDate, project.nextOpportunities, project.notes].some((value) => value.toLowerCase().includes(search))),
  );
  return { visible: projects.length > 0 || (filters.stage === "All" && matchesClient), projects };
}
