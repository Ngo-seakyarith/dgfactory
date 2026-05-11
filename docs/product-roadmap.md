# DG Academy Capability Factory Product Roadmap

## Product Vision

DG Academy Capability Factory turns one business capability idea into a client-ready learning, commercial, and delivery package. It starts as a training package generator and evolves into an agentic capability production system that can design programs, price offers, prepare exports, evaluate quality, and create safe build tasks for future automation.

The long-term product is not only a content generator. It is a controlled production factory for DG Academy offers, where AI assists with training design, proposal writing, commercial packaging, delivery readiness, follow-up, and continuous improvement while deterministic code owns pricing, export, storage, and approval rules.

Adaptive Growth OS expands the factory into a market adaptation system:

`Growth = Variation x Feedback x Selection x Replication x Expansion`

DG Academy can capture market signals, generate offer variants, test them, select winners, encode reusable learning into a genome, and expand winning patterns into new sectors, formats, and markets.

## Target Users

- DG Academy founder/operator preparing client proposals and training offers.
- Training product managers packaging repeatable AI capability programs.
- Corporate sales and partnership teams preparing client-ready commercial offers.
- Facilitators and trainers preparing syllabi, workbooks, slide outlines, and follow-up notes.
- Future internal agents that evaluate, refine, and prepare work for human approval.

## Final Workflow

1. User enters a capability or training idea, target learners, client/market, promise, context, tone, and commercial assumptions.
2. GPT-5.5 Brain Layer generates structured training and proposal outputs while using deterministic tools for pricing and export-safe facts.
3. Specialist agents review learning design, commercial readiness, governance risk, delivery readiness, and quality.
4. The app calculates pricing, profit, discounts, tax, and client-facing commercial language from deterministic business logic.
5. User reviews tabs, copies sections, saves the package, exports client-ready files, and optionally prepares external handoff.
6. OpenClaw orchestrator can queue approved actions such as export workflows, build tasks, or future integrations.
7. Codex builder workflow converts approved product or code tasks into implementation increments.
8. Ralph-style loop records learnings, gotchas, quality findings, and next improvements in `/tasks/progress.txt` and backlog.

## Phase Roadmap

### Adaptive Growth OS Foundation

- Market signal capture from client conversations, LinkedIn, competitors, policy, news, internal observations, training feedback, sales calls, partners, and other sources.
- Offer variants linked to signals.
- Growth experiments linked to offers.
- Experiment metrics for response, conversion, revenue, quality, client interest, strategic fit, and reusability.
- Selection decisions with fitness score, rationale, and next action.
- Learning genome items for winning patterns, failed patterns, sales language, pricing insight, objections, delivery lessons, and training activities.
- Offer-to-package handoff so selected variants can become DG Academy training packages.
- Package-to-offer linking so proven packages can become reusable genome items.

### Adaptive Growth Dashboard Final

- Executive dashboard at `/adaptive-growth/dashboard` for adaptation velocity,
  offer fitness, experiment funnel, learning genome, expansion map, OpenClaw
  loop status, and RALPH improvement status.
- Deterministic Adaptive Growth Score from signal freshness, variant
  generation, experiment activity, selection discipline, replication rate, and
  learning capture.
- Date filters for this week, last 30 days, this quarter, and custom periods.
- Brain Layer recommendations for what to test, kill, scale, replicate, learn,
  and improve in Codex, with uncertainty labeling and no invented metrics.
- PDF/text Adaptive Growth Report export for executive review.

### V1.3: Pricing + Commercial Proposal Engine

- Deterministic pricing utility with tests.
- Commercial Setup input section.
- Pricing tab with internal profitability note.
- Commercial proposal output.
- Export support for commercial proposal and pricing summaries.
- Internal notes hidden from client exports by default.

### V1.4: Client Handoff + Export Polish

- Branded DOCX/PPTX/PDF templates.
- Export bundle option for proposal, syllabus, workbook, and slides.
- Customer/contact fields.
- Draft email body with attachment checklist.
- Better Telegram handoff instructions and export bundle preparation.

### V1.5: Template Library + Offer Catalog

- Reusable DG Academy package templates by market and training type.
- Preset commercial models by offer category.
- Offer comparison view.
- Versioned package templates.
- Suggested upsells such as coaching, implementation sprint, or governance workshop.

### V2.0: Agentic Capability Factory

- GPT-5.5 Brain Layer for package planning and evaluation.
- Specialist agents for learning architecture, commercial review, governance review, delivery QA, and export QA.
- Agent routing log stored in Supabase.
- Deterministic evaluation checks for pricing, required fields, export readiness, and internal note protection.
- Human approval gates for sending, deletion, deployment, payment, or client-data actions.

### V2.5: OpenClaw Orchestration Layer

- OpenClaw job queue for approved workflows.
- Sandboxed execution assumptions and audit logs.
- External action preparation without automatic sending by default.
- Codex task creation for approved implementation work.
- Evaluation results attached to each orchestration run.

### V3.0: Ralph-Style Self-Improvement Loop

- Build iteration memory in `/tasks/progress.txt`.
- Backlog triage from observed user friction, failed exports, pricing anomalies, and evaluation results.
- Automated proposal quality scoring.
- Agent-suggested tests for pricing, export, routing, and evaluation logic.
- Human-approved improvement batches for Codex to implement.

### V3.1: Internal Pilot Launch System

