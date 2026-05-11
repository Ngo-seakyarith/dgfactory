# Enterprise Agentic Hardening Report

Date: May 6, 2026

## Summary

V3.6 moves DG Academy AI Training Production Factory closer to an enterprise-grade adaptive agentic operating system while keeping autonomy bounded by approval rules. The app now has GPT-5.5 as the intended Brain model, central model status reporting, a Master Agent, adaptive specialist agents, concrete RLS migration policies, a Supabase Auth migration foundation, explicit approval/risk rules, and autonomy settings.

Status: Conditional go for internal enterprise pilot. No-go for fully autonomous external action or broad client deployment until Supabase Auth sessions are fully validated on sensitive server routes in the deployed environment.

## Brain Model Status

Implemented:

- `src/lib/brain/modelConfig.ts`
- Default intended model: `gpt-5.5`
- Fallback model: `OPENAI_MODEL` or `gpt-4o-mini`
- Mock mode when `OPENAI_API_KEY` is missing
- Runtime status fields: intended model, fallback model, actual model, API key configured, last successful model, model status, warning, error
- `GET /api/brain/status`
- `/settings/ai` and `/settings` Brain Model Status UI

Evidence:

- TypeScript passed.
- Tests include `V3.6 model config defaults to GPT-5.5 and reports mock mode safely`.

## Agent Inventory

Implemented:

- `masterAgent`
- `chiefBrainAgent`
- `courseArchitectAgent`
- `proposalAgent`
- `pricingNarrativeAgent`
- `slideAgent`
- `workbookAgent`
- `qaAgent`
- `salesFollowUpAgent`
- `deliveryAgent`
- `improvementAgent`
- `mutationAgent`
- `replicationAgent`
- `improvementOpportunityAgent`
- `adaptiveGrowthRecommendationsAgent`
- `marketSensingAgent`
- `experimentDesignerAgent`
- `fitnessEvaluatorAgent`
- `selectionAgent`
- `expansionAgent`
- `learningGenomeAgent`
- `extinctionAgent`

Partially implemented:

- Some adaptive agents use text-output mock recommendations rather than deeply specialized schemas. They are named, routable, testable, and safely bounded, but can be made richer in later increments.

## Master Agent

Implemented:

- `src/lib/brain/agents/masterAgent.ts`
- Supports workflows:
  - `create_training_package`
  - `generate_proposal`
  - `generate_pricing_narrative`
  - `create_offer_variants`
  - `evaluate_offer_fitness`
  - `replicate_winning_offer`
  - `run_adaptive_loop`
  - `create_codex_improvement_task`
  - `run_qa_review`
  - `create_follow_up_draft`
  - `create_delivery_report`
- Router maps `master_workflow` to `masterAgent`.
- Tests confirm routing and deterministic tool selection.

## Adaptive Workflows

Implemented:

- `src/lib/brain/workflows/adaptiveGrowthWorkflow.ts`
- Adaptive workflow calls Master Agent, specialist agents, deterministic fitness scoring, and risk classification.
- Fitness score remains deterministic in `src/lib/adaptive-growth/fitness.ts`.
- Risky changes return approval requirements.

Evidence:

- Test `V3.6 adaptive growth workflow keeps fitness deterministic` passed.

## Auth Status

Implemented:

- `src/lib/auth-production.ts` for Supabase Auth user/profile/membership lookup foundation.
- `profiles` and `organization_memberships` schema in V3.6 migration.
- Middleware protects authenticated routes when `DG_REQUIRE_AUTH=true`.
- `/login` and `/unauthorized` pages exist.
- Trusted role headers are disabled by default unless `DG_TRUST_ROLE_HEADERS=true`.
- Dev role sessions are clearly environment-gated.

Remaining gap:

- Sensitive API routes still primarily use the existing role helper and local fallback model. Production deployment should validate Supabase sessions and memberships per request before retiring dev/local role fallback.

## RLS Status

Implemented:

- `supabase/migrations/016_enterprise_auth_rls_hardening_v3_6.sql`
- Concrete policies for core business, agentic, approval, audit, eval, loop, and Adaptive Growth tables.
- Organization-scoped access through `organization_id`.
- Admin-only prompt templates, approvals, audit logs, eval management, and selection decision writes.
- Viewer knowledge limited to `Client-safe`.

Documentation:

- `docs/supabase-rls-verification.md`

Remaining gap:

- Policies have been created in migration SQL and compile at repo level, but they still need manual verification in a Supabase staging project with real users and organizations.

## Approval Gate Status

Implemented:

- `src/lib/safety/approvalRules.ts`
- `src/lib/safety/riskClassifier.ts`

Approval required for:

- External sending
- Publishing client portal items
- Exporting with internal notes
- Changing offer status to Scaling, Productized, or Killed
- Prompt template approval
- Production deployment
- Production database migration
- Client/package/opportunity/delivery deletion
- Internal margin or internal knowledge exposure
- OpenClaw-triggered external action

Evidence:

- Tests cover approval rules and risk classification.

## Autonomy Settings

Implemented:

- `src/lib/safety/autonomy.ts`
- `GET/POST /api/settings/autonomy`
- `/settings/autonomy`
- `/settings` autonomy panel

Levels:

- `manual`
- `assisted`
- `supervised`
- `bounded_auto`

Rule:

- Risky actions still require approval at every autonomy level.

## Build and Test Results

Commands run:

- `npm run typecheck` - passed
- `npm run lint` - passed, no ESLint warnings or errors
- `npm test` - passed with escalation after Windows sandbox `spawn EPERM`; 44 tests passed
- `npm run eval:smoke` - passed in local mock mode, 3 examples, average 88
- `npm run build` - passed with escalation after Windows sandbox `spawn EPERM`; 101 app routes generated successfully

## Risks

- Supabase RLS policies need staging verification with real Supabase Auth users.
- Full production auth is a migration foundation, not a complete replacement for every internal helper route.
- Some adaptive agents are still broad text agents and should gain stricter output schemas as they become business-critical.
- Column-level internal margin hiding is enforced mostly by app/export safety, not native Postgres column policies.

## Next Recommended Fixes

1. Validate Supabase Auth and RLS in a staging project with Admin, Sales, Trainer, and Viewer users.
2. Wire sensitive API routes to server-side Supabase membership validation before launch beyond internal pilot.
3. Add admin-only views or separate tables for detailed internal margin fields if Supabase becomes the source of truth for pricing internals.
4. Give adaptive agents stricter schemas for market sensing, experiment design, selection, expansion, learning genome, and extinction outputs.
5. Add API integration tests for `/api/brain/status`, `/api/settings/autonomy`, and approval request creation.

## Go/No-Go

Internal enterprise pilot: Go.

Live production with external clients and fully autonomous actions: No-go until Supabase Auth/RLS is verified in staging and sensitive route authorization is fully server-side.
