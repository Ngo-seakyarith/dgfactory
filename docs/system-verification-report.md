# DG Academy AI Training Production Factory System Verification Report

Generated: 2026-05-06

## Executive Summary

The repo has evolved into a substantial internal agentic business system. It includes a reusable Brain Layer, specialist agents, multi-agent package generation, OpenClaw orchestrator endpoints, Adaptive Growth OS, Learning Genome, Ralph-style Codex improvement workflow, eval/QA infrastructure, and approval/audit/export safety controls.

Go/no-go status: **conditional go for internal DG Academy pilot use**.

It is **not yet a full autonomous adaptive agentic system**. It is better described as a human-approved adaptive operating system with agentic generation, deterministic business logic, and safety gates. The main gaps are GPT-5.5 not being the default model in repo config, no dedicated specialist agents for every Adaptive Growth function, RLS policies documented but not implemented in migrations, and no automatic autonomous master-agent control across the whole business system.

## Evidence Reviewed

- Brain Layer: `src/lib/brain`
- Brain client: `src/lib/brain/client.ts`
- Agent definitions: `src/lib/brain/agents/index.ts`
- Agent router: `src/lib/brain/router.ts`
- Multi-agent workflow: `src/lib/brain/workflows/packageWorkflow.ts`
- Orchestrator: `src/app/api/orchestrator`, `src/lib/orchestrator`
- Adaptive Growth OS: `src/app/adaptive-growth`, `src/lib/adaptive-growth.ts`, `src/lib/adaptive-growth-storage.ts`, `src/lib/adaptive-growth`
- Adaptive dashboard: `src/app/adaptive-growth/dashboard/page.tsx`, `src/lib/adaptive-growth-dashboard.ts`
- Ralph loop: `scripts/ralph`, `tasks/prd.json`, `tasks/progress.txt`
- Eval system: `src/lib/brain/evals`, `src/app/api/evals`, `scripts/eval-smoke.mjs`
- Safety: `src/lib/security`, `src/app/api/export-package/route.ts`, `src/lib/auth.ts`
- Schema: `supabase/schema.sql`, `supabase/migrations`
- Docs: `README.md`, `AGENTS.md`, `docs/agentic-architecture.md`, `docs/security-and-approval-model.md`, `integrations/openclaw`

## 1. Brain Layer

Status: **implemented with one model-version caveat**.

Implemented:

- `src/lib/brain` exists with `agents`, `tools`, `prompts`, `schemas`, `evals`, and `workflows`.
- `src/lib/brain/client.ts` reads `AI_BRAIN_MODEL`.
- `getBrainModel()` currently defaults to `gpt-5.4`.
- Fallback model logic exists through `OPENAI_MODEL` and default `gpt-4o-mini`.
- Missing `OPENAI_API_KEY` returns agent mock output.
- Invalid OpenAI key, quota/rate limit, schema errors, and model unavailability fall back safely to mock output or fallback model.
- Structured output schema validation exists in `src/lib/brain/schemas/index.ts`.

Partial / missing:

- GPT-5.5 is **not the repo default**. `.env.example` and README currently show `AI_BRAIN_MODEL=gpt-5.4`.
- GPT-5.5 can be used by setting `AI_BRAIN_MODEL=gpt-5.5`, but this verification did not confirm external model availability.

## 2. Master Agent

Status: **partially implemented**.

Implemented:

- `chiefBrainAgent` exists in `src/lib/brain/agents/index.ts`.
- `runPackageWorkflow()` uses `chiefBrainAgent` for the planning step before specialist generation.
- The workflow passes the Chief Brain plan into downstream specialist generation.
- `src/lib/brain/router.ts` statically routes task types to specialist agents.

Partial / missing:

- There is no separate `masterAgent` name.
- The Chief Brain does not autonomously decide all routes at runtime; routing is mostly deterministic via `taskMap`.
- Master-agent behavior is strongest in package generation, not across every Adaptive Growth, CRM, delivery, evaluation, and orchestrator workflow.

## 3. Specialist Agents

Status: **mostly implemented, with Adaptive Growth specialist gaps**.

Implemented agents in `src/lib/brain/agents/index.ts`:

- Course architecture: `courseArchitectAgent`
- Proposal: `proposalAgent`
- Pricing narrative: `pricingNarrativeAgent`
- Slide generation: `slideAgent`
- Workbook generation: `workbookAgent`
- QA review: `qaAgent`
- Sales follow-up: `salesFollowUpAgent`
- Delivery: `deliveryAgent`
- Improvement: `improvementAgent`
- Offer mutation: `mutationAgent`
- Offer replication / Learning Genome extraction: `replicationAgent`
- Ralph improvement opportunity: `improvementOpportunityAgent`
- Adaptive dashboard recommendations: `adaptiveGrowthRecommendationsAgent`

Partial / missing:

