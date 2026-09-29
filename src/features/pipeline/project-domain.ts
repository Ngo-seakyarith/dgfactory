import { z } from "zod";
import { databaseIdSchema } from "@/lib/database-id";

import { proposalStages } from "./domain";

export const projectStages = proposalStages;
export const projectTypes = ["Training", "Intelligent System", "Other"] as const;
export type ProjectStage = (typeof projectStages)[number];

const money = z.number().finite().nonnegative().max(999999999999.99).nullable();
const text = z.string().trim().max(10000);

export const projectInputSchema = z.object({
  clientId: databaseIdSchema,
  title: z.string().trim().min(1, "Project title is required.").max(300),
  projectType: z.enum(projectTypes),
  stage: z.enum(projectStages),
  expectedOutcomes: text,
  targetValue: money,
  actualValue: money,
  paymentReceivedDate: z.iso.date().nullable().optional(),
  startPeriod: z.string().trim().max(100),
  endPeriod: z.string().trim().max(100),
  statusNote: text,
  nextOpportunities: text,
  nextAction: text,
  notes: text,
  trainingPackageId: databaseIdSchema.nullable(),
  systemProposalId: databaseIdSchema.nullable(),
}).superRefine((value, context) => {
  if (value.trainingPackageId && value.systemProposalId) {
    context.addIssue({ code: "custom", path: ["systemProposalId"], message: "Link only one proposal to a project." });
  }
  if (value.trainingPackageId && value.projectType !== "Training") {
    context.addIssue({ code: "custom", path: ["projectType"], message: "A training proposal requires a Training project." });
  }
  if (value.systemProposalId && value.projectType !== "Intelligent System") {
    context.addIssue({ code: "custom", path: ["projectType"], message: "A system proposal requires an Intelligent System project." });
  }
});

export type ClientProjectInput = z.infer<typeof projectInputSchema>;
export type ClientProject = Omit<ClientProjectInput, "clientId"> & {
  id: string;
  clientId: string | null;
  clientName: string;
  clientOwner: string;
  createdAt: string;
  updatedAt: string;
};

export function emptyClientProject(clientId = ""): ClientProjectInput {
  return {
    clientId, title: "", projectType: "Training", stage: "Prospects",
    expectedOutcomes: "", targetValue: null, actualValue: null, paymentReceivedDate: null,
    startPeriod: "", endPeriod: "", statusNote: "",
    nextOpportunities: "", nextAction: "", notes: "",
    trainingPackageId: null, systemProposalId: null,
  };
}

export function clientProjectInput(project: ClientProject): ClientProjectInput {
  return {
    clientId: project.clientId ?? "", title: project.title,
    projectType: project.projectType, stage: project.stage,
    expectedOutcomes: project.expectedOutcomes, targetValue: project.targetValue, actualValue: project.actualValue,
    paymentReceivedDate: project.paymentReceivedDate ?? null,
    startPeriod: project.startPeriod, endPeriod: project.endPeriod, statusNote: project.statusNote,
    nextOpportunities: project.nextOpportunities, nextAction: project.nextAction, notes: project.notes,
    trainingPackageId: project.trainingPackageId, systemProposalId: project.systemProposalId,
  };
}

