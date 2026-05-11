# Agentic Architecture

## Architecture Goal

DG Academy Capability Factory should evolve into a controlled agentic system where AI can reason, draft, evaluate, and prepare work, while deterministic tools own calculations, storage, exports, and approval enforcement.

## Adaptive Growth OS

Adaptive Growth OS adds a market adaptation layer around the training factory.

Formula:

`Growth = Variation x Feedback x Selection x Replication x Expansion`

Architecture pieces:

- `market_signals`: raw demand, trend, client, competitor, policy, sales, and training feedback signals.
- `offer_variants`: product/training offer variations generated from signals or operator insight.
- `growth_experiments`: lightweight tests for offers across channels and client conversations.
- `experiment_metrics`: response, conversion, revenue, quality, interest, fit, and reusability evidence.
- `selection_decisions`: human-reviewed choices to scale, iterate, park, kill, bundle, partner, or productize.
- `learning_genome_items`: reusable lessons and winning patterns that can be replicated into future offers.
- `src/lib/adaptive-growth/fitness.ts`: deterministic fitness scoring and selection recommendation logic.
- `src/lib/adaptive-growth/replicateWinningOffer.ts`: replication workflow that turns selected offers into genome items and Internal knowledge assets.

Brain Layer connection:

- Chief Brain can propose offer variants from high-confidence signals.
- `mutationAgent` generates multiple micro-offer variants from one signal, client need, sector trend, or base idea.
- Proposal and pricing agents can support offer positioning, but deterministic code owns pricing numbers and fitness calculations.
- QA and improvement agents can suggest learning genome items from repeated feedback.
- Future orchestrator loops can review stale signals, running experiments, and selection candidates, but no external market action should happen without human approval.

Micro-Offer Mutation Factory:

- Lives on `/adaptive-growth/offers` with a review table for generated variants.
- Can start from `/adaptive-growth/signals` through `Generate Variants from Signal`.
- Uses `POST /api/adaptive-growth/generate-offer-variants`.
- Supports audience, sector, format, pricing, pain-point, duration, delivery-channel, outcome-promise, and random creative mutations.
- Produces variants with pain point, why-now logic, test method, suggested price range, buying trigger, risk, and confidence score.
- Humans edit, save, or discard variants. AI does not select winners, scale offers, or productize offers automatically.
- DG Academy knowledge retrieval can inform the variants, but internal-only knowledge remains internal context and should not appear in client-facing outputs.

Fitness Score and Selection Engine:

- Uses the weighted formula: market pull 25%, conversion 20%, revenue potential 15%, margin potential 15%, delivery quality 10%, strategic fit 10%, and reusability 5%.
- Missing metrics produce incomplete-score warnings instead of fake precision.
- Recommendation bands are Scale, Productize/Iterate, Iterate, Park, and Kill.
- Humans may override decisions, but override rationale should remain visible in the selection record.
- AI rationale is optional and can explain only deterministic metrics already available to the app. It must not invent pipeline, revenue, margin, or market evidence.

Replication Engine:

- `replicationAgent` extracts reusable patterns from winning offers: what worked, audience, promise, pricing logic, delivery format, sales message, risks, and expansion paths.
- `POST /api/adaptive-growth/replicate-offer` creates genome items and Internal knowledge documents.
- Winning offers can produce reusable training templates, proposal templates, pricing notes, sales messages, and delivery checklists.
- Parked or killed offers produce `Failed Pattern` genome items so future generation can search and avoid repeated weak offers unless a human overrides.
- Active genome items can become package templates, prompt template suggestions, proposal snippets, and sales snippets.
- Replicated knowledge defaults to `Internal`; `Client-safe` requires human review.

Adaptive Growth Loops:

