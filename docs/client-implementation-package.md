# DG Capability Factory Client Implementation Package

## Discovery Checklist

- Client organization name, sector, and operating context.
- Training products or capability programs to support first.
- Proposal workflow and approval owners.
- Pricing assumptions and commercial approval rules.
- Delivery preparation workflow and checklist requirements.
- Existing training templates, proposal language, SOPs, frameworks, and examples.
- Data privacy constraints and client-safe sharing rules.
- Required roles: Admin, Sales, Trainer, Viewer.
- Export formats needed in the first 30 days.
- Success metrics for the pilot.

## Setup Process

1. Create the dedicated DG Capability Factory workspace.
2. Configure environment variables, Supabase project, and Vercel deployment.
3. Apply Supabase schema and migrations.
4. Configure internal roles and access rules.
5. Load approved client-safe knowledge documents.
6. Load internal-only knowledge documents separately.
7. Configure prompt templates and fallback mock mode.
8. Test package generation, save/load, export, CRM, delivery, and client portal.
9. Run security red-team checks.
10. Launch a 30-day pilot.

## Data Needed From Client

- Brand and proposal style guide.
- Training catalog or target product list.
- Previous winning proposals.
- Common client sectors and learner profiles.
- Pricing rules and standard cost assumptions.
- Delivery checklist and logistics SOP.
- Evaluation form questions and reporting format.
- Governance policy or AI usage rules.
- List of internal versus client-safe documents.

## Training Needed

- Admin training for roles, settings, prompt templates, and approvals.
- Sales training for proposal generation, pricing, pipeline, exports, and client portal publishing.
- Trainer training for delivery projects, checklists, evaluation, and report generation.
- Governance training for knowledge visibility, internal margin protection, and approval workflows.
- Pilot review training for issue reporting and feedback capture.

## Governance Setup

- Define who can approve prompt/template changes.
- Define who can see internal pricing and margin notes.
- Define what can be published to the client portal.
- Define export review requirements.
- Define data retention rules.
- Define audit review cadence.
- Define OpenClaw/orchestrator approval boundaries.

## AI Safety Policy

- AI may draft training content, proposals, emails, reports, and recommendations.
- AI must not invent pricing numbers.
- AI must not send external messages automatically.
- AI must not approve contracts, invoices, payments, or legal commitments.
- Internal notes, margins, prompt templates, private knowledge, and QA notes must not appear in client-facing outputs.
- Human approval is required before external sending, deletion, deployment, payments, and production migrations.

## Rollout Plan

1. Week 1: setup, demo data, training, and first real package.
2. Week 2: proposal pipeline and first client export.
3. Week 3: delivery workflow and feedback capture.
4. Week 4: quality review, security audit, ROI review, and roadmap decision.

## 30-Day Adoption Plan

- Create 5 real packages.
- Export 3 client-ready proposals.
- Create 3 pricing plans.
- Create 1 delivery project.
- Run 5 QA reviews.
- Collect 5 user feedback records.
- Run 2 business loops.
- Identify 10 improvement opportunities.
- Review go/no-go for wider rollout.
