import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import JSZip from "jszip";

import {
  createSolutionProposal,
  normalizeDigitalSolutionProposalContent,
} from "../src/features/digital-solution-proposals/domain/proposal";
import { exportSolutionProposalDocx } from "../src/features/digital-solution-proposals/export/docx";
import {
  brainSchemaToJsonSchema,
  digitalSolutionProposalOutputSchema,
} from "../src/lib/brain/schemas";

const providerSchema = brainSchemaToJsonSchema(
  digitalSolutionProposalOutputSchema,
);
assert.equal(providerSchema.type, "object");
const serializedProviderSchema = JSON.stringify(providerSchema);
assert.doesNotMatch(serializedProviderSchema, /"oneOf"/);
assert.match(serializedProviderSchema, /"anyOf"/);

const legacy = normalizeDigitalSolutionProposalContent({
  executiveSummary: ["A legacy proposal remains available after the document-model upgrade."],
  clientSituation: ["The client needs a simpler digital workflow."],
  projectObjectives: ["Reduce manual coordination."],
  recommendedSolution: ["Create a focused web application."],
  solutionModules: [],
  userJourneys: [],
  interfacesAndExperiences: [],
  architectureAndIntegrations: [],
  securityAndGovernance: [],
  implementationPhases: [],
  deliverables: ["Configured application"],
  clientResponsibilities: [],
  assumptions: [],
  risks: [],
  nextSteps: ["Confirm the delivery scope."],
});
assert.equal(legacy?.version, 2);
assert.ok(legacy?.sections.length);
assert.equal(
  legacy?.sections.filter((section) => section.key === "client_situation").length,
  1,
);

const proposal = createSolutionProposal({
  clientName: "Example Client",
  title: "Operations Coordination Platform",
});
proposal.proposalContent = {
  version: 2,
  sections: [
    {
      key: "executive_summary",
      title: "Executive Summary",
      blocks: [
        {
          type: "paragraph",
          text: "DG Academy proposes a practical platform that brings daily requests, ownership, and status visibility into one controlled workflow.",
        },
      ],
    },
    {
      key: "project_objectives",
      title: "Project Objectives",
      blocks: [
        {
          type: "bullet_list",
          items: [
            "Reduce manual follow-up across operational teams.",
            "Give managers a consistent view of work status and ownership.",
          ],
        },
      ],
    },
    {
      key: "client_situation",
      title: "Client Situation",
      blocks: [
        {
          type: "paragraph",
          text: "Operational requests currently move through separate messages and spreadsheets, making ownership and status difficult to track.",
        },
      ],
    },
    {
      key: "recommended_solution",
      title: "Recommended Digital Solution",
      blocks: [
        {
          type: "paragraph",
          text: "A focused web application will centralize requests, ownership, status updates, and management visibility without adding unnecessary complexity.",
        },
      ],
    },
    {
      key: "solution_scope",
      title: "Solution Scope",
      blocks: [
        {
          type: "capabilities",
          items: [
            {
              name: "Request management",
              description: "Staff create, assign, and update structured operational requests.",
              value: "Clear ownership and fewer missed follow-ups.",
            },
          ],
        },
      ],
    },
    {
      key: "implementation",
      title: "Implementation Approach",
      blocks: [
        {
          type: "implementation_phases",
          items: [
            {
              name: "Discovery and design",
              duration: "Two weeks, subject to confirmation",
              activities: ["Confirm workflows and access requirements."],
              deliverables: ["Approved solution blueprint"],
            },
          ],
        },
      ],
    },
    {
      key: "deliverables",
      title: "Project Deliverables",
      blocks: [
        {
          type: "bullet_list",
          items: [
            "Configured operations coordination application.",
            "Administrator handover and user guidance.",
          ],
        },
      ],
    },
    {
      key: "next_steps",
      title: "Recommended Next Steps",
      blocks: [
        {
          type: "numbered_list",
          items: ["Confirm scope.", "Approve the delivery schedule."],
        },
      ],
    },
  ],
};
assert.equal(
  digitalSolutionProposalOutputSchema.safeParse({
    proposalContent: proposal.proposalContent,
  }).success,
  true,
);
assert.equal(
  digitalSolutionProposalOutputSchema.safeParse({
    proposalContent: {
      ...proposal.proposalContent,
      sections: proposal.proposalContent.sections.filter(
        (section) => section.key !== "executive_summary",
      ),
    },
  }).success,
  false,
);
proposal.commercialInputs = {
  currency: "USD",
  lineItems: [
    { id: "professional-fee", description: "Professional fee", amount: 2400 },
  ],
  vatStatus: "Excluding VAT",
  hostingAndRecurringCosts: "Vercel Pro: USD 20/month\nSupabase Pro: USD 25/month",
  paymentTerms: "50% on approval and 50% on delivery",
  proposalValidity: "30 days",
};

const result = await exportSolutionProposalDocx(proposal);
const archive = await JSZip.loadAsync(result.buffer);
const documentXml = await archive.file("word/document.xml")?.async("string");
assert.ok(documentXml);
assert.doesNotMatch(documentXml, /\{\{(?:cover_heading|solution_title|client_name|proposal_body)\}\}/);
assert.match(documentXml, /<w:numPr>/);
assert.ok(archive.file("word/numbering.xml"));
for (const expected of [
  "Example Client",
  "Operations Coordination Platform",
  "Executive Summary",
  "Vercel Pro: USD 20/month",
  "Supabase Pro: USD 25/month",
  "Authorized by DG Academy",
]) {
  assert.match(documentXml, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
assert.ok(
  documentXml.indexOf("Commercial Terms") <
    documentXml.indexOf("Recommended Next Steps"),
);

const outputDirectory = join(process.cwd(), "tmp", "digital-solution-document-qa");
await mkdir(outputDirectory, { recursive: true });
const outputPath = join(outputDirectory, result.filename);
await writeFile(outputPath, result.buffer);
console.log(outputPath);
