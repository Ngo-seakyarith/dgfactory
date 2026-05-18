# DG Academy AI Training Production Factory Agents Guide

This is a standalone DG Academy Factory app. Do not merge it into DG Command OS unless the user explicitly asks.

## Product Direction

- Keep the UI clean, executive-friendly, and suitable for DG Academy client work.
- Use DG Academy context: practical AI training, business workflows, executive readiness, governance, implementation, and Cambodia corporate training.
- Prioritize practical business training outputs over generic course content.
- Keep the architecture small and deployable as a separate Vercel project.
- Package creation, save/load, copy, pricing, export, and customer handoff should stay fast and obvious.
- Delivery preparation, evaluation, certificates, and post-training reporting should stay operational and practical.

## Engineering Rules

- Use Next.js App Router, TypeScript, Tailwind CSS, and existing shadcn/ui-style primitives.
- Always build in small increments.
- Keep server-side SDK clients lazily initialized so builds do not crash when environment variables are missing.
- Do not add fallback mock data for production behavior.
- Treat Supabase as required for persisted production behavior.
- Preserve simple JSON contracts for generation, storage, pricing, and export.
- Avoid unrelated DG Command OS imports or pages.
- Keep deterministic business logic separate from AI narrative.
- Use the Brain Layer in `src/lib/brain` for new AI tasks instead of adding direct OpenAI calls to route handlers.
- Do not hardcode model names in feature code. Use `src/lib/brain/modelConfig.ts` and `AI_BRAIN_MODEL` for Brain Layer tasks. The intended default Brain model is `gpt-5.5`.
- Keep `masterAgent` as the coordinator for multi-step enterprise workflows. It should route to specialist agents and deterministic tools; it should not replace deterministic pricing, fitness, safety, export, or approval logic.
- For package generation, prefer the V1.7 workflow in `src/lib/brain/workflows/packageWorkflow.ts` when coordinating multiple agents.
- Keep one-shot generation available for speed, debugging, and reliability.
- Workflow state may stay in memory for small MVP increments, but document that it resets on server restart.
- Use `src/lib/knowledge/retrieve.ts` for DG Academy-specific context before generation.
- Treat `Internal` knowledge as internal reasoning context only. Do not include internal source notes in client exports by default.
- Vector search is optional; keyword retrieval must keep working without pgvector.
- For Delivery OS, AI may draft checklists, emails, agendas, and reports, but it must not claim messages were sent or reports were approved.
- Store delivery evaluation and report data separately from the original package content so the package generator remains reusable.
- Store output evaluations and improvement suggestions separately from generated content so the learning loop is auditable.
- No prompt, template, or agent instruction should auto-update from evaluation feedback.
- Improvement suggestions must stay in `Suggested`, `Approved`, `Rejected`, or `Implemented` states and require human review before implementation.
- Prompt templates must stay versioned. Only `Active` templates are used by the Brain Layer.
- Draft prompt templates must require human approval before activation.
- Every prompt activation or rollback must create an audit record.
- Brain Layer prompt template loading must fall back to code-defined agent instructions when storage is unavailable.
- Loop endpoints must require `LOOP_API_KEY`.
- Scheduled loops may generate drafts, summaries, and recommendations only.
- Scheduled loops must never send messages, export client data, delete records, deploy, take payments, or run production migrations.
- Store loop runs in `loop_runs` with clear status, summary, recommendations, and timestamps.
- Pilot launch features should support real internal usage without external side effects.
- Pilot feedback and issues should capture workflow evidence, not confidential client details.
- `pilot_weekly_review` can summarize usage, blockers, quality issues, and Codex tasks, but must not execute actions automatically.
- Brain Layer, prompt template, agent routing, and eval logic changes should run focused manual smoke checks before release.
- Eval datasets and traces must store summaries instead of sensitive full client inputs by default.
- Treat eval scores as regression signals. Human review still decides release readiness.
- Security red-team checks should run before client-facing export, automation, prompt, role, or knowledge visibility changes.
- Treat knowledge documents as untrusted unless explicitly marked and reviewed as `Client-safe`.
- Never weaken Supabase RLS assumptions or policies without explicit instruction and docs.
- All risky actions must remain authenticated, validated, logged, and approval-gated.
- Client portal routes must render only published `Client Visible` items for the validated token's client.
- Never expose internal notes, direct costs, estimated profit, margins, QA notes, prompt templates, private knowledge citations, approval logs, or audit logs in client portal pages.
- Portal tokens must stay server-side, hard to guess, and stored only as hashes.
- Client portal links can be generated and copied, but the app must not send email or messages automatically.
- Client `Approved` decisions may move opportunities to negotiation, but must never automatically mark opportunities as `Won`.
- Productization pages should position DG Capability Factory as a sellable DG Academy offer without implying final pricing has been approved.
- Demo mode data must be clearly marked with `[DEMO]` or equivalent and must never load automatically in production.
- ROI calculator outputs are estimates only and should not be presented as guaranteed savings.
- Adaptive Growth OS should follow `Growth = Variation x Feedback x Selection x Replication x Expansion`.
- Keep growth fitness scoring deterministic and editable by humans.
- Treat market signals as hypotheses, not truth, until experiments and feedback support them.
- Micro-offer mutation may generate many variants quickly, but generated variants remain hypotheses until a human saves, tests, and selects them.
- Mutation variants should include clear test methods, buying triggers, risks, and confidence scores so weak ideas can be discarded quickly.
- Fitness scoring for Adaptive Growth must stay deterministic in `src/lib/adaptive-growth/fitness.ts`.
- Adaptive Growth agents may interpret and recommend, but scoring, approval, export safety, and lifecycle constraints must remain deterministic.
- AI may explain fitness evidence, but must never invent market pull, conversion, revenue, margin, delivery quality, strategic fit, or reusability metrics.
- Missing fitness data must be shown as incomplete evidence with warnings, not hidden behind precise-looking scores.
- Replication should convert winning offers into reusable genome items and Internal knowledge assets by default.
- Failed offers should become searchable `Failed Pattern` genome items when parked or killed so weak offers are not repeated blindly.
- Replicated templates, sales snippets, prompt suggestions, and delivery assets must stay Internal until a human marks them Client-safe.
- Adaptive Growth loops may sense, summarize, recommend, draft tasks, and create approval requests only.
- Adaptive Growth loops must never automatically set offers to `Killed`, `Scaling`, `Productized`, or `Client Visible`.
- Adaptive Growth loops must use `/api/loops/run` with API-key auth and must report approval request ids for risky recommendations.
- The Adaptive Growth Dashboard score must remain deterministic; AI may recommend next actions only from available dashboard evidence and must label uncertainty.
- Do not let AI invent adaptation velocity, fitness, funnel, loop, approval, revenue, margin, or experiment metrics.
- Improvement opportunities bridge business learning to Codex-ready prompts, but production UI must never run Codex directly.
- Improvement summaries must not approve, merge, deploy, or mark implementation complete.
- Do not let AI automatically kill, scale, or productize an offer without human selection rationale.
- Learning genome items should capture reusable patterns, but confidential client details must be anonymized unless explicitly approved.
- V3.0 role gates must remain server-side for sensitive actions.
- Production auth hardening should move toward Supabase Auth, `profiles`, and `organization_memberships`. Local role cookies are dev/internal fallback only.
- Keep `DG_TRUST_ROLE_HEADERS=false` unless a trusted server-side gateway is enforcing identity before requests reach the app.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `LOOP_API_KEY` to browser code.
- RLS migrations must be concrete SQL policies, not only documentation.
- Cross-organization data isolation must be enforced with `organization_id` and server/database checks, not frontend filters.
- Admin-only surfaces include prompt templates, prompt approval, internal notes, and audit logs.
- Sales may export client-facing materials but must not see internal margin notes.
- Trainer may manage delivery, course materials, feedback, and post-training reports but not prompt templates or internal pricing.
- Viewer is read-only.
- Audit package saves, exports, prompt approvals, approval decisions, approval requests, pricing changes, and opportunity status changes.