- Loop execution lives in `src/lib/loops/runner.ts` and history is stored in `loop_runs`.
- OpenClaw or cron can trigger loops through `/api/loops/run` with `ORCHESTRATOR_API_KEY` or `LOOP_API_KEY`.
- Adaptive loop types cover market sensing, offer mutation, experiment review, selection review, replication review, learning genome update, and quarterly expansion strategy.
- Loops generate recommendations and draft task text only.
- Selection and expansion loops create approval requests when recommendations imply `Killed`, `Scaling`, `Productized`, or `Client Visible` changes.
- Loops do not mutate offer status, publish client-visible content, send external messages, delete records, deploy, or expose internal data automatically.

Ralph Business + Software Self-Improvement Integration:

- Business learning sources include user feedback, pilot issues, QA reviews, security audits, failed exports, failed offers, winning offers, OpenClaw loops, learning genome items, and eval failures.
- `improvementOpportunityAgent` turns those learnings into structured improvement opportunities with category, priority, rationale, suggested files, acceptance criteria, and a Codex-ready prompt.
- `/improvements` is the human approval surface for Suggested, Approved, Converted to PRD, Sent to Codex, Implemented, and Rejected opportunities.
- `/improvements/ralph` reads `tasks/prd.json` and `tasks/progress.txt` when accessible.
- Approved improvements can become Ralph stories in `tasks/prd.json`; production UI never invokes Codex or applies code changes directly.
- OpenClaw can summarize top improvements and request PRD conversion for approved items only.
- Codex still works one story at a time, runs tests/build, updates docs, and waits for human review before merge or deployment.

## GPT-5.4 Brain Layer

The Brain Layer is the top-level reasoning interface for package creation and evaluation.

Responsibilities:

- Interpret the training or capability brief.
- Plan the package structure.
- Draft narrative outputs such as syllabus, proposal, workbook, email, commercial language, and executive summaries.
- Decide which specialist agents or deterministic tools are needed.
- Explain assumptions and ask for missing business-critical inputs.
- Never invent pricing numbers, taxes, discounts, margins, or internal profitability.

The Brain Layer should receive deterministic pricing outputs and use them as facts.

Current V3.6 implementation:

- Brain code lives in `src/lib/brain`.
- `modelConfig.ts` centralizes model configuration, defaulting `AI_BRAIN_MODEL` to the intended `gpt-5.5` Brain model.
- `client.ts` reads the central model config and records the last successful model, fallback status, mock mode, warnings, and errors.
- If the configured brain model is unavailable, the server logs a warning and falls back to `OPENAI_MODEL` or `gpt-4o-mini`.
- Missing `OPENAI_API_KEY` uses mock mode so local development and builds do not fail.
- `generateStructuredOutput()` handles structured JSON generation, retries, schema validation, safe errors, and mock fallback.
- Existing package generation now routes through the Brain Layer without changing the UI contract.
- `GET /api/brain/status` exposes intended model, fallback model, actual model, API key status, mock mode, and runtime model status for admin/settings visibility.
- `masterAgent` is the enterprise workflow coordinator. It classifies workflows, selects specialist agents, selects deterministic tools, requires QA, and identifies approval needs without doing every task itself.

Current V1.7 workflow implementation:

- Multi-agent package generation lives in `src/lib/brain/workflows/packageWorkflow.ts`.
- `POST /api/workflows/generate-package` runs the workflow.
- `POST /api/workflows/regenerate-section` regenerates one package section.
- The New Package UI defaults to multi-agent generation while preserving one-shot generation as a fallback.
- Workflow state is in memory for now and tracks workflow id, status, current step, timestamps, errors, agent outputs, final output, QA review, and QA score.
- V1.8 retrieves relevant DG Academy knowledge before package generation and passes it into the Brain workflow.

## Specialist Agents

Specialist agents:

