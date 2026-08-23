# DG Academy AI Training Production Factory Agents Guide

This is a standalone DG Academy Factory app. Do not merge it into DG Command OS unless the user explicitly asks.

## Product Scope

The retained product contains:

- Dashboard and Google authentication with Pending/Approved access.
- Training Packages and external syllabus imports.
- Delivery preparation, generated materials, evaluation forms, responses, certificates, and post-training reporting.
- Digital Solution Proposals.
- Clients and Pipeline.
- Durable background generation jobs.
- Audit logging.

Do not reintroduce removed experimental platforms, public client portals, database-managed prompts, or role systems without explicit product approval.

## Product Direction

- Keep the UI clean, executive-friendly, and suitable for DG Academy client work.
- Use DG Academy context: practical training, business workflows, executive readiness, governance, implementation, and Cambodia corporate training.
- Prioritize practical business outputs over generic course content.
- Keep package creation, save/load, pricing, export, client management, and delivery preparation fast and obvious.
- Keep the architecture small and deployable as a standalone Vercel project.

## Engineering Rules

- Use Next.js App Router, TypeScript, Tailwind CSS, TanStack Query, and existing shadcn/ui-style primitives.
- Build in small increments and follow the existing feature-based structure.
- Keep server-side SDK clients lazily initialized so builds do not crash when environment variables are missing.
- Treat Supabase as required for persisted production behavior; do not add production mock fallbacks.
- Preserve simple JSON contracts for generation, persistence, pricing, and export.
- Keep deterministic business logic separate from AI narrative.
- Use the Brain Layer in `src/lib/brain` for every AI task. Do not call model providers directly from route handlers.
- Keep model configuration centralized in `src/lib/brain/modelConfig.ts`; do not hardcode model names in features.
- Keep agent instructions and strict Zod output schemas in version-controlled code. Do not resolve prompts from database tables.
- Do not let AI invent pricing, trainer profiles, signatories, totals, client records, job status, or delivery status.
- Keep pricing, client matching, trainer snapshots, document structure, branded exports, and status transitions deterministic.
- Use `public.generation_jobs` for long-running generation so work survives navigation and records useful errors.
- Store delivery evaluation forms, participant responses, materials, and reports separately from generated package content.
- Public evaluation routes must expose only the form identified by a valid private token.
- AI may draft delivery materials, questions, and reports, but must not claim messages were sent or work was approved.
- Keep source uploads private. Send only approved summaries, masked samples, or normalized source content to the model as designed.
- Never expose service-role keys or private storage paths to browser code.
- Never weaken Supabase RLS or authentication assumptions without explicit instruction.
- Keep the two-state access model: Pending has no internal product access; Approved has full internal product access.
- Audit package saves and exports, digital proposal changes and exports, pricing changes, opportunity status changes, and other retained sensitive actions.
- Do not start, replace, or stop the user's development server unless explicitly asked.

## Pricing And Export

- Never let AI invent pricing numbers.
- Calculate totals deterministically and keep internal costs out of client-facing exports.
- Keep DOCX output editable and branded with DG Academy assets.
- Validate client-facing content and file names before export.
- Do not add automatic external sending, payment, deployment, or destructive actions without explicit human confirmation.

## Testing

- Prefer focused verification for pricing, exports, Brain routing, Zod schemas, background jobs, syllabus extraction, and delivery evaluations.
- Verify failed jobs return useful errors and can be retried without duplicate records.
- Before production handoff, run `bun run typecheck`, `bun run lint`, and one final `bun run build` when relevant.
- Do not repeatedly build while the user's development server is active.

## Documentation

- Update `README.md` after major product or architecture changes.
- Keep the authoritative Supabase schema in `schema.sql`.
- Keep `database-schema-visual.html` synchronized with the live schema.
- Document new environment variables, routes, storage buckets, and background job types.
