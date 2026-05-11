# DG Academy Factory OpenClaw Skill

Use this skill when Sopheap asks OpenClaw to coordinate DG Academy training
package, pipeline, delivery, or quality work through the Factory app.

## Authentication

Send `ORCHESTRATOR_API_KEY` with every request:

- Preferred: `Authorization: Bearer <key>`
- Alternative: `x-orchestrator-api-key: <key>`

If authentication fails, stop and report the error. Do not try public routes as a
bypass.

## Allowed Commands

- `CREATE_PACKAGE`: create and save a draft package, then request human review.
- `GENERATE_FOLLOW_UP`: generate draft follow-up text only.
- `GET_PIPELINE_SUMMARY`: summarize CRM opportunities.
- `GET_DELIVERY_SUMMARY`: summarize delivery projects and open tasks.
- `GET_QUALITY_SUMMARY`: summarize evaluations and improvement suggestions.
- `REQUEST_EXPORT`: create an approval request before export.
- `REQUEST_APPROVAL`: create an approval request for a risky action.
- `GET_IMPROVEMENT_SUMMARY`: list top suggested/approved improvement tasks.
- `CONVERT_IMPROVEMENT_TO_PRD`: request PRD conversion for an already human-approved improvement.
- Scheduled business loops through `/api/loops/run`:
  - `weekly_pipeline_review`
  - `weekly_content_ideas`
  - `monthly_revenue_summary`
  - `quality_improvement_review`
  - `delivery_readiness_check`
  - `stale_opportunity_follow_up`
  - `prompt_improvement_review`
  - `pilot_weekly_review`
  - `weekly_market_sensing`
  - `weekly_offer_mutation`
  - `weekly_experiment_review`
  - `weekly_selection_review`
  - `weekly_replication_review`
  - `monthly_learning_genome_update`
  - `quarterly_expansion_strategy`

Loop endpoints may use `ORCHESTRATOR_API_KEY` or `LOOP_API_KEY`. Loops are
draft and recommendation workflows only.

## Adaptive Growth Commands

Use `/api/loops/run` with one of these loop types:

- Run weekly market sensing: `weekly_market_sensing`
- Generate offer mutations: `weekly_offer_mutation`
- Review experiments: `weekly_experiment_review`
- Recommend scale/kill decisions: `weekly_selection_review`
- Review replication candidates: `weekly_replication_review`
- Update learning genome recommendations: `monthly_learning_genome_update`
- Create quarterly expansion strategy: `quarterly_expansion_strategy`

Example instruction:

> Run weekly market sensing. Summarize the strongest signals, suggest offer
> mutations, and do not add or send anything without my approval.

Example instruction:

> Review completed Adaptive Growth experiments and recommend which offers to
> scale, iterate, park, or kill. Create approval requests for risky status
> changes, but do not change statuses.

Example instruction:

> Review winning offers and recommend which should become Learning Genome
> templates. Draft Codex tasks from the recommendations.

Adaptive Growth loops may create pending approval requests for recommendations
that would change an offer to `Killed`, `Scaling`, `Productized`, or
`Client Visible`. They must not apply the change automatically.

## Ralph Improvement Commands

Use `/api/orchestrator/improvements` with `ORCHESTRATOR_API_KEY`.

Allowed:

- List suggested improvements.
- Summarize the top 5 improvement tasks.
- Export Codex-ready prompts for human review.
- Request conversion to PRD only when the improvement is already `Approved`.
- Ask for human approval through `/api/orchestrator/request-approval`.

Not allowed:

- Approving improvements.
- Marking improvements implemented.
- Running Codex.
- Creating commits or pull requests.
- Deploying.
- Merging.

Example instruction:

> Summarize the top 5 improvement tasks and tell me which one should become the
> next Ralph story. Do not approve or run Codex.

Example instruction:

> Convert improvement `<id>` to a Ralph PRD story if it is already approved.
> If not approved, ask Sopheap for approval first.

## Requires Approval

Always create an approval request before:

- Sending email, Telegram, WhatsApp, Slack, or other messages.
- Exporting client data or sending documents to a customer.
- Deleting records or files.
- Deploying the app.
- Running production database migrations.
- Taking payments or changing payment records.

Approval records intent only. After approval, report back to Sopheap for the
next explicit instruction.

## Status Reporting

When reporting back to Sopheap:

- State what was drafted or summarized.
- Include package id, approval id, or relevant route when available.
- Include loop run id when reporting scheduled loop results.
- For `pilot_weekly_review`, include usage, blockers, quality issues, next
  actions, and recommended Codex tasks.
- For Adaptive Growth loops, include loop run id, approval request ids when
  created, and the strongest recommendations.
- For Ralph improvements, include improvement id, status, priority, and whether
  a PRD story was written or only generated as content.
- Say clearly that nothing external was sent unless Sopheap approved and asked
  for that separate action.
- Mention any mock-mode fallback or missing API configuration.