- No dedicated `marketSensingAgent` was found. Market sensing exists as scheduled loop logic in `src/lib/loops/runner.ts`.
- No dedicated `selectionAgent` was found. Selection is mainly deterministic fitness scoring in `src/lib/adaptive-growth/fitness.ts` plus AI rationale in `/api/adaptive-growth/evaluate-fitness`.
- No dedicated `learningGenomeAgent` was found. Learning genome behavior is handled by `replicationAgent`, storage, and UI.

## 4. OpenClaw Orchestrator

Status: **implemented for authenticated internal orchestration**.

Implemented:

- Orchestrator API namespace exists under `src/app/api/orchestrator`.
- Endpoints include health, create package, create follow-up, pipeline summary, delivery summary, quality summary, approval request/status, and improvements.
- `src/lib/orchestrator/auth.ts` requires `ORCHESTRATOR_API_KEY`.
- `src/lib/orchestrator/commands.ts` defines supported commands and approval statuses.
- `approval_requests` table exists in `supabase/schema.sql` and migration `007_openclaw_orchestrator_v2_3.sql`.
- `orchestrator_logs` table exists.
- `saveOrchestratorLog()` writes orchestrator actions and audit logs.
- OpenClaw docs exist in `integrations/openclaw/README.md` and `integrations/openclaw/openclaw-skill.md`.
- `src/lib/security/orchestratorSafety.ts` validates orchestrator command risk.
- Unsafe/external actions are documented and routed through approvals rather than automatic execution.

Partial / missing:

- Orchestrator integrations are webhook-style app endpoints, not a live verified OpenClaw runtime connection.
- Approval records do not execute side effects after approval; they are control/audit records.

## 5. Adaptive Growth OS

Status: **implemented**.

Implemented:

- Market signals: `market_signals` table and `/adaptive-growth/signals`.
- Offer variants: `offer_variants` table and `/adaptive-growth/offers`.
- Growth experiments: `growth_experiments` table and `/adaptive-growth/experiments`.
- Experiment metrics: `experiment_metrics` table and metrics UI.
- Fitness scoring: `src/lib/adaptive-growth/fitness.ts`.
- Selection decisions: `selection_decisions` table and `/adaptive-growth/selection`.
- Learning genome: `learning_genome_items` table and `/adaptive-growth/genome`.
- Replication engine: `src/lib/adaptive-growth/replicateWinningOffer.ts`.
- Adaptive loops: loop types in `src/lib/loops/types.ts` and implementations in `src/lib/loops/runner.ts`.
- Adaptive dashboard: `/adaptive-growth/dashboard` and `src/lib/adaptive-growth-dashboard.ts`.
- Adaptive Growth Score is deterministic.
- AI dashboard recommendations are constrained to available dashboard evidence.

Partial / missing:

- Adaptive loops produce recommendations and approvals, not autonomous business changes.
- Long-term trend charts or historical Adaptive Growth Score snapshots are not yet persisted as a dedicated table.

## 6. RALPH / Codex Loop

Status: **implemented as a developer workflow**.

Implemented:

- `tasks/prd.json` exists and contains a pending story.
- `tasks/progress.txt` exists.
- `scripts/ralph` exists with README, prompt, shell runner, and JS helpers.
- `scripts/ralph/README.md` states one story per iteration.
- Ralph commands exist in `package.json`: `ralph:plan`, `ralph:next`, `ralph:check`.
- `ralph:check` prints the quality gate.
- `AGENTS.md` states tests must run before marking complete and `passes=true` must not be set without validation.
- `/improvements` and `/improvements/ralph` connect business learnings to Codex-ready PRD stories.

Partial / missing:

- Progress logging is documented and supported by `tasks/progress.txt`, but not automatically appended by production UI.
- Ralph does not automatically run Codex unless explicitly enabled in the developer shell runner.

## 7. Evaluation System

Status: **implemented**.

Implemented:

- QA review endpoint exists: `src/app/api/qa-review/route.ts`.
- QA agent exists: `qaAgent`.
- Multi-agent package workflow attaches QA score.
- Output evaluations exist through `output_evaluations` table and `src/lib/evaluation-storage.ts`.
- Quality dashboard exists at `/quality`.
- Eval datasets, examples, runs, results, and traces exist in schema/migrations.
- Eval runner exists: `src/lib/brain/evals/runEval.ts`.
- Seed benchmarks exist: `src/lib/brain/evals/benchmarks.ts`.
- Eval API exists: `src/app/api/evals`.
- Smoke eval script exists: `scripts/eval-smoke.mjs`.
- Tests cover eval seeds, mock mode, QA review, and output quality metrics.

Partial / missing:

- Smoke eval is lightweight and currently local/mock by default.
- Full regression benchmarking against a live deployed app requires `EVAL_BASE_URL` and valid API/model configuration.

## 8. Safety and Approval

Status: **implemented with one database-policy caveat**.

Implemented:

