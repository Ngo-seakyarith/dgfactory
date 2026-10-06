"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";
import { projectStages, type ClientProject, type ProjectStage } from "../project-domain";
import { useSaveClientProjectMutation } from "../project-queries";
import { stageRules } from "../domain";

export function ProjectStageSelect({ project }: { project: ClientProject }) {
  const mutation = useSaveClientProjectMutation();
  const [error, setError] = useState("");
  async function change(stage: ProjectStage) {
    if (!project.clientId) { setError("Open the details and select a client first."); return; }
    setError("");
    try { await mutation.mutateAsync({ id: project.id, input: { stage } }); }
    catch (error) { setError(error instanceof Error ? error.message : "Status could not be saved."); }
  }
  return <div className="space-y-1">
    <Select aria-label={`Status of ${project.title}`} value={project.stage} disabled={mutation.isPending} onChange={(event) => void change(event.target.value as ProjectStage)} className="h-9 text-sm">
      {projectStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
    </Select>
    <p className="text-xs text-muted-foreground">{stageRules[project.stage].probability}% · {stageRules[project.stage].group}</p>
    {error ? <p role="alert" className="max-w-72 text-xs text-destructive">{error}</p> : null}
  </div>;
}