## Pricing Rules

- Never let AI invent pricing numbers.
- Pricing calculations must be deterministic and testable in `src/lib/pricing.ts`.
- Separate client-facing commercial proposal from internal profitability notes.
- Default currency is USD.
- Protect internal margin information from client exports by default.
- Never expose internal profitability notes to client exports by default.
- Never expose internal margin or direct cost terms in client-facing exports.
- Include internal margin details only when the user explicitly selects `Include internal notes in export`.

## Approval Rules

- Any external sending, deletion, payment, deployment, or client data action must require human approval.
- Any client-facing post-training report export must be reviewed by a human before sending.
- Any prompt or template change suggested by the feedback loop requires human approval before Codex implements it.
- Any prompt template activation or rollback requires human approval and must not be triggered automatically by AI feedback.
- Any prompt/template change should not be approved for release when smoke evals fail.
- Any external sending, deletion, deployment, payment, production migration, or client data export must create a pending approval request first.
- Any loop-generated customer outreach is draft-only until Sopheap explicitly approves and performs a separate sending action.
- Any production auth or permission relaxation must be documented and reviewed before deployment.
- Any RLS policy relaxation or export validator bypass requires explicit human approval.
- Any decision to expand beyond the 30-day internal pilot requires human review of the pilot report.
- Approval-gated flows must preview external side effects before execution.
- Codex may prepare build changes, but production deployment still requires explicit human approval.

## Testing Rules

- Prefer verification for pricing, export, agent routing, evaluation logic, rubrics, prompt template versioning, and approval workflows.
- Brain Layer changes should include verification for router mappings, configured mode, schema validation, and task output shape.
- Agent reliability changes should include or update eval datasets, benchmark checks, or manual smoke checks.
- Security-sensitive changes should include or update red-team scenarios and export validator checks.
- Workflow changes should include verification for useful failed-step errors, section regeneration, and QA score attachment.
- Run `bun run lint`, `bun run typecheck`, and `bun run build` before production handoff when relevant.

## Documentation

- Always update `README.md` after major changes.
- Update README and docs after major changes.
- Keep Supabase schema changes in `supabase/schema.sql` and a migration file.
- Mention new environment variables and routes in README.