- 30-day pilot dashboard at `/pilot`.
- Pilot goals for real packages, proposal exports, pricing plans, delivery projects, QA reviews, feedback, loops, and improvement opportunities.
- Pilot issue tracker for launch blockers, confusing flows, and critical defects.
- Feature feedback capture on dashboard, package detail, proposal export, pipeline, delivery, and pilot screens.
- Copy-ready pilot report with goal progress, usage, issues, feedback, quality scores, business value, build priorities, and go/no-go recommendation.
- `pilot_weekly_review` loop for OpenClaw or cron-triggered internal pilot review.

### V3.2: Agent Reliability and Evaluation Benchmarks

- Structured eval datasets for every major Brain Layer agent.
- Seed examples for SME workshop, corporate in-house training, and executive masterclass scenarios.
- Eval runs with model name, average score, pass/fail results, failed examples, and regression risks.
- Sanitized agent trace summaries for eval and workflow observability.
- `/evals` console for running benchmarks and comparing latest score with previous score.
- `npm run eval:smoke` pre-release check for Brain Layer, prompt, template, routing, and eval changes.

### V3.3: Security Red Team and Governance Audit

- `/security` dashboard for internal security checklist and red-team report.
- Security audit tables for audit records and checklist findings.
- Red-team scenarios for margin leakage, prompt injection, role bypass, unauthorized export, orchestrator misuse, and OpenClaw overreach.
- Export safety validator blocks internal margin, direct cost, internal notes, and internal knowledge markers.
- Orchestrator safety validator checks command type, authentication, risk level, external action language, and approval requirements.
- Supabase RLS policy documentation and migration checklist.

### V3.4: Pilot-Driven Improvement Batch

- Convert pilot issues and feedback into prioritized Codex stories.
- Improve top confusing workflows from pilot evidence.
- Use eval failures and regression risks to prioritize agent prompt/template improvements.
- Use security audit failures to prioritize hardening tasks.
- Strengthen persistent Supabase policies and production auth after pilot role usage is clear.

### V3.6: Enterprise Agentic Hardening

- Default the Brain Layer to the intended `gpt-5.5` model through central model config.
- Add Brain Model Status for mock, configured, fallback, and error states.
- Strengthen `masterAgent` as the workflow coordinator for specialist agents and deterministic tools.
- Wrap Adaptive Growth services with named agents while keeping pricing, fitness, export safety, approval, and lifecycle rules deterministic.
- Add concrete organization-scoped Supabase RLS migration SQL for core business, agentic, eval, approval, and growth tables.
- Move production identity toward Supabase Auth with profiles, organization memberships, and server-side role resolution.
- Add explicit approval/risk rules and autonomy levels so agents can draft and recommend without unsafe autonomy.

## Success Metrics

- Time from training idea to complete client-ready package.
- Percentage of packages saved and reopened successfully.
- Export success rate for DOCX/PPTX/PDF.
- Pricing calculation correctness across tests.
- Number of client-ready proposals generated per week.
- Reduction in manual editing time before sending a proposal.
- Number of agent-detected issues corrected before client export.
- Zero incidents of internal profitability notes appearing in client exports by default.
- Pilot goal completion rate after 30 days.
- Number of actionable pilot issues fixed before wider rollout.
- Team confidence score from feature feedback.
- Eval benchmark average score by target agent.
- Number of failed eval examples fixed before release.
- Number of critical security audit findings before wider deployment.
- Zero blocked-export bypass incidents.
- Adaptive Growth Score trend over time.
- Number of offers moved from signal to experiment to selection.
- Number of winning patterns replicated into reusable genome assets.
- Ratio of killed/parked weak offers to scaled/productized winning offers.

## Risks

- AI may create persuasive but unsupported claims if prompts and review gates are weak.
- Pricing mistakes could damage margin or client trust if deterministic logic is bypassed.
- Client data may be entered into prompts without appropriate consent or minimization.
- Export files may look too simple for premium enterprise clients if branding is not improved.
- Agentic workflows may create false confidence without transparent audit logs.
- OpenClaw or future integrations could perform external actions without enough approval control if boundaries are vague.
- Pilot feedback may be too sparse if the team does not capture issues immediately after real work.
- Pilot metrics may be misleading if local fallback data and Supabase production data are mixed without a clear pilot operating rule.
- Eval scores may become vanity metrics if rubrics are not reviewed against real DG Academy output quality.
- Security red-team checks may miss integration-layer risks if they are not reviewed against deployed Vercel/Supabase settings.
- Adaptive Growth Score may become a vanity metric if DG Academy records signals
  but does not make selection and replication decisions.

## Human Approval Points

Human approval is required before:

- Sending any email, Telegram message, proposal, or file to a customer.
- Deleting saved packages from Supabase in production.
- Changing pricing formulas, margins, tax assumptions, or discount policy.
- Including internal profitability notes in any client-facing export.
- Deploying production changes.
- Running OpenClaw actions that touch external systems.
- Using real client confidential data in prompts, exports, or agent memory.
- Creating contracts, invoices, payment links, or legal/commercial commitments.
- Expanding access beyond the internal pilot team.
- Marking the app ready for wider deployment after the pilot report recommends conditional go or no-go.
- Approving prompt/template changes when smoke evals fail or regression risk is high.
- Waiving critical security findings or weakening export/RLS/orchestrator controls.
- Scaling, killing, productizing, or making offer/genome assets client-visible
  based only on AI recommendation without human selection rationale.