- `masterAgent`: enterprise workflow coordinator for bounded autonomy and specialist routing.
- `chiefBrainAgent`: overall routing and improvement framing.
- `courseArchitectAgent`: full training package generation.
- `proposalAgent`: client proposal language.
- `pricingNarrativeAgent`: commercial narrative from deterministic pricing facts.
- `slideAgent`: slide outline drafting.
- `workbookAgent`: participant workbook drafting.
- `qaAgent`: package readiness review.
- `salesFollowUpAgent`: sales follow-up drafts.
- `deliveryAgent`: delivery report and training-day support drafts.
- `improvementAgent`: Ralph-style improvement suggestions.
- `mutationAgent`: micro-offer variation generator for Adaptive Growth OS.
- `replicationAgent`: learning genome strategist that turns selected offers into reusable assets.
- `improvementOpportunityAgent`: translator from business/product learnings into Codex-ready Ralph stories.
- `marketSensingAgent`: summarizes market signals and uncertainty.
- `experimentDesignerAgent`: designs small offer experiments and evidence plans.
- `fitnessEvaluatorAgent`: explains deterministic fitness scores without inventing metrics.
- `selectionAgent`: recommends scale, iterate, park, kill, bundle, partner, or productize decisions from evidence.
- `expansionAgent`: suggests adjacent sectors, audiences, formats, and productization paths from winning patterns.
- `learningGenomeAgent`: curates winning and failed patterns as internal genome items.
- `extinctionAgent`: recommends parking or killing weak offers while requiring approval for status changes.

Specialist agents should produce structured outputs that can be stored, displayed, tested, and audited.

Routed task types:

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
- `adaptive_growth_recommendations`
- `master_workflow`
- `market_sensing`
- `experiment_design`
- `fitness_evaluation`
- `selection_recommendation`
- `expansion_strategy`
- `learning_genome`
- `extinction_recommendation`

## Package Workflow

V1.7 package generation sequence:

1. Chief Brain creates a package plan.
2. Course Architect creates the syllabus and baseline package structure.
3. Proposal Agent drafts the client proposal.
4. Slide Agent drafts the slide deck outline.
5. Workbook Agent drafts the participant workbook.
6. Pricing Narrative Agent drafts client-facing commercial proposal language from deterministic pricing outputs.
7. QA Agent reviews the assembled package.
8. Improvement Agent produces final recommendations.

The workflow passes context forward between agents: the plan informs the syllabus, the syllabus informs the proposal, proposal and syllabus inform slides, and pricing facts inform commercial language. QA receives the assembled package content.

## Knowledge Base

V1.8 adds the DG Academy Knowledge Base.

Data model:

- `knowledge_documents`: title, type, content, tags, source, visibility, timestamps.
- `knowledge_chunks`: document reference, chunk index, content, embedding placeholder, metadata, created timestamp.
- `training_packages.knowledge_used`: internal source notes attached to generated packages.

Retrieval:

- `src/lib/knowledge/retrieve.ts` performs keyword retrieval across document title, tags, content, and chunks.
- Query inputs come from course title, audience, client, promise, and context.
- Retrieved knowledge is formatted for Brain Layer agents before generation.
- Vector retrieval is a planned future upgrade after pgvector is enabled and tested.

Visibility model:

- `Internal` knowledge may guide reasoning but must not appear in client exports by default.
- `Client-safe` knowledge can be used in client-facing language and source notes when appropriate.
- Package detail pages show `Knowledge used` as internal review metadata with relevance scores.
- Export code should continue to exclude knowledge citations unless a future explicit option is added.

Seed documents:

- DG Academy Positioning
- AI Skills for Managers Framework
- Cambodia SME AI Adoption Notes
- Executive Training Methodology
- Prompt Structure Framework

Partial failure model:

- A failed step marks workflow state as `failed`.
- The API returns the failed step and previous trace summary when available.
- The UI shows the failed step and allows retry from the brief.
- OpenAI failures generally fall back to mock output through the Brain client, so hard failures should mostly be validation or application errors.

Regeneration:

- Saved package detail pages can regenerate syllabus, proposal, deck outline, workbook, commercial proposal, and follow-up email.
- Regeneration updates only the selected section and preserves the rest of the package.
- Client-facing commercial language must still use deterministic pricing facts only.

## Deterministic Tools

Deterministic tools are code-owned capabilities that AI must not override.

Current tools:

