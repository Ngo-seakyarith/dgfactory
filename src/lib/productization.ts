export type RoiInputs = {
  proposalsPerMonth: number;
  hoursPerProposal: number;
  staffCostPerHour: number;
  expectedTimeSavedPercent: number;
  trainingsPerYear: number;
  revenuePerTraining: number;
};

export type RoiOutputs = {
  monthlyHoursSaved: number;
  annualHoursSaved: number;
  monthlyCostSaved: number;
  annualCostSaved: number;
  estimatedRevenueSupported: number;
  roiSummary: string;
};

export const defaultRoiInputs: RoiInputs = {
  proposalsPerMonth: 8,
  hoursPerProposal: 6,
  staffCostPerHour: 25,
  expectedTimeSavedPercent: 50,
  trainingsPerYear: 24,
  revenuePerTraining: 2500,
};

function safeNumber(value: unknown, defaultValue = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : defaultValue;
}

export function calculateProductRoi(input: Partial<RoiInputs>): RoiOutputs {
  const proposalsPerMonth = safeNumber(
    input.proposalsPerMonth,
    defaultRoiInputs.proposalsPerMonth,
  );
  const hoursPerProposal = safeNumber(
    input.hoursPerProposal,
    defaultRoiInputs.hoursPerProposal,
  );
  const staffCostPerHour = safeNumber(
    input.staffCostPerHour,
    defaultRoiInputs.staffCostPerHour,
  );
  const expectedTimeSavedPercent = Math.min(
    100,
    safeNumber(
      input.expectedTimeSavedPercent,
      defaultRoiInputs.expectedTimeSavedPercent,
    ),
  );
  const trainingsPerYear = safeNumber(
    input.trainingsPerYear,
    defaultRoiInputs.trainingsPerYear,
  );
  const revenuePerTraining = safeNumber(
    input.revenuePerTraining,
    defaultRoiInputs.revenuePerTraining,
  );
  const monthlyHours = proposalsPerMonth * hoursPerProposal;
  const monthlyHoursSaved = monthlyHours * (expectedTimeSavedPercent / 100);
  const annualHoursSaved = monthlyHoursSaved * 12;
  const monthlyCostSaved = monthlyHoursSaved * staffCostPerHour;
  const annualCostSaved = monthlyCostSaved * 12;
  const estimatedRevenueSupported = trainingsPerYear * revenuePerTraining;

  return {
    monthlyHoursSaved,
    annualHoursSaved,
    monthlyCostSaved,
    annualCostSaved,
    estimatedRevenueSupported,
    roiSummary: `Estimated annual impact: ${Math.round(
      annualHoursSaved,
    )} hours saved, ${formatProductMoney(
      annualCostSaved,
    )} staff cost saved, and ${formatProductMoney(
      estimatedRevenueSupported,
    )} training revenue supported.`,
  };
}

export function formatProductMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function buildProductBriefMarkdown() {
  return `# DG Capability Factory

## Tagline
An AI-powered operating system for turning organizational capability needs into training packages, proposals, delivery plans, feedback loops, and measurable improvement.

## Problem
Many organizations want practical AI and workforce capability programs, but proposal creation, curriculum design, pricing, delivery preparation, and post-training reporting are fragmented. Teams lose time rebuilding documents, chasing feedback, and manually coordinating training delivery.

## Solution
DG Capability Factory packages DG Academy's training production workflow into a client-ready system. It helps teams capture a training idea, generate business-ready learning assets, calculate pricing deterministically, manage the proposal pipeline, prepare delivery, collect feedback, and continuously improve quality.

## Key Features
- AI training package generation with syllabus, proposal, workbook, slide outline, follow-up email, and checklist.
- Deterministic pricing and commercial proposal support.
- CRM and proposal pipeline for lead-to-won opportunity tracking.
- Training Delivery OS for preparation, execution, evaluation, certificates, and reporting.
- Knowledge base for organization-specific frameworks, examples, and SOPs.
- Client portal for secure proposal and delivery review.
- Governance, approvals, audit logs, red-team checks, and eval benchmarks.

## Use Cases
- Internal learning and development teams standardizing training production.
- Consulting firms packaging client training offers faster.
- HR teams managing leadership, AI, and transformation programs.
- Training providers building proposal, delivery, and quality systems.

## Implementation Process
1. Discovery and workflow mapping.
2. Workspace setup, roles, and data model configuration.
3. Knowledge base import and prompt/template calibration.
4. Pilot with 3-5 real proposals and one delivery project.
5. Evaluation, governance review, and production rollout.

## Commercial Packages
- Starter: internal training package generator.
- Professional: CRM, delivery OS, knowledge base, exports, and quality dashboard.
- Enterprise: agentic workflows, custom knowledge base, evaluations, and governance controls.

## Call to Action
Book a DG Academy demonstration to see how DG Capability Factory can support your organization's training operations, AI capability rollout, and proposal-to-delivery workflow.`;
}
