# DG Academy AI Training Production Factory

Standalone web app for turning one training idea into a complete DG Academy commercial training package.

This app is separate from DG Command OS.

## Features

- Generate full training packages with configured OpenAI credentials
- Save and reopen packages in Supabase
- Copy each section
- Commercial Setup with deterministic pricing calculations
- Client-facing commercial proposal
- Internal profitability note hidden from client exports by default
- Export Proposal/Syllabus/Workbook DOCX, Slide Deck PPTX, Summary PDF, Pricing DOCX/PDF, and TXT
- Email handoff and Telegram handoff to `@sopheaphin`
- Client CRM with clients, opportunities, proposal pipeline, follow-up reminders, and package-to-opportunity linking
- Training Delivery OS for won opportunities, preparation checklists, evaluation capture, certificates placeholder, post-training report drafts, and report export
- GPT-5.5 Brain Layer with specialist agent routing, structured outputs, schema checks, and package QA review
- Multi-agent package workflow with Chief Brain planning, specialist section generation, automatic QA, trace summary, retry support, and section regeneration
- DG Academy Knowledge Base with frameworks, proposal language, Cambodia context, exercises, pricing notes, client notes, keyword retrieval, and internal source notes
- V2.0 Evaluation + Feedback Loop with output scoring, AI rubric evaluation, improvement suggestions, human approval, and a Quality Dashboard
- V2.2 Prompt and Template Optimization System with versioned prompts, human approval, rollback, and code-defined Brain Layer instructions
- V2.3 OpenClaw Orchestrator Integration with protected webhook endpoints, logs, and human approval gates
- V2.4 Scheduled Business Loops for pipeline, content, revenue, quality, delivery readiness, stale follow-up, and prompt reviews
- V3.0 Production Hardening with internal roles, permission gates, audit logs, launch dashboard, and error boundaries
- V3.1 Internal Pilot Launch System with 30-day pilot dashboard, goals, issues, feedback capture, pilot reports, and pilot weekly loop
- V3.2 Agent Reliability and Evaluation Benchmarks with eval datasets, runs, results, regression risks, trace summaries, and smoke checks
- V3.3 Security Red Team and Governance Audit with export safety blocking, orchestrator validation, RLS guidance, and security reports
- V3.4 Client Portal with hashed token access, published client-safe documents, feedback capture, revocation, expiry, and audit logging
- V3.5 Productization Package with `/product`, sales/implementation docs, commercial package placeholders, ROI calculator, and product brief export
- V3.6 Enterprise Agentic Hardening with GPT-5.5 default model config, Brain status, Master Agent routing, adaptive specialist agents, concrete RLS migration, Supabase Auth migration path, approval rules, and autonomy settings
- Adaptive Growth OS Foundation with market signals, offer variants, experiments, metrics, selection decisions, learning genome, and offer-to-package handoff
- Micro-Offer Mutation Factory for generating, comparing, editing, and saving multiple testable offer variants from one market signal or business idea
- Fitness Score and Selection Engine for deterministic offer ranking, scale/iterate/park/kill recommendations, and human selection decisions
- Replication Engine and Learning Genome for turning winning offers into reusable templates, sales language, delivery assets, internal knowledge, and expansion paths
- Adaptive Growth Loops with OpenClaw-ready market sensing, mutation, experiment review, selection review, replication review, genome update, and expansion strategy
- Adaptive Growth Dashboard Final with executive adaptation velocity, offer fitness, experiment funnel, learning genome, expansion map, OpenClaw loop status, improvement status, deterministic Adaptive Growth Score, Brain Layer recommendations, and PDF report export
- Business + Software Improvement Integration for converting growth, QA, security, eval, and user learnings into approved Codex-ready prompts

## Product and Architecture Docs

- [Product Roadmap](docs/product-roadmap.md)
- [Agentic Architecture](docs/agentic-architecture.md)
- [Security and Approval Model](docs/security-and-approval-model.md)
- [Supabase RLS Policies](docs/supabase-rls-policies.md)
- [Supabase RLS Verification](docs/supabase-rls-verification.md)
- [Enterprise Agentic Hardening Report](docs/enterprise-agentic-hardening-report.md)

## Future Agentic Roadmap

DG Academy AI Training Production Factory is designed to evolve into DG Academy Capability Factory:

- GPT-5.5 Brain Layer for planning, drafting, routing, and evaluation.
- Specialist agents for learning design, commercial review, governance, delivery readiness, export QA, and evaluation.
- Deterministic tools for pricing, storage, export, and leak checks.
- OpenClaw orchestration for approved multi-step workflows.
- Codex builder workflow for human-approved product and engineering increments.
- Codex builder workflow for human-approved product and engineering increments.

## Local Setup

```bash
bun install
bun run dev
```

Open `http://localhost:3000/dashboard`.

## Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
AI_BRAIN_MODEL=gpt-5.5
ORCHESTRATOR_API_KEY=
LOOP_API_KEY=
DG_REQUIRE_AUTH=false
DG_TRUST_ROLE_HEADERS=false
DG_DEV_ROLE_SESSION=true
DG_DEFAULT_ACTOR=DG Academy Operator
ADMIN_ACCESS_PIN=
```

Required production keys:

- Missing or invalid OpenAI credentials cause AI generation routes to fail explicitly.
- `AI_BRAIN_MODEL` controls the intended Brain Layer model and all OpenAI-backed generation. V3.6 defaults to `gpt-5.5`.
- Missing Supabase configuration causes persistence routes to fail explicitly.
- `ORCHESTRATOR_API_KEY` is required for every `/api/orchestrator/*` endpoint.
- `LOOP_API_KEY` or `ORCHESTRATOR_API_KEY` is required for every `/api/loops/*` endpoint.
- `DG_REQUIRE_AUTH=true` makes missing sessions default to `Viewer`; local development defaults to `Admin` when false.
- `DG_TRUST_ROLE_HEADERS=true` allows trusted infrastructure to pass `x-dg-role` and `x-dg-actor`. Keep it `false` unless a server-side gateway is enforcing identity.
- `DG_DEV_ROLE_SESSION=true` keeps local role switching available while `DG_REQUIRE_AUTH=false`. Production should use Supabase Auth and database roles.
- `ADMIN_ACCESS_PIN` is optional. If configured, selecting the `Admin` role from `/settings` requires that PIN.

## V3.0 Production Hardening

V3.0 prepares the app for real internal DG Academy operation.

Roles:

- `Admin`: full access, prompt approval, pricing visibility, internal notes, and approval decisions.
- `Trainer`: delivery projects, course materials, feedback, and post-training reports.
- `Sales`: clients, opportunities, proposals, follow-up drafts, and client-facing exports.
- `Viewer`: read-only access.

Auth model:

- Internal role session lives in secure-by-default route cookies set from `/settings`.
- Server routes can also accept `x-dg-role` and `x-dg-actor` for controlled internal automation.
- For production, set `DG_REQUIRE_AUTH=true` and configure `ADMIN_ACCESS_PIN`.
- This is an internal MVP auth layer. A later version can replace it with Supabase Auth while keeping the same role and permission model.

Protection:

- Prompt templates and prompt approvals require admin permissions.
- Internal profitability notes and internal export options require admin permissions.
- Client-facing exports exclude internal notes by default.
- Internal knowledge citations stay as internal source notes and are not included in client exports by default.
- Orchestrator and loop endpoints remain API-key protected.
- Approval decisions, exports, prompt approvals, package saves, CRM saves, orchestrator commands, and role changes write audit logs.

Launch dashboard:

- `/dashboard` shows active opportunities, pipeline value, packages created this month, upcoming deliveries, average QA score, pending approvals, follow-ups, and latest loop recommendations.

## V3.6 Enterprise Agentic Hardening

V3.6 closes the main gap between the internal adaptive MVP and a safer enterprise agentic operating system.

Brain model:

- `src/lib/brain/modelConfig.ts` centralizes model configuration.
- `AI_BRAIN_MODEL` now defaults to `gpt-5.5`.
- `/api/brain/status` reports intended model, actual model, API key status, last successful model, and runtime status.
- `/settings/ai` and `/settings` show Brain Model Status.

Master Agent:

- `src/lib/brain/agents/masterAgent.ts` classifies workflows, chooses specialist agents, chooses deterministic tools, requires QA, and flags approval needs.
- The Master Agent routes work; it does not replace specialist agents or deterministic business tools.

Adaptive Growth hardening:

- Adaptive Growth now has named agents for market sensing, mutation, experiment design, fitness interpretation, selection, replication, expansion, learning genome, and extinction recommendations.
- `src/lib/brain/workflows/adaptiveGrowthWorkflow.ts` wraps deterministic Adaptive Growth services with agent-supported recommendations.
- Fitness scoring still comes from `src/lib/adaptive-growth/fitness.ts`, not AI.

Security foundation:

- `supabase/migrations/016_enterprise_auth_rls_hardening_v3_6.sql` adds organizations, profiles, organization memberships, helper role functions, `organization_id` columns, and concrete RLS policies for core business, agentic, eval, approval, and growth tables.
- `src/lib/auth-production.ts` adds the Supabase Auth profile and membership lookup foundation.
- `src/middleware.ts` protects app routes when `DG_REQUIRE_AUTH=true`.
- `/login` and `/unauthorized` support the production auth transition.

Approval and autonomy:

- `src/lib/safety/approvalRules.ts` and `src/lib/safety/riskClassifier.ts` classify risky actions.
- External sending, publishing client portal items, internal-note exports, lifecycle changes to Scaling/Productized/Killed, prompt approval, production deployment, production migrations, deletion, and internal margin/knowledge exposure require approval.
- `/settings/autonomy` configures `manual`, `assisted`, `supervised`, and `bounded_auto` modes. Risky actions still require approval at every level.

## V3.1 Internal Pilot Launch System

V3.1 prepares DG Academy for a 30-day internal pilot where Sopheap and the team use the app for real proposals, delivery preparation, QA review, and follow-up work.

Pilot workspace:

- `/pilot` shows pilot dates, goal progress, usage metrics, top issues, recent feedback, and a copy-ready pilot report.
- Default goals track packages, proposal exports, pricing plans, delivery projects, QA reviews, feedback records, business loops, and improvement opportunities.
- Pilot issues are stored in `pilot_issues` with severity, status, related page, related package, and related opportunity fields.
- Feature feedback is stored in `pilot_feedback` from the dashboard, package detail, proposal export, pipeline, delivery project, and pilot pages.
- The `pilot_weekly_review` loop summarizes pilot usage, blockers, quality issues, next actions, and recommended Codex tasks.
- Pilot reports can be copied or exported as simple DOCX/PDF files for internal review.

30-day pilot process:

1. Start with `DG_REQUIRE_AUTH=true`, an Admin session, and Supabase migrations applied.
2. Use real DG Academy opportunities and packages, but keep confidential client data minimized.
3. Review `/pilot` weekly with the team and run `pilot_weekly_review` from `/loops`.
4. Log confusing screens, export problems, pricing concerns, and missing workflow steps as pilot issues.
5. Collect feedback after each real package, proposal export, pipeline review, and delivery project.
6. Generate the pilot report at the end of the 30 days and use it to decide the next roadmap.

Pilot success criteria:

- At least 5 real training packages created.
- At least 3 client-ready proposals exported.
- At least 5 QA reviews completed with average QA score improving over time.
- At least 5 feedback records and 10 improvement opportunities captured.
- No internal profitability notes or internal knowledge leaked into client-facing exports.
- The team can identify clear V3.2 build priorities from observed usage.

## V3.2 Agent Reliability and Evaluation Benchmarks

V3.2 makes Brain Layer output quality measurable before prompt, template, or release changes.

Eval workspace:

- `/evals` lists benchmark datasets, latest scores, score deltas, eval history, failed examples, and regression risks.
- `POST /api/evals/run` runs a dataset against the target Brain Layer agent.
- `GET/POST /api/evals` lists seeded datasets and allows creating a custom starter dataset.
- Seed datasets cover course package generation, proposal generation, pricing narrative, slide outline, workbook generation, QA review, follow-up email, and delivery report.
- Each seeded dataset includes SME workshop, corporate in-house training, and executive masterclass examples.

Data model:

- `eval_datasets`: benchmark dataset metadata and target agent.
- `eval_examples`: JSON inputs, expected summary, rubric, and tags.
- `eval_runs`: model name, status, average score, timing, and summary.
- `eval_results`: example score, pass/fail, strengths, weaknesses, regression risk, and output summary.
- `agent_traces`: sanitized input/output summaries, agent name, task type, status, and duration.

Smoke check:

```bash
bun run eval:smoke
```

Set `EVAL_BASE_URL=http://localhost:3000` to run the smoke check through the app API.

Codex release rule:

- When changing Brain Layer prompts, prompt templates, agent routing, or eval logic, run `bun run eval:smoke`.
- Do not approve prompt/template changes for release if smoke evals fail.

## V3.3 Security Red Team and Governance Audit

V3.3 adds internal security checks for wider deployment readiness.

Security workspace:

- `/security` shows authentication, role permissions, Supabase RLS, export safety, margin protection, prompt injection, orchestrator, approval, audit logging, environment, secret, file export, and knowledge visibility checks.
- `POST /api/security/run-red-team` runs deterministic red-team scenarios and records audit results.
- `GET /api/security` loads the latest security audit and report.
- Security reports include executive summary, passed checks, failed checks, critical risks, recommended fixes, and go/no-go recommendation.

Validators:

- Export safety validator scans client-facing exports for internal margin, direct cost, internal notes, and internal knowledge markers.
- Orchestrator safety validator checks authentication, command type, risk level, external-action language, and approval requirements.

Red-team scenarios cover:

- Internal margin exposure.
- Internal notes in client proposals.
- Malicious knowledge prompt injection.
- Unauthenticated orchestrator commands.
- Sales prompt approval attempt.
- Trainer internal margin access attempt.
- Internal-only knowledge in client-safe export.
- Confidential notes in follow-up email.
- OpenClaw external sending without approval.

RLS documentation:

- `docs/supabase-rls-policies.md` lists required policy direction, table groups, role access rules, internal/client-safe data rules, and migration checklist.

## V3.4 Client Portal

V3.4 adds a secure client-facing portal for proposal and delivery review.

Client routes:

- `/client-portal/login`
- `/client-portal/[token]`
- `/client-portal/[token]/proposal/[id]`
- `/client-portal/[token]/delivery/[id]`
- `/client-portal/[token]/feedback/[id]`

Internal management:

- Open a client detail page and use the `Client Portal` panel.
- Create a secure access link for the client contact.
- Set an optional expiry date.
- Publish proposal, syllabus, training plan, delivery report, or feedback form items.
- Revoke portal access when the link should no longer work.
- Copy the suggested email text. The app does not send email automatically.

Security behavior:

- Portal tokens are generated with strong random bytes and stored only as SHA-256 hashes.
- Portal pages show only `Published` and `Client Visible` items.
- The internal app navigation is hidden on client portal routes.
- Client-safe rendering strips internal notes, direct cost, estimated profit, margin language, QA scores, private knowledge markers, and prompt/template references.
- Client decisions can update a linked proposal opportunity status, but `Approved` moves to `Negotiation`; it never automatically marks an opportunity as `Won`.
- Portal opens, access creation/revocation, publishing, and feedback submission are written to audit logs.

Supabase tables:

- `client_portal_access`
- `client_portal_items`
- `client_feedback`

Run migration `supabase/migrations/013_client_portal_v3_4.sql` or apply the matching SQL in `supabase/schema.sql`.

## V3.5 Productization Package

V3.5 packages DG Capability Factory as a DG Academy offer that can be demonstrated, sold, and implemented for client organizations.

Product routes:

- `/product` presents the offer, problem, solution, features, use cases, implementation process, commercial package placeholders, and product brief export.
- `/roi-calculator` estimates proposal production time saved, staff cost saved, revenue supported, and a copyable ROI summary.
- `POST /api/product-brief/export` exports the DG Capability Factory product brief as DOCX, PDF, or TXT.

Productization docs:

- [Demo Script](docs/demo-script.md)
- [Client Implementation Package](docs/client-implementation-package.md)
- [Commercial Packages](docs/commercial-packages.md)

Commercial packaging:

- Starter: internal training package generator.
- Professional: CRM, delivery, knowledge base, exports, quality, and client portal.
- Enterprise: agentic workflows, OpenClaw orchestration, evals, security governance, and custom knowledge base.
- Pricing remains placeholder-only until DG Academy confirms the commercial model.

## Adaptive Growth OS Foundation

Adaptive Growth OS extends DG Academy AI Training Production Factory into a system for business adaptation.

Strategic formula:

`Growth = Variation x Feedback x Selection x Replication x Expansion`

Business meaning:

- Variation: generate and manage many training/product offer variants.
- Feedback: collect evidence from clients, sales calls, LinkedIn, training feedback, and market signals.
- Selection: score experiments and choose what to scale, iterate, park, kill, bundle, partner, or productize.
- Replication: convert winners into reusable learning genome items.
- Expansion: adapt winning patterns into new sectors, formats, audiences, and markets.

Routes:

- `/adaptive-growth`
- `/adaptive-growth/dashboard`
- `/adaptive-growth/signals`
- `/adaptive-growth/offers`
- `/adaptive-growth/experiments`
- `/adaptive-growth/selection`
- `/adaptive-growth/genome`

Data tables:

- `market_signals`
- `offer_variants`
- `growth_experiments`
- `experiment_metrics`
- `selection_decisions`
- `learning_genome_items`

Workflow:

1. Capture a signal.
2. Convert signal into an offer variant.
3. Create an experiment for the offer.
4. Record metrics and feedback.
5. Save a selection decision with a fitness score.
6. Store reusable learning as a genome item.
7. Create a training package from a winning offer variant.

Run migration `supabase/migrations/014_adaptive_growth_os_foundation.sql` or apply the matching SQL in `supabase/schema.sql`.

## Adaptive Growth Dashboard Final

The executive dashboard at `/adaptive-growth/dashboard` answers one question:
is DG Academy adapting fast enough?

Dashboard sections:

- Adaptation Velocity: new signals, offer variants, experiments launched/completed, selection decisions, and genome items.
- Offer Fitness: top offers, bottom offers, scale candidates, kill candidates, and offers with incomplete evidence.
- Experiment Funnel: signals to offers to experiments to proposals to deals won to replicated templates.
- Learning Genome: winning patterns, failed patterns, reusable genome items, and prompt improvement suggestions.
- Expansion Map: strongest sectors, audiences, formats, and recommended next niches.
- OpenClaw Loop Status: latest adaptive loops and pending approvals.
- Improvement Status: approved improvement tasks and implemented improvements.

Adaptive Growth Score:

```text
score =
signal freshness * 0.15 +
variant generation * 0.15 +
experiment activity * 0.20 +
selection discipline * 0.20 +
replication rate * 0.15 +
learning capture * 0.15
```

Interpretation:

- `80-100`: Highly adaptive
- `60-79`: Adaptive but inconsistent
- `40-59`: Sensing without enough selection
- `0-39`: Slow adaptation

AI recommendations:

- `POST /api/adaptive-growth/dashboard/recommendations` uses the Brain Layer to suggest what to test, kill, scale, replicate, learn, and improve in Codex.
- The deterministic dashboard data is passed as evidence. AI must label uncertainty and must not invent metrics, revenue, margins, client outcomes, approvals, or experiment results.

Export:

- `GET /api/adaptive-growth/dashboard/export?format=pdf` exports a simple Adaptive Growth Report PDF.
- `GET /api/adaptive-growth/dashboard/export?format=txt` exports the same report as text.

## Micro-Offer Mutation Factory

The Micro-Offer Mutation Factory adds fast variation generation to Adaptive Growth OS.

Routes and API:

- Use `/adaptive-growth/offers` and click `Generate Offer Variants`.
- From `/adaptive-growth/signals`, use `Generate Variants from Signal` on a market signal.
- `POST /api/adaptive-growth/generate-offer-variants` generates review-ready offer variants.

Mutation strategies:

- Audience mutation
- Sector mutation
- Format mutation
- Pricing mutation
- Pain-point mutation
- Duration mutation
- Delivery-channel mutation
- Outcome-promise mutation
- Random creative mutation

Output:

- title
- target audience
- sector
- format and duration
- promise
- pain point
- why now
- test method
- suggested price range
- expected buying trigger
- risk
- confidence score

Workflow:

1. Start from a market signal or base training/product idea.
2. Choose the mutation strategy and number of variants.
3. Review the comparison table.
4. Edit variants directly in the table.
5. Save selected variants into Adaptive Growth OS.
6. Discard weak variants.
7. Convert promising variants into experiments or training packages.

The mutation agent uses DG Academy knowledge retrieval when available. Missing or invalid OpenAI keys now stop generation with a configuration error. Generated variants are hypotheses only; human selection, experiments, and feedback decide what moves to testing, scaling, or the learning genome.

## Fitness Score and Selection Engine

The Selection Engine evaluates offer variants and experiments like an adaptive system: weak variants are parked or killed, strong variants move toward scaling or productization.

Core utility:

- `src/lib/adaptive-growth/fitness.ts`
- `POST /api/adaptive-growth/evaluate-fitness`
- UI surfaces on `/adaptive-growth/offers` and `/adaptive-growth/selection`

Default weighted formula:

```text
fitnessScore =
marketPullScore * 0.25 +
conversionScore * 0.20 +
revenuePotentialScore * 0.15 +
marginPotentialScore * 0.15 +
deliveryQualityScore * 0.10 +
strategicFitScore * 0.10 +
reusabilityScore * 0.05
```

Component scores are 0-100:

- Market pull: inquiries, meetings, client interest, and signal urgency.
- Conversion: proposals sent and deals won.
- Revenue potential: actual revenue or offer price assumption.
- Margin potential: estimated margin.
- Delivery quality: QA, trainer, learner, or manual delivery score.
- Strategic fit: DG Academy direction and market focus.
- Reusability: ability to reuse across clients, sectors, or formats.

Recommendation bands:

- `80-100`: Scale
- `65-79`: Productize or Iterate
- `50-64`: Iterate
- `35-49`: Park
- `0-34`: Kill

Missing data behavior:

- Missing components are shown as incomplete instead of silently treated as precise.
- The UI shows evidence completeness and missing-data warnings.
- Humans can override component scores or final selection decisions.
- AI may write selection rationale from available deterministic metrics only; it must not invent revenue, margins, conversions, or market evidence.

## Replication Engine and Learning Genome

The Replication Engine turns selected offers into reusable DG Academy business DNA.

Core workflow:

- `src/lib/adaptive-growth/replicateWinningOffer.ts`
- `POST /api/adaptive-growth/replicate-offer`
- UI: `/adaptive-growth/genome`

Inputs:

- offer variant id
- selection decision id
- optional package id
- experiment and metrics from Adaptive Growth OS
- feedback or failure notes
- include/exclude package, sales, and delivery assets

Outputs:

- replication summary
- reusable training template
- proposal template
- pricing note
- sales message
- delivery checklist
- learning genome items
- recommended expansion paths

Learning Genome behavior:

- Winning offers can create `Winning Pattern`, `Proposal Language`, `Sales Message`, and `Training Activity` items.
- Parked or killed offers create `Failed Pattern` items so weak variants are searchable before similar offers are repeated.
- Active genome items can become internal package templates, proposal snippets, sales snippets, or prompt template suggestions.
- Replicated templates and genome items are mirrored into the Knowledge Base as `Internal` by default.
- Marking replicated knowledge as `Client-safe` requires human review.

Expansion recommendations may include:

- new sector
- new audience
- new format
- higher-ticket version
- shorter version
- online version
- partner version
- corporate package version

## Adaptive Growth Loops

Adaptive Growth loops extend `/loops` with safe operating rhythms for the growth system.

Loop types:

- `weekly_market_sensing`
- `weekly_offer_mutation`
- `weekly_experiment_review`
- `weekly_selection_review`
- `weekly_replication_review`
- `monthly_learning_genome_update`
- `quarterly_expansion_strategy`

Behavior:

- Loops can be run manually from `/loops`.
- OpenClaw can trigger them through `POST /api/loops/run` using `ORCHESTRATOR_API_KEY` or `LOOP_API_KEY`.
- Loop history is stored in `loop_runs`.
- Loops generate recommendations, draft tasks, and approval requests only.
- Loops never send messages, delete records, deploy code, export client data, or expose internal knowledge.

Approval model:

- Recommendations that would change an offer to `Killed`, `Scaling`, `Productized`, or `Client Visible` create pending approval requests.
- The app does not apply those status or visibility changes automatically.
- Human review is required before any risky recommendation becomes an action.

## RALPH Business + Software Self-Improvement

The improvement system connects two loops:

Business adaptation loop:

`market signals -> offer variants -> experiments -> selection -> replication -> learning genome`

Software improvement loop:

`user feedback -> improvement opportunity -> approved Codex prompt -> implementation -> verification`

Routes:

- `/improvements`: create, generate, approve/reject, edit, and export improvement opportunities.
- `POST /api/improvements/generate`: uses `improvementOpportunityAgent` through the Brain Layer.
- `/api/orchestrator/improvements`: lets OpenClaw summarize top improvement tasks.

Safety:

- Production UI never runs Codex directly.
- OpenClaw cannot approve, merge, deploy, or execute improvements.
- Approved improvements can be copied as Codex prompts, but implementation and release still require human review.

## V1.6 GPT-5.4 Brain Layer

V1.6 refactors AI generation into `src/lib/brain`.

Brain Layer folders:

- `src/lib/brain/client.ts` - OpenAI client wrapper, model config, retries, and schema validation
- `src/lib/brain/router.ts` - routes task types to specialist agents
- `src/lib/brain/agents` - chief brain, course architect, proposal, pricing narrative, slide, workbook, QA, sales follow-up, delivery, and improvement agents
- `src/lib/brain/tools` - deterministic helper tools, currently pricing facts
- `src/lib/brain/prompts` - shared Brain Layer prompt principles
- `src/lib/brain/schemas` - lightweight JSON schema definitions and validation
- `src/lib/brain/evals` - QA review evaluation helpers

Brain task types:

- `course_package`
- `proposal`
- `pricing_narrative`
- `slide_outline`
- `workbook`
- `follow_up`
- `delivery_report`
- `qa_review`
- `improvement_suggestion`
- `offer_mutation`
- `offer_replication`
- `improvement_opportunity`

QA Review:

- Package detail output tabs include a `QA Review` tab.
- `Run QA Review` calls `POST /api/qa-review`.
- The QA agent returns score, strengths, weaknesses, missing sections, risks, recommended improvements, and client readiness.
- Missing API keys stop QA review with a configuration error.

## V1.7 Multi-Agent Package Workflow

V1.7 turns package generation into a structured workflow instead of one large generation call.

Workflow sequence:

1. Chief Brain creates the package plan.
2. Course Architect creates the syllabus.
3. Proposal Agent creates the client proposal.
4. Slide Agent creates the deck outline.
5. Workbook Agent creates the participant workbook.
6. Pricing Narrative Agent creates commercial proposal text from deterministic pricing outputs.
7. QA Agent reviews the final package.
8. Improvement Agent produces final recommendations.

Files:

- `src/lib/brain/workflows/packageWorkflow.ts`
- `POST /api/workflows/generate-package`
- `POST /api/workflows/regenerate-section`

UI behavior:

- New Package page includes `Use multi-agent generation`, default on.
- The generation panel shows workflow steps: Planning, Syllabus, Proposal, Slides, Workbook, Commercial, QA, and Final Review.
- If a workflow step fails, the UI shows the failed step and a retry button.
- Package output tabs include `Regenerate this section` for syllabus, proposal, deck outline, workbook, commercial proposal, and follow-up email.
- One-shot generation remains available by turning off the multi-agent toggle.

State:

- Workflow state is kept in memory for V1.7.
- The workflow records `workflowId`, status, current step, timestamps, errors, agent trace summaries, final output, and QA score.
- Supabase workflow persistence is a future improvement.

## V1.8 DG Academy Knowledge Base

V1.8 adds a local-first knowledge base so generation can use DG Academy-specific context.

Pages:

- `/knowledge` - search and browse the knowledge library
- `/knowledge/new` - add a knowledge document
- `/knowledge/[id]` - view, edit, or delete a knowledge document

Knowledge document types:

- Framework
- Proposal
- Case Study
- Exercise
- Pricing Note
- Sector Insight
- Client Note
- SOP
- Prompt Template
- Other

Visibility:

- `Internal` - can guide generation and internal reasoning, but must not be surfaced in client exports by default.
- `Client-safe` - can be shown as client-safe source context where appropriate.

Retrieval:

- `src/lib/knowledge/retrieve.ts` implements keyword search across title, tags, document content, and chunks.
- Vector search is intentionally left as a V1.9 TODO so the app works without pgvector.
- Package generation retrieves relevant knowledge from title, audience, client, promise, and context.
- Generated package detail shows `Knowledge used` with document titles and relevance scores.
- Client exports do not include internal citations by default.

Seed knowledge:

- DG Academy Positioning
- AI Skills for Managers Framework
- Cambodia SME AI Adoption Notes
- Executive Training Methodology
- Prompt Structure Framework

## V2.0 Evaluation + Feedback Loop

V2.0 helps DG Academy learn from package quality, user edits, client feedback, trainer feedback, and learner evaluations.

Pages and UI:

- Package detail output tabs include `Feedback`.
- `/quality` shows the Quality Dashboard.
- Delivery projects capture trainer reflection, client feedback, learner feedback, satisfaction score, and improvement suggestions.

Evaluation flow:

- Human reviewers can score an output from 1-100 and add comments, strengths, weaknesses, and improvement suggestions.
- `POST /api/evaluate-output` evaluates an output with the Brain Layer using rubrics from `src/lib/brain/evals/rubrics.ts`.
- Low-quality patterns create prompt improvement suggestions in storage.
- `src/lib/brain/workflows/improvementWorkflow.ts` can scan low-scoring evaluations and create human-review suggestions.
- Suggestions can be approved or rejected from `/quality`.
- Prompt/template updates never happen automatically. Approval records intent for a future Codex change.

Rubrics:

- Client proposal rubric
- Syllabus rubric
- Slide outline rubric
- Workbook rubric
- Commercial proposal rubric
- Post-training report rubric

Quality Dashboard:

- Average QA score
- Lowest scoring output types
- Most common weaknesses
- Pending improvement suggestions
- Approved improvements

## V2.2 Prompt and Template Optimization

V2.2 lets DG Academy improve agent prompts and output templates from feedback
without code changes, while preserving human approval and version control.

Pages:

- `/admin/prompts` - list prompt templates, compare versions, create drafts,
  approve drafts, archive templates, and roll back to a previous version.

Data model:

- `prompt_templates` stores agent name, version, title, system prompt, user
  prompt template, output schema, status, and timestamps.
- `prompt_template_changes` stores activation and rollback audit records.

Statuses:

- `Draft` - editable candidate version, not used by the Brain Layer.
- `Active` - approved version used by the Brain Layer.
- `Archived` - previous version available for comparison or rollback.

Brain Layer behavior:

- Agents try to load the active prompt template for their `agent.name`.
- If Supabase or prompt storage is unavailable, agents fall back to code-defined
  instructions.
- User prompt templates support `{{input}}` and `{{input_json}}` placeholders.
- Output schema stays structured and validated.

Improvement suggestions:

- Approved suggestions on the Quality Dashboard can create prompt draft versions.
- Drafts must still be approved on `/admin/prompts` before activation.
- Every activation or rollback creates an audit record.

## V2.3 OpenClaw Orchestrator Integration

V2.3 lets OpenClaw trigger safe Factory workflows through authenticated API
endpoints. OpenClaw is treated as an orchestrator, not an unrestricted actor.

Authentication:

- Set `ORCHESTRATOR_API_KEY`.
- Send it as `Authorization: Bearer <key>` or `x-orchestrator-api-key`.
- If the key is missing or invalid, orchestrator endpoints return an error.

Endpoints:

- `GET /api/orchestrator/health`
- `POST /api/orchestrator/create-package`
- `POST /api/orchestrator/create-follow-up`
- `GET /api/orchestrator/pipeline-summary`
- `GET /api/orchestrator/delivery-summary`
- `GET /api/orchestrator/quality-summary`
- `POST /api/orchestrator/request-approval`
- `GET /api/orchestrator/approval-status`

Supported commands:

- `CREATE_PACKAGE`
- `GENERATE_FOLLOW_UP`
- `GET_PIPELINE_SUMMARY`
- `GET_DELIVERY_SUMMARY`
- `GET_QUALITY_SUMMARY`
- `REQUEST_EXPORT`
- `REQUEST_APPROVAL`

Approval model:

- `/approvals` lists approval requests.
- Humans can approve or reject and add notes.
- Approval records a decision; it does not execute external actions automatically.
- External sending, deletion, deployment, payment, and client data export must
  become approval requests first.

OpenClaw docs:

- `integrations/openclaw/README.md`
- `integrations/openclaw/openclaw-skill.md`

## V2.4 Scheduled Business Loops

V2.4 adds internal loops that OpenClaw, cron, or a DG Academy operator can
trigger to keep the business moving. Loops create summaries, draft text, and
recommendations only; they do not send messages, deploy code, delete data, or
modify external systems.

Loop types:

- `weekly_pipeline_review`
- `weekly_content_ideas`
- `monthly_revenue_summary`
- `quality_improvement_review`
- `delivery_readiness_check`
- `stale_opportunity_follow_up`
- `prompt_improvement_review`
- `pilot_weekly_review`

Files:

- `src/lib/loops/types.ts`
- `src/lib/loops/auth.ts`
- `src/lib/loops/storage.ts`
- `src/lib/loops/runner.ts`
- `src/components/loop-components.tsx`

Endpoints:

- `POST /api/loops/run`
- `GET /api/loops/history`
- `GET /api/loops/[id]`

Authentication:

- Set `LOOP_API_KEY` or reuse `ORCHESTRATOR_API_KEY`.
- Send the key as `Authorization: Bearer <key>`, `x-loop-api-key`, or
  `x-orchestrator-api-key`.
- The `/loops` page lets an internal operator enter the key manually for local
  testing and controlled internal use.

Safety:

- Weekly content and stale follow-up loops generate drafts only.
- No generated outreach is sent automatically.
- Exports, external sends, deployments, production migrations, payments, and
  client data actions still require human approval.

## Supabase

Run `supabase/schema.sql` or the migrations in order:

- `supabase/migrations/001_training_packages.sql`
- `supabase/migrations/002_crm_pipeline_v1_4.sql`
- `supabase/migrations/003_delivery_os_v1_5.sql`
- `supabase/migrations/004_knowledge_base_v1_8.sql`
- `supabase/migrations/005_evaluation_feedback_v2_0.sql`
- `supabase/migrations/006_prompt_templates_v2_2.sql`
- `supabase/migrations/007_openclaw_orchestrator_v2_3.sql`
- `supabase/migrations/008_scheduled_business_loops_v2_4.sql`
- `supabase/migrations/009_production_hardening_v3_0.sql`
- `supabase/migrations/010_internal_pilot_launch_v3_1.sql`
- `supabase/migrations/011_agent_reliability_evals_v3_2.sql`
- `supabase/migrations/012_security_red_team_governance_v3_3.sql`

The app stores:

- Training brief
- Generated content
- Commercial proposal
- Pricing inputs
- Pricing outputs
- Quality checklist
- CRM clients
- CRM opportunities and linked package ids
- Delivery projects
- Delivery checklist tasks
- Evaluation summaries
- Post-training report drafts
- Knowledge documents
- Knowledge chunks for keyword retrieval
- Output evaluations
- Prompt improvement suggestions and approval status
- Prompt templates and prompt template change audit records
- Approval requests
- Orchestrator logs
- Loop run history and recommendations
- Audit logs
- Pilot goals
- Pilot issues
- Pilot feedback records
- Eval datasets, examples, runs, and results
- Agent trace summaries
- Security audits and audit items

## V1.5 Training Delivery OS

V1.5 adds a simple delivery workspace for managing won training work from preparation through post-training reporting.

Pages:

- `/delivery` - delivery project list and search
- `/delivery/new` - create a delivery project
- `/delivery/[id]` - delivery detail, checklist, evaluation, AI drafts, and report export

Delivery statuses:

- Planning
- Materials Preparation
- Confirmed
- Delivered
- Report Sent
- Completed
- Cancelled

Delivery workflow:

- Create a delivery project manually or from a won opportunity.
- Link the client, opportunity, and generated training package.
- Use the default checklist for confirmation, materials, logistics, trainer preparation, attendance, evaluation, certificates, reporting, and follow-up.
- Capture trainer notes and evaluation data.
- Generate draft trainer checklist, participant email, training-day agenda, and post-training report.
- Export the post-training report as DOCX or PDF.

Safety:

- AI support creates drafts only.
- The app never sends email, Telegram, WhatsApp, certificates, or reports automatically.
- Post-training reports should be reviewed internally before client sharing.

## V1.4 CRM + Proposal Pipeline

V1.4 adds a simple local-first CRM and proposal pipeline for DG Academy training opportunities.

Pages:

- `/clients` - client list and search
- `/clients/new` - create a client
- `/clients/[id]` - client detail, edit form, and related opportunities
- `/opportunities` - opportunity list and search
- `/opportunities/new` - create an opportunity
- `/opportunities/[id]` - opportunity detail, edit form, and follow-up draft generator
- `/pipeline` - board grouped by status with pipeline metrics and upcoming follow-ups

Opportunity statuses:

- Lead
- Discovery
- Proposal Draft
- Proposal Sent
- Negotiation
- Won
- Lost
- Dormant

Pipeline metrics:

- Total opportunities
- Total estimated value
- Weighted pipeline value
- Proposals sent
- Won opportunities
- Lost opportunities
- Upcoming follow-ups

Package linking:

- Package detail pages include `Link to Opportunity`.
- Package detail pages include `Create Opportunity from Package`.
- Opportunity records can store a linked training package id.

AI follow-up support:

- Opportunity detail pages include `Generate Follow-Up Message`.
- The app generates draft email text, a Telegram/WhatsApp-style short message, and a suggested next step.
- No email or message is sent automatically.
- Missing or invalid OpenAI configuration returns an explicit generation error.

## Pricing Formula

```text
trainerCost = numberOfTrainingDays * numberOfTrainers * trainerDayRate
participantVariableCost = numberOfParticipants * (foodAndBeverageCostPerPerson + materialCostPerPerson)
totalDirectCost = trainerCost + venueCost + participantVariableCost + adminCost + marketingCost + travelCost + otherCost
targetProfit = totalDirectCost * targetProfitMarginPercent / 100
subtotalBeforeDiscount = totalDirectCost + targetProfit
discountAmount = subtotalBeforeDiscount * discountPercent / 100
subtotalAfterDiscount = subtotalBeforeDiscount - discountAmount
taxAmount = subtotalAfterDiscount * taxPercent / 100
finalPrice = subtotalAfterDiscount + taxAmount
pricePerParticipant = finalPrice / numberOfParticipants
estimatedProfit = finalPrice - taxAmount - totalDirectCost
estimatedProfitMargin = estimatedProfit / finalPrice * 100
```

If participant count is zero, price per participant is shown as `0`.

## Routes

- `/dashboard`
- `/adaptive-growth/dashboard`
- `/pilot`
- `/evals`
- `/security`
- `/packages/new`
- `/packages`
- `/packages/[id]`
- `/settings`
- `/clients`
- `/clients/new`
- `/clients/[id]`
- `/opportunities`
- `/opportunities/new`
- `/opportunities/[id]`
- `/pipeline`
- `/delivery`
- `/delivery/new`
- `/delivery/[id]`
- `/knowledge`
- `/knowledge/new`
- `/knowledge/[id]`
- `/quality`
- `/approvals`
- `/loops`
- `/admin/prompts`
- `POST /api/generate-package`
- `POST /api/export-package`
- `GET/POST /api/training-packages`
- `GET/DELETE /api/training-packages/[id]`
- `GET/POST /api/clients`
- `GET/DELETE /api/clients/[id]`
- `GET/POST /api/opportunities`
- `GET/DELETE /api/opportunities/[id]`
- `POST /api/opportunities/follow-up`
- `POST /api/qa-review`
- `POST /api/evaluate-output`
- `GET/POST /api/output-evaluations`
- `GET/POST /api/prompt-improvement-suggestions`
- `PATCH /api/prompt-improvement-suggestions/[id]`
- `GET /api/quality-dashboard`
- `GET/POST /api/prompt-templates`
- `PATCH /api/prompt-templates/[id]`
- `POST /api/prompt-templates/draft-from-suggestion`
- `GET /api/orchestrator/health`
- `POST /api/orchestrator/create-package`
- `POST /api/orchestrator/create-follow-up`
- `GET /api/orchestrator/pipeline-summary`
- `GET /api/orchestrator/delivery-summary`
- `GET /api/orchestrator/quality-summary`
- `POST /api/orchestrator/request-approval`
- `GET /api/orchestrator/approval-status`
- `POST /api/loops/run`
- `GET /api/loops/history`
- `GET /api/loops/[id]`
- `GET /api/pilot`
- `GET/POST /api/pilot/issues`
- `GET/POST /api/pilot/feedback`
- `GET /api/pilot/report`
- `POST /api/pilot/report/export`
- `GET/POST /api/evals`
- `POST /api/evals/run`
- `GET /api/security`
- `POST /api/security/run-red-team`
- `GET /api/auth/session`
- `POST /api/auth/session`
- `DELETE /api/auth/session`
- `GET /api/audit-logs`
- `GET /api/approvals`
- `GET/PATCH /api/approvals/[id]`
- `POST /api/workflows/generate-package`
- `POST /api/workflows/regenerate-section`
- `GET/POST /api/knowledge-documents`
- `GET/DELETE /api/knowledge-documents/[id]`
- `POST /api/knowledge-search`
- `GET/POST /api/delivery-projects`
- `GET/DELETE /api/delivery-projects/[id]`
- `POST /api/delivery-projects/generate`
- `POST /api/delivery-projects/export-report`
- `GET/POST /api/delivery-tasks`
- `DELETE /api/delivery-tasks/[id]`
- `GET /api/adaptive-growth/dashboard`
- `POST /api/adaptive-growth/dashboard/recommendations`
- `GET /api/adaptive-growth/dashboard/export`
- `GET /api/brain/status`
- `GET/POST /api/settings/autonomy`

## Quality Checks

```bash
npm run lint
npm run typecheck
npm run eval:smoke
npm run build
```

## Deploy To Vercel

1. Push this standalone folder as its own GitHub repo.
2. Import the repo into Vercel as a new project.
3. Add environment variables:
   - Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - AI: `OPENAI_API_KEY`, `AI_BRAIN_MODEL`
   - Automation: `ORCHESTRATOR_API_KEY`, `LOOP_API_KEY`
   - Internal auth: `DG_REQUIRE_AUTH=true`, `DG_TRUST_ROLE_HEADERS=false`, `DG_DEV_ROLE_SESSION=false`, `DG_DEFAULT_ACTOR`, `ADMIN_ACCESS_PIN`
   - Public URL: `NEXT_PUBLIC_APP_URL` for generated portal links when request origin is unavailable
4. Apply Supabase migrations in order, ending with `016_enterprise_auth_rls_hardening_v3_6.sql`.
5. Deploy.
6. Open `/settings`, verify Brain Model Status and autonomy settings, then verify `/dashboard`, `/pilot`, `/evals`, `/security`, `/packages/new`, `/clients`, `/pipeline`, `/delivery`, `/quality`, `/approvals`, `/loops`, and `/admin/prompts`.

## Security Checklist

- Set `DG_REQUIRE_AUTH=true` in production.
- Keep `DG_TRUST_ROLE_HEADERS=false` unless a trusted identity gateway is installed.
- Keep `DG_DEV_ROLE_SESSION=false` in production once Supabase Auth is active.
- Set a strong `ADMIN_ACCESS_PIN`.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `ORCHESTRATOR_API_KEY`, and `LOOP_API_KEY` server-only.
- Confirm prompt template routes are admin-only.
- Confirm client exports do not include internal notes unless Admin explicitly selects them.
- Review `/approvals` before any external sending, export handoff, deployment, deletion, payment, or production migration.
- Review `/api/audit-logs` as Admin after launch testing.
- Run `/security` red-team checks before wider team rollout or client-facing export changes.

## Troubleshooting

- If generation fails, check `OPENAI_API_KEY`, `AI_BRAIN_MODEL`, and the route error message.
- If Supabase is missing, persistence routes fail until Supabase credentials are configured.
- If `/api/loops/*` returns 401, check `LOOP_API_KEY` or `ORCHESTRATOR_API_KEY`.
- If `/admin/prompts` returns 403, set an Admin role in `/settings`.
- If `next build` fails with a stale `.next` cache error, remove this app's `.next` folder and rebuild.

## Known Limitations

- DOCX/PPTX/PDF exporters are dependency-free and clean, but simple.
- Supabase is optional and must be configured separately for persistent database storage.
- Email and Telegram handoff open customer channels but do not attach generated files automatically yet.
- Certificate automation is a placeholder in V1.5.
- Delivery AI drafts use provided project and evaluation data, but still require human review before client delivery.
- Workflow state is in memory in V1.7 and resets when the server restarts.
- Knowledge vector embeddings are not enabled yet; V1.8 uses keyword retrieval and stores embedding as JSON/TODO-safe placeholder.
- V2.0 improvement suggestions are advisory records. A human must approve and Codex must implement prompt/template changes separately.
- V2.2 prompt template activation changes model behavior at runtime, but only after a human approves a draft. Production teams should review active prompts before client-critical generation.
- V2.3 approval records do not execute external actions; they are a control surface for human review before a separate approved operation.
- V2.4 loops are recommendation engines, not automations with external side effects. Cron/OpenClaw can trigger them, but sending and client data export still require approval.
- V3.0 auth is an internal MVP role layer, not a full identity provider. Use it with private Vercel access or replace with Supabase Auth before broad external access.
- V3.1 pilot report DOCX/PDF exports are internal and simple; review them before sharing outside DG Academy.
- V3.2 eval scoring is lightweight and deterministic-first. Treat it as regression signal, not a substitute for Sopheap or trainer review.
- V3.3 red-team checks are deterministic internal guardrails. They help find obvious risks but do not replace a full external security review.
- V3.4 client portal token links are suitable for the internal MVP, but broad external rollout should add full Supabase Auth/RLS policies, rate limiting, and production monitoring.
- V3.5 commercial package pricing is placeholder-only. Final client pricing must be reviewed and approved by DG Academy.