- Pricing calculator in `src/lib/pricing.ts`.
- Package storage mapping in `src/lib/training-storage.ts`.
- Export engine in `src/lib/export-package.ts`.
- Mock generation fallback in `src/lib/training-packages.ts`.
- Brain Layer pricing facts in `src/lib/brain/tools`.
- Brain Layer schema validation in `src/lib/brain/schemas`.
- Brain Layer QA review summaries in `src/lib/brain/evals`.
- Agent eval benchmarks and smoke checks in `src/lib/brain/evals`.

Future tools:

- Export validation checker.
- Internal-note leak detector.
- Required-field evaluator.
- Proposal scoring rubric.
- Agent routing evaluator.

## QA Review

V1.6 adds `POST /api/qa-review` and a package detail `QA Review` tab.

Input:

- Package content
- Client
- Audience
- Context

Output:

- Score from 1 to 100
- Strengths
- Weaknesses
- Missing sections
- Risks
- Recommended improvements
- Client readiness: `low`, `medium`, or `high`

QA review is advisory. Human approval is still required before client sending, deletion, payment, deployment, or client data movement.

## Evaluation + Feedback Loop

V2.0 adds an auditable learning loop for package quality and delivery feedback.

Data model:

- `output_evaluations`: package or delivery output score, reviewer type, feedback, strengths, weaknesses, improvement suggestions, risks, and created timestamp.
- `prompt_improvement_suggestions`: target agent, current prompt summary, suggested change, reason, status, and timestamps.

Rubrics live in `src/lib/brain/evals/rubrics.ts` and currently cover:

- Client proposals
- Syllabi
- Slide outlines
- Workbooks
- Commercial proposals
- Post-training reports

Workflow:

1. Human reviewer or AI QA evaluates an output.
2. Evaluation is stored without changing the original package.
3. Improvement Agent-style logic in `src/lib/brain/workflows/improvementWorkflow.ts` can create suggested prompt/template improvements from low-scoring evaluations.
4. The Quality Dashboard shows averages, weak output types, recurring weaknesses, pending suggestions, and approved improvements.
5. Human approves or rejects suggestions.
6. Approved suggestions become future Codex work items; prompts and templates never update automatically.

Safety:

- AI may recommend improvements, but cannot self-modify prompts.
- Internal profitability and client-sensitive data must not be copied into client-facing exports by default.
- Client, trainer, and learner feedback should be treated as private business data.

## Agent Reliability Benchmarks

V3.2 adds structured eval datasets and regression checks for Brain Layer agents.

Data model:

- `eval_datasets`: dataset name, target agent, status, and timestamps.
- `eval_examples`: JSON input, expected output summary, rubric, tags, and timestamps.
- `eval_runs`: dataset, target agent, model name, status, average score, timing, and summary.
- `eval_results`: example score, pass/fail, strengths, weaknesses, regression risk, output summary, and timestamp.
- `agent_traces`: sanitized workflow id, agent name, task type, input summary, output summary, status, duration, and timestamp.

Seed benchmark coverage:

- Course package generation.
- Proposal generation.
- Pricing narrative.
- Slide outline.
- Workbook generation.
- QA review.
- Follow-up email.
- Delivery report.

Each seeded dataset includes SME workshop, corporate in-house training, and executive masterclass examples.

Workflow:

1. `/evals` lists datasets, examples, latest run score, previous score, and failed examples.
2. A human runs a benchmark dataset.
3. `src/lib/brain/evals/runEval.ts` routes each example to the target agent.
4. The runner scores output with deterministic rubric logic and stores results.
5. The UI shows failed examples and regression risk.
6. Agent traces store summaries only by default, not full sensitive client inputs.

Release rule:

- Prompt, template, Brain Layer, routing, and eval logic changes should run `npm run eval:smoke`.
- A failed smoke eval blocks automatic approval. Human review decides whether to fix, adjust the benchmark, or explicitly accept the risk.

## Security Red Team and Governance Audit

V3.3 adds internal security controls for an agentic AI business system.

Security surfaces:

