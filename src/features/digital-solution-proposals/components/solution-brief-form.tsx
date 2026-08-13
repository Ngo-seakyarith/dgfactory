"use client";

import { FileSpreadsheet, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Client, ClientProfileInput } from "@/lib/crm";

import { solutionTypes, type DigitalSolutionProposal } from "../domain/types";

type Props = {
  proposal: DigitalSolutionProposal;
  clients: Client[];
  clientProfile: ClientProfileInput;
  busy: boolean;
  canUpload: boolean;
  onProposalChange: (proposal: DigitalSolutionProposal) => void;
  onClientChange: (client: ClientProfileInput) => void;
  onSelectClient: (id: string) => void;
  onUpload: (files: FileList | null) => void;
  onRemoveFile: (fileId: string) => void;
};

export function SolutionBriefForm({
  proposal,
  clients,
  clientProfile,
  busy,
  canUpload,
  onProposalChange,
  onClientChange,
  onSelectClient,
  onUpload,
  onRemoveFile,
}: Props) {
  const updateBrief = (
    key: keyof DigitalSolutionProposal["brief"],
    value: string,
  ) => {
    onProposalChange({
      ...proposal,
      brief: { ...proposal.brief, [key]: value },
    });
  };
  const updateClient = (key: keyof ClientProfileInput, value: string) => {
    const next = { ...clientProfile, [key]: value };
    onClientChange(next);
    if (key === "name") {
      onProposalChange({ ...proposal, clientName: value });
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4 border-t border-border pt-5">
        <div>
          <h2 className="text-lg font-semibold">Client Information</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select an existing client or create one with this proposal.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Existing client">
            <Select
              value={clientProfile.id ?? "new"}
              onChange={(event) => onSelectClient(event.target.value)}
            >
              <option value="new">New client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Company name">
            <Input
              value={clientProfile.name}
              onChange={(event) => updateClient("name", event.target.value)}
              placeholder="Client organization"
            />
          </Field>
          <Field label="Sector">
            <Input
              value={clientProfile.sector ?? ""}
              onChange={(event) => updateClient("sector", event.target.value)}
              placeholder="Industry or sector"
            />
          </Field>
          <Field label="Contact person">
            <Input
              value={clientProfile.contactPerson ?? ""}
              onChange={(event) => updateClient("contactPerson", event.target.value)}
              placeholder="Primary client contact"
            />
          </Field>
          <Field label="Contact position">
            <Input
              value={clientProfile.contactPosition ?? ""}
              onChange={(event) => updateClient("contactPosition", event.target.value)}
              placeholder="Job title"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={clientProfile.email ?? ""}
              onChange={(event) => updateClient("email", event.target.value)}
              placeholder="name@company.com"
            />
          </Field>
          <Field label="Phone">
            <Input
              value={clientProfile.phone ?? ""}
              onChange={(event) => updateClient("phone", event.target.value)}
              placeholder="Client phone number"
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-5">
        <div>
          <h2 className="text-lg font-semibold">Project Definition</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Define the business need before deciding the technical solution.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Project title">
            <Input
              value={proposal.title}
              onChange={(event) =>
                onProposalChange({ ...proposal, title: event.target.value })
              }
              placeholder="Customer service web portal"
            />
          </Field>
          <Field label="Solution type">
            <Select
              value={proposal.solutionType}
              onChange={(event) =>
                onProposalChange({
                  ...proposal,
                  solutionType: event.target.value as DigitalSolutionProposal["solutionType"],
                })
              }
            >
              {solutionTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Business background">
          <Textarea
            value={proposal.brief.businessBackground}
            onChange={(event) => updateBrief("businessBackground", event.target.value)}
            placeholder="What the organization does and why this project matters now"
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Current problem">
            <Textarea
              value={proposal.brief.currentProblem}
              onChange={(event) => updateBrief("currentProblem", event.target.value)}
              placeholder="The business problem the solution must address"
            />
          </Field>
          <Field label="Current process">
            <Textarea
              value={proposal.brief.currentProcess}
              onChange={(event) => updateBrief("currentProcess", event.target.value)}
              placeholder="How people complete this work today"
            />
          </Field>
          <Field label="Project goal">
            <Textarea
              value={proposal.brief.projectGoal}
              onChange={(event) => updateBrief("projectGoal", event.target.value)}
              placeholder="What the proposed solution should achieve"
            />
          </Field>
          <Field label="Desired outcomes">
            <Textarea
              value={proposal.brief.desiredOutcomes}
              onChange={(event) => updateBrief("desiredOutcomes", event.target.value)}
              placeholder="Concrete business or user improvements"
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-5">
        <div>
          <h2 className="text-lg font-semibold">Users And Workflows</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Describe who uses the solution and the work it must support.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Target users">
            <Textarea
              value={proposal.brief.targetUsers}
              onChange={(event) => updateBrief("targetUsers", event.target.value)}
              placeholder="Customers, staff, managers, administrators"
            />
          </Field>
          <Field label="User roles and access">
            <Textarea
              value={proposal.brief.userRoles}
              onChange={(event) => updateBrief("userRoles", event.target.value)}
              placeholder="What each type of user can view or do"
            />
          </Field>
          <Field label="Required features">
            <Textarea
              value={proposal.brief.requiredFeatures}
              onChange={(event) => updateBrief("requiredFeatures", event.target.value)}
              placeholder="One feature or capability per line"
            />
          </Field>
          <Field label="Key workflows">
            <Textarea
              value={proposal.brief.keyWorkflows}
              onChange={(event) => updateBrief("keyWorkflows", event.target.value)}
              placeholder="Important end-to-end user tasks"
            />
          </Field>
          <Field label="Administration needs">
            <Textarea
              value={proposal.brief.adminRequirements}
              onChange={(event) => updateBrief("adminRequirements", event.target.value)}
              placeholder="Content, users, reports, approvals, configuration"
            />
          </Field>
          <Field label="Success measures">
            <Textarea
              value={proposal.brief.successMeasures}
              onChange={(event) => updateBrief("successMeasures", event.target.value)}
              placeholder="How the client will know the project is useful"
            />
          </Field>
        </div>
      </section>

      <details className="border-t border-border pt-5">
        <summary className="cursor-pointer font-semibold">Delivery And Technical Details</summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Content requirements">
            <Textarea value={proposal.brief.contentRequirements} onChange={(event) => updateBrief("contentRequirements", event.target.value)} placeholder="Pages, content types, documents, or catalog data" />
          </Field>
          <Field label="Existing assets">
            <Textarea value={proposal.brief.existingAssets} onChange={(event) => updateBrief("existingAssets", event.target.value)} placeholder="Brand assets, domains, systems, content, or data already available" />
          </Field>
          <Field label="Design direction">
            <Textarea value={proposal.brief.designDirection} onChange={(event) => updateBrief("designDirection", event.target.value)} placeholder="Brand, visual style, accessibility, or reference products" />
          </Field>
          <Field label="Languages">
            <Textarea value={proposal.brief.languages} onChange={(event) => updateBrief("languages", event.target.value)} placeholder="English, Khmer, or other language requirements" />
          </Field>
          <Field label="Devices and accessibility">
            <Textarea value={proposal.brief.deviceRequirements} onChange={(event) => updateBrief("deviceRequirements", event.target.value)} placeholder="Mobile, desktop, tablet, browser, or accessibility needs" />
          </Field>
          <Field label="Integrations">
            <Textarea value={proposal.brief.integrations} onChange={(event) => updateBrief("integrations", event.target.value)} placeholder="Payments, CRM, email, APIs, identity, or other systems" />
          </Field>
          <Field label="Security and compliance">
            <Textarea value={proposal.brief.securityRequirements} onChange={(event) => updateBrief("securityRequirements", event.target.value)} placeholder="Sensitive data, access control, audit, retention, or policy needs" />
          </Field>
          <Field label="Domain and hosting">
            <Textarea value={proposal.brief.domainAndHosting} onChange={(event) => updateBrief("domainAndHosting", event.target.value)} placeholder="Existing domain, preferred hosting, ownership, and environment" />
          </Field>
          <Field label="Timeline">
            <Textarea value={proposal.brief.timeline} onChange={(event) => updateBrief("timeline", event.target.value)} placeholder="Target launch date, phases, or deadline" />
          </Field>
          <Field label="Budget constraints">
            <Textarea value={proposal.brief.budgetConstraints} onChange={(event) => updateBrief("budgetConstraints", event.target.value)} placeholder="Budget range or commercial constraints, if known" />
          </Field>
          <Field label="Training and maintenance">
            <Textarea value={proposal.brief.trainingAndMaintenance} onChange={(event) => updateBrief("trainingAndMaintenance", event.target.value)} placeholder="Handover, staff training, support, and maintenance expectations" />
          </Field>
          <Field label="Other constraints">
            <Textarea value={proposal.brief.constraints} onChange={(event) => updateBrief("constraints", event.target.value)} placeholder="Technical, operational, legal, or delivery constraints" />
          </Field>
        </div>
      </details>

      <section className="space-y-4 border-t border-border pt-5">
        <div>
          <h2 className="text-lg font-semibold">Supporting Data <span className="font-normal text-muted-foreground">(Optional)</span></h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add Excel or CSV evidence only when it helps define data, reporting, or workflow requirements.
          </p>
        </div>
        <label className="flex min-h-24 cursor-pointer items-center justify-center gap-3 rounded-md border border-dashed border-border bg-muted/30 px-4 text-sm transition hover:border-primary/40">
          <Upload className="h-5 w-5 text-primary" />
          <span>{canUpload ? "Choose up to five .xlsx or .csv files" : "Enter the client and project title before uploading files"}</span>
          <input
            className="sr-only"
            type="file"
            accept=".xlsx,.csv"
            multiple
            disabled={!canUpload || busy}
            onChange={(event) => onUpload(event.target.files)}
          />
        </label>
        {proposal.files.length ? (
          <div className="divide-y divide-border rounded-md border border-border">
            {proposal.files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 p-3">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{file.originalName}</div>
                  <div className="text-xs text-muted-foreground">{file.status}{file.errorMessage ? `: ${file.errorMessage}` : ""}</div>
                </div>
                <Button variant="ghost" size="icon" title="Remove file" onClick={() => onRemoveFile(file.id)} disabled={busy}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