- `approval_requests` table exists.
- `audit_logs` table exists.
- Approval UI exists at `/approvals`.
- Approval decisions require `approve_requests` permission.
- Internal role permissions exist in `src/lib/auth.ts`.
- Export route checks `includeInternalNotes`; internal notes require `view_internal_notes`.
- Export safety validator blocks internal margin/profit/direct-cost markers for client-facing exports.
- Client portal safe renderer strips internal notes, margins, QA scores, private knowledge, and prompt/template references.
- Prompt template approval requires `approve_prompts`.
- Prompt activation/rollback creates prompt template change records.
- Orchestrator actions are logged.
- Red-team checks exist in `src/lib/security/redTeamTests.ts`.
- Security dashboard exists at `/security`.

Partial / missing:

- Supabase RLS is enabled on many tables, but concrete `create policy` statements are mostly documented in `docs/supabase-rls-policies.md`, not implemented in migrations.
- The current app auth is an internal role/cookie/header permission layer, not a full identity provider.
- Production should use private Vercel access or Supabase Auth/RLS policies before broad external use.

## 9. Build and Test Results

Commands run:

```bash
npm run lint
npm test
npm run build
npm run eval:smoke
```

Results:

- `npm run lint`: passed with no warnings or errors.
- `npm test`: initial sandbox run failed with Windows `spawn EPERM`; rerun outside sandbox passed.
- Test result: 40 tests passed, 0 failed.
- `npm run build`: initial sandbox run failed with Windows `spawn EPERM`; rerun outside sandbox passed.
- Build result: Next.js production build completed successfully and generated 95 app routes.
- `npm run eval:smoke`: passed in local mock mode with 3 examples, average score 88.

## Implemented Capability Matrix

| Capability | Status | Evidence |
| --- | --- | --- |
| Configurable Brain Layer | Implemented | `src/lib/brain/client.ts` |
| GPT-5.5 support by env | Partial | `AI_BRAIN_MODEL` supports env value, default is `gpt-5.4` |
| Mock fallback | Implemented | `generateStructuredOutput()` and tests |
| Chief Brain planning | Implemented for package workflow | `packageWorkflow.ts` |
| Static specialist routing | Implemented | `router.ts` |
| Multi-agent package generation | Implemented | `packageWorkflow.ts` |
| OpenClaw endpoints | Implemented | `src/app/api/orchestrator` |
| Orchestrator auth | Implemented | `src/lib/orchestrator/auth.ts` |
| Approval model | Implemented | `approval_requests`, `/approvals` |
| Adaptive Growth OS | Implemented | `/adaptive-growth/*`, schema tables |
| Learning Genome | Implemented | `learning_genome_items`, replication engine |
| Ralph loop | Implemented as developer workflow | `scripts/ralph`, `tasks/prd.json` |
| Eval/QA system | Implemented | `/quality`, `/evals`, eval tables |
| Client export protection | Implemented | `exportSafety.ts`, export route |
| Supabase RLS policies | Partial | RLS enabled; concrete policies mostly docs-only |

## Key Risks

- **Model expectation risk:** Repo defaults to `gpt-5.4`, not `gpt-5.5`; users may believe GPT-5.5 is active when it is not.
- **Autonomy expectation risk:** The system is agentic and adaptive, but not fully autonomous. Human approval gates are intentionally central.
- **RLS production risk:** Tables enable RLS, but migrations do not appear to include complete `create policy` coverage.
- **Auth production risk:** Internal role cookies are suitable for MVP/internal use, not broad external identity management.
- **Data persistence risk:** Local fallback/server memory modes are useful for development but not production persistence.
- **Eval confidence risk:** Smoke eval is lightweight; live model regression testing needs configured API and `EVAL_BASE_URL`.
- **Agent coverage risk:** Market sensing, selection, and learning genome are partly deterministic loop/workflow modules, not standalone specialist agents.

## Next Recommended Fixes

1. Decide whether to change `.env.example`, README, and default `getBrainModel()` from `gpt-5.4` to `gpt-5.5`, or explicitly keep GPT-5.4 as the default and describe GPT-5.5 as optional.
2. Add dedicated `marketSensingAgent`, `selectionAgent`, and `learningGenomeAgent` if DG Academy wants clearer agent separation.
3. Add Supabase `create policy` migrations for the production role model.
4. Replace or supplement MVP cookie/header roles with Supabase Auth before wider external deployment.
5. Persist Adaptive Growth Score history for trend reporting.
6. Run `npm run eval:smoke` against a local or deployed app with `EVAL_BASE_URL` before production rollout.
7. Add tests for the new Adaptive Growth Dashboard report and recommendation API.
8. Add a production launch checklist that verifies env vars, Supabase migrations, RLS policies, Vercel protection, and OpenClaw keys.

## Final Verification Judgment

The app is **an intelligent adaptive agentic internal MVP**, with strong deterministic safety boundaries and substantial agent/workflow infrastructure.

It is **not yet a fully autonomous GPT-5.5-led adaptive enterprise system**. The correct status is:

**Conditional go for internal pilot and controlled DG Academy use. No-go for unsupervised external/client production until GPT-5.5 configuration, Supabase RLS policies, production auth, and live eval checks are finalized.**