- `/security` shows checklist sections for authentication, role permissions, Supabase RLS, export safety, internal notes, pricing margin protection, prompt injection, orchestrator endpoints, approvals, audit logs, environment variables, secrets, file exports, and knowledge visibility.
- `POST /api/security/run-red-team` runs deterministic red-team scenarios and stores security audit results.
- `docs/supabase-rls-policies.md` documents required RLS policy direction before broader Supabase Auth rollout.

Deterministic security tools:

- `src/lib/security/exportSafety.ts` scans client-facing exports for internal margin, direct cost, internal notes, and internal knowledge markers.
- `src/lib/security/orchestratorSafety.ts` validates orchestrator command type, authentication state, risk level, external-action language, and approval requirements.
- `src/lib/security/redTeamTests.ts` runs prompt injection, leakage, role permission, export, and OpenClaw overreach scenarios.

Rules:

- Knowledge content is untrusted context, not system instruction.
- Client exports are blocked when internal terms appear unless Admin explicitly performs an internal export.
- OpenClaw may draft and summarize, but external sends and destructive actions require approval.
- Security audit findings can create Codex tasks but must not auto-weaken controls.

## Prompt Template Optimization

V2.2 adds versioned prompt templates for Brain Layer agents.

Data model:

- `prompt_templates`: agent name, version, title, system prompt, user prompt
  template, output schema, status, and timestamps.
- `prompt_template_changes`: activation or rollback audit records with old
  version, new version, reason, approval name, and timestamp.

Runtime behavior:

- The Brain client checks for an `Active` prompt template by agent name.
- If a template exists, the system prompt and user prompt template are used.
- If storage is unavailable or no active template exists, the Brain Layer falls
  back to code-defined agent instructions.
- Draft templates are never used by generation.

Human approval:

- Feedback can create prompt drafts only from approved improvement suggestions.
- Drafts require approval on `/admin/prompts` before activation.
- Rollback is a human-approved action.
- Every activation and rollback creates an audit record.

## Supabase Storage

Supabase stores production records when configured. The app must remain usable without Supabase by falling back to local storage and server memory.

Core storage:

- Training package brief.
- Generated outputs.
- Pricing inputs and calculated outputs.
- Commercial proposal.
- Quality checklist.
- Future agent runs, evaluations, approvals, scheduled loop runs, and OpenClaw orchestration logs.
- Eval datasets, examples, runs, results, and trace summaries from V3.2.
- Security audits and red-team findings from V3.3.
- Output evaluations and prompt improvement suggestions from V2.0.
- Loop run history from V2.4 in `loop_runs`.
- Audit logs from V3.0 in `audit_logs`.

Service-role operations must stay server-side. Public browser clients must never receive secret keys.

## Export Engine

The export engine converts saved/generated packages into client-ready files.

Current targets:

- Proposal DOCX.
- Syllabus DOCX.
- Workbook DOCX.
- Follow-up email DOCX.
- Slide deck PPTX.
- Summary PDF.
- Proposal PDF.
- Pricing DOCX/PDF.
- TXT package handoff.

Rules:

- Client proposal exports include client-facing commercial proposal language.
- Internal profitability notes are excluded by default.
- Internal notes require explicit user selection.
- Export filenames must stay client-friendly.

## OpenClaw Orchestrator

OpenClaw is the orchestration layer for approved workflows.

Responsibilities:

- Run approved multi-step workflows.
- Keep execution sandboxed and auditable.
- Prepare external action payloads without sending unless approved.
- Coordinate future tools such as email delivery, export bundles, storage updates, and Codex build tasks.
- Store orchestration runs, status, approval state, and logs.

OpenClaw should assume least privilege by default. External sending, deletion, deployment, payment, or client-data movement requires human approval.

Current V2.3 implementation:

- Protected endpoints live under `/api/orchestrator`.
- All orchestrator endpoints require `ORCHESTRATOR_API_KEY`.
- Command schemas live in `src/lib/orchestrator/commands.ts`.
- Approval and log storage lives in `src/lib/orchestrator/storage.ts`.
- Pipeline, delivery, and quality summaries live in `src/lib/orchestrator/summaries.ts`.
- Human approval UI lives at `/approvals`.
- OpenClaw integration docs live in `integrations/openclaw`.

