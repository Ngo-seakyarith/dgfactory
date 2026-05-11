# Security and Approval Model

## Purpose

DG Academy Capability Factory handles business proposals, pricing, internal margin assumptions, and potentially client-sensitive information. The system must keep deterministic logic, privacy boundaries, and human approval gates clear as it becomes more agentic.

## Actions Allowed Without Approval

The app or agents may perform these actions without additional human approval:

- Generate mock training content.
- Generate AI draft content when an API key is configured.
- Calculate pricing from user-provided assumptions.
- Display internal pricing and profitability inside the app.
- Save packages locally in browser storage.
- Save packages to Supabase when the user clicks save and Supabase is configured.
- Copy text to the clipboard after a user action.
- Export local files after a user clicks an export button.
- Draft email or Telegram handoff text without sending automatically.
- Run local tests, lint, typecheck, and build.
- Append build learnings to `/tasks/progress.txt`.
- Return authenticated OpenClaw summaries for pipeline, delivery, and quality state.
- Generate and save draft packages through OpenClaw when no external sending occurs.
- Run authenticated scheduled business loops that create summaries, drafts, and recommendations only.
- Use internal role sessions to access allowed app areas.
- Capture pilot feedback and issue reports inside the app.
- Generate and copy pilot reports for internal review.
- Run eval benchmark datasets and store sanitized agent trace summaries.
- Run security red-team checks and store security audit records.
- Generate client portal access links and suggested email drafts after an internal user action.
- Accept client portal feedback through a valid, active, unexpired portal token.

## Actions Requiring Human Approval

Human approval is required before:

- Sending email, Telegram messages, files, or proposals to customers.
- Deleting production Supabase records.
- Deploying to production.
- Pushing to GitHub or creating production release branches.
- Running OpenClaw workflows that touch external systems.
- Creating invoices, payment links, contracts, legal terms, or client commitments.
- Changing pricing formulas, margin defaults, tax logic, or discount policy.
- Including internal profitability notes in client-facing exports.
- Using real confidential client data in prompts, agent memory, or training examples.
- Connecting new third-party services.
- OpenClaw-triggered exports, external sends, deletions, deployments, payments, and production migrations.
- Loop-triggered external sends, exports, deletions, deployments, payments, production migrations, or client data transfers.
- Non-admin access to prompt templates, internal profitability notes, audit logs, or demo seed.
- Expanding the pilot to new users or external clients based only on automated metrics.
- Publishing a document to the client portal when it contains suspected internal margin, QA, prompt, or private knowledge content.

## Blocked Actions

These actions should be blocked unless the product design changes and explicit approval controls are added:

- Automatic customer sending without user review.
- Automatic payment collection or invoice issuance.
- Automatic contract generation marked as legally final.
- Exposing `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, or other secrets to the browser.
- Using AI-generated pricing numbers as authoritative.
- Exporting internal profitability notes to client proposal files by default.
- Training model memory on confidential client data without permission.
- Running unsandboxed OpenClaw actions against production systems.
- Allowing OpenClaw to bypass `/approvals` for high-risk actions.
- Allowing scheduled loops to send customer messages or modify external systems automatically.
- Showing internal app navigation, prompt templates, audit logs, internal notes, or internal profitability data in client portal routes.

## Data Privacy Rules

- Minimize client-sensitive information in prompts.
- Do not paste secrets, private keys, access tokens, or credentials into training/package context.
- Keep server-only keys in server routes and environment variables.
- Treat Supabase service-role operations as privileged server actions.
- Do not expose role enforcement secrets or admin PINs to browser code.
- Avoid storing unnecessary personal data in package records.
- Keep pilot feedback focused on workflow observations, not sensitive client information.
- Treat pilot issues as internal operational notes unless explicitly approved for sharing.
- Store eval traces as summaries by default. Do not store full confidential client inputs unless explicitly configured and approved.
- Treat knowledge documents as untrusted prompt context unless reviewed and marked `Client-safe`.
- Keep security audit evidence internal unless explicitly approved for sharing.
- Store client portal tokens as hashes only and never log the raw token.
- Client portal pages must only return documents for the token's client and only when the portal item is `Published` and `Client Visible`.
- Revoke and expiry checks must run on every portal request.
- Use local mock/fallback behavior when keys are missing instead of exposing configuration errors.

## Internal Margin Protection

- Internal profitability notes are for DG Academy operators only.
- Client proposal exports must exclude internal margin, direct cost, target margin, and estimated profit by default.
- The `Include internal notes in export` checkbox must remain explicit and default false.
- Commercial proposal text may include final program fee, what is included, terms placeholders, funding notes, and discount notes, but not internal cost structure unless explicitly intended for internal export.

## Client Data Handling Rules

- Client names and market descriptions may appear in proposals and exports.
- Confidential examples should be anonymized unless the user confirms they are approved for use.
- Generated outputs should avoid unsupported guarantees or claims about client outcomes.
- Funding notes should be phrased as eligibility guidance, not approval guarantees.
- Saved packages should be deletable by user action, but production deletion requires careful confirmation.

## OpenClaw Sandboxing Assumptions

OpenClaw is treated as a future orchestrator, not a free-running production actor.

Assumptions:

- OpenClaw runs should be sandboxed by default.
- Every orchestration run should have an input payload, status, approval state, logs, and result summary.
- External side effects should require explicit approval and a visible preview.
- OpenClaw should not receive broad credentials.
- OpenClaw should prepare actions for review before executing customer-facing, deletion, payment, deployment, or client-data workflows.
- Failed or blocked OpenClaw runs should create backlog entries rather than retrying risky actions automatically.

## V2.3 Orchestrator API Rules

- Every `/api/orchestrator/*` endpoint requires `ORCHESTRATOR_API_KEY`.
- The key may be sent as `Authorization: Bearer <key>` or `x-orchestrator-api-key`.
- The key must never be sent to browser code or stored in client-visible state.
- Orchestrator logs must redact obvious secrets such as keys, tokens, and passwords.
- Approval requests support `Pending`, `Approved`, `Rejected`, and `Expired`.
- Risk levels are `Low`, `Medium`, and `High`.
- Approving a request records a human decision; it does not execute external side effects automatically.

## V2.4 Scheduled Loop Rules

- Every `/api/loops/*` endpoint requires `LOOP_API_KEY` or `ORCHESTRATOR_API_KEY`.
- The key may be sent as `Authorization: Bearer <key>`, `x-loop-api-key`, or `x-orchestrator-api-key`.
- Loop runs are stored in `loop_runs` with input, output, summary, recommendations, status, and timestamps.
- Loops may draft follow-up messages, content ideas, and recommendations.
- Loops must not send messages, export client data, delete records, deploy, take payments, or run production migrations.
- OpenClaw or cron may trigger loops, but any external side effect must become a human approval request first.

## V3.0 Role and Audit Rules

- Roles are `Admin`, `Trainer`, `Sales`, and `Viewer`.
- `DG_REQUIRE_AUTH=true` makes missing sessions default to Viewer.
- `Admin` can approve prompts, view internal notes, seed demo data, and inspect audit logs.
- `Sales` can manage CRM/proposals and client-facing exports, but cannot include internal notes.
- `Trainer` can manage delivery, materials, feedback, and reports.
- `Viewer` is read-only.
- Audit logs are required for package saves, exports, prompt approvals, approval decisions, orchestrator commands, role changes, demo seed, and opportunity status changes.
- Audit metadata must redact obvious secrets such as keys, tokens, passwords, and authorization headers.

## V3.1 Pilot Rules

- `/pilot` is an internal launch-readiness dashboard, not a client-facing report page.
- Pilot goals, issues, and feedback may use local/server fallback when Supabase is missing, but production pilot data should use Supabase.
- Pilot reports are internal markdown summaries and should be reviewed before sharing outside DG Academy.
- `pilot_weekly_review` may summarize usage, blockers, quality issues, and recommended Codex tasks.
- The pilot loop must not send messages, export client data, deploy code, delete records, or approve roadmap changes automatically.
- A human must decide go/no-go for wider deployment after reviewing pilot report evidence.

## V3.2 Eval Rules

- `/evals` is an internal reliability console, not a client-facing quality certificate.
- Eval datasets should use representative but non-confidential examples where possible.
- `agent_traces` should store summaries, not sensitive full prompts or outputs.
- Failed eval smoke checks should block automatic prompt/template approval.
- Human review can override an eval result only with a clear note and follow-up action.
- Eval results can guide Ralph/Codex tasks, but they must not auto-update prompts or templates.

## V3.3 Security Audit Rules

- `/security` is an internal governance dashboard for Admin users.
- Red-team checks cover prompt injection, data leakage, internal margin exposure, unsafe tool use, unauthorized export, weak role permissions, orchestrator misuse, OpenClaw overreach, and Supabase RLS readiness.
- Client-facing exports are scanned for internal margin, direct cost, internal note, and internal knowledge markers.
- Risky exports are blocked unless an Admin explicitly performs an internal export and reviews the file before sharing.
- Orchestrator commands must be authenticated, validated, logged, and approval-gated when they involve external or destructive actions.
- Supabase RLS policy changes must be documented in `docs/supabase-rls-policies.md` and verified with `docs/supabase-rls-verification.md`.
- V3.6 adds concrete organization-scoped RLS migration SQL in `supabase/migrations/016_enterprise_auth_rls_hardening_v3_6.sql`.
- The intended production identity foundation is Supabase Auth with `profiles` and `organization_memberships`; internal role cookies remain a local/dev fallback.
- Security audit records are internal evidence and should not be shared with clients without review.

## V3.4 Client Portal Rules

- Client portal routes are public-facing but token-protected.
- Portal tokens must be hard to guess, stored only as hashes, revocable, and optionally expiring.
- Internal app navigation is hidden on `/client-portal/*` routes.
- Client-safe rendering must strip internal notes, direct cost, estimated profit, margin language, QA scores, private knowledge markers, and prompt/template references.
- Only `Published` and `Client Visible` portal items can be opened by a client.
- Feedback submission is allowed through the portal, but no email, Telegram, WhatsApp, or external message is sent automatically.
- A client `Approved` decision may update a linked opportunity to `Negotiation`, but must never mark the opportunity `Won` without DG Academy confirmation.
- Portal access creation, revocation, publishing, portal opens, and feedback submission should be audit logged with raw tokens redacted.