Supported commands:

- `CREATE_PACKAGE`
- `GENERATE_FOLLOW_UP`
- `GET_PIPELINE_SUMMARY`
- `GET_DELIVERY_SUMMARY`
- `GET_QUALITY_SUMMARY`
- `REQUEST_EXPORT`
- `REQUEST_APPROVAL`

Safety:

- Draft package creation saves a draft and creates a review approval request.
- Follow-up generation returns draft text only.
- Summaries are read-only.
- Export and other external actions require approval requests before execution.

## Scheduled Business Loops

V2.4 adds internal scheduled loops that can be triggered by a human operator,
OpenClaw, or cron. They are operating rhythms, not external automations.

Loop framework:

- Loop types and normalization live in `src/lib/loops/types.ts`.
- API-key validation lives in `src/lib/loops/auth.ts`.
- Supabase/local fallback storage lives in `src/lib/loops/storage.ts`.
- Loop execution lives in `src/lib/loops/runner.ts`.
- Manual operation lives at `/loops`.

Current loop types:

- `weekly_pipeline_review`
- `weekly_content_ideas`
- `monthly_revenue_summary`
- `quality_improvement_review`
- `delivery_readiness_check`
- `stale_opportunity_follow_up`
- `prompt_improvement_review`

Rules:

- `/api/loops/*` requires `LOOP_API_KEY` or `ORCHESTRATOR_API_KEY`.
- Loops may read CRM, delivery, quality, prompt improvement, and package data.
- Loops may save summaries, outputs, and recommendations to `loop_runs`.
- Loops must not send messages, export client data, delete records, deploy, take
  payments, or run production migrations.
- Any external side effect suggested by a loop must go through human approval.

## Production Hardening Layer

V3.0 adds internal launch controls around the agentic system.

Roles:

- `Admin`: all access, prompt approval, internal notes, audit logs, demo seed.
- `Trainer`: delivery, course materials, feedback, post-training reports.
- `Sales`: CRM, opportunities, proposals, follow-up drafts, client-facing exports.
- `Viewer`: read-only.

Implementation:

- Role and permission helpers live in `src/lib/auth.ts`.
- Route permission helpers live in `src/lib/route-guards.ts`.
- Role session route lives at `/api/auth/session`.
- Audit storage lives in `src/lib/audit.ts`.
- Production dashboard metrics live in `src/lib/dashboard.ts`.

Rules:

- Server routes enforce permissions for sensitive actions.
- Client UI may hide controls, but server route checks are authoritative.
- Audit logs record business-sensitive actions and redact secrets.
- Internal profitability and prompt template surfaces stay admin-only by default.

## Codex Builder Workflow

Codex acts as the implementation builder for approved product and engineering tasks.

Workflow:

1. Brain Layer or Ralph loop identifies an improvement.
2. Human reviews the task and approves it for build.
3. Codex scopes a small increment.
4. Codex edits code, docs, tests, and schema as needed.
5. Codex runs lint, tests, and build.
6. Codex records learnings in `/tasks/progress.txt`.
7. Human approves deployment.

Codex should prefer small increments and preserve the standalone Factory boundary.

## Ralph Loop Workflow

The Ralph-style loop is the self-improvement layer.

Inputs:

- User feedback.
- Failed checks.
- Export issues.
- Pricing warnings.
- Agent evaluation findings.
- Build/deploy gotchas.

Outputs:

- Updated `/tasks/progress.txt` with learnings.
- Backlog entries in `/tasks/backlog.md`.
- Candidate stories in `/tasks/prd.json`.
- Suggested tests for pricing, export, routing, and evaluation.

Loop:

1. Observe product usage and build results.
2. Identify friction or defects.
3. Convert learning into backlog or test.
4. Propose a small improvement.
5. Wait for human approval when the change affects external actions, pricing, privacy, deployment, or client outputs.
6. Send approved implementation to Codex.
