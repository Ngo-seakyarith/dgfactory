# OpenClaw Orchestrator Integration

OpenClaw can call DG Academy AI Training Production Factory through protected
webhook-style endpoints. Treat OpenClaw as an orchestrator, not an unrestricted
actor.

## Setup Concept

1. Set `ORCHESTRATOR_API_KEY` in the Factory app environment.
2. Configure OpenClaw to send the key as either:
   - `Authorization: Bearer <key>`
   - `x-orchestrator-api-key: <key>`
3. Call only the `/api/orchestrator/*` endpoints, or `/api/loops/*` endpoints
   when running scheduled internal loops.
4. Use `/approvals` for human approval before risky actions.

## Endpoints

- `GET /api/orchestrator/health`
- `POST /api/orchestrator/create-package`
- `POST /api/orchestrator/create-follow-up`
- `GET /api/orchestrator/pipeline-summary`
- `GET /api/orchestrator/delivery-summary`
- `GET /api/orchestrator/quality-summary`
- `POST /api/orchestrator/request-approval`
- `GET /api/orchestrator/approval-status?id=<approval_id>`
- `POST /api/loops/run`
- `GET /api/loops/history`
- `GET /api/loops/<loop_run_id>`

Loop endpoints accept `ORCHESTRATOR_API_KEY` or `LOOP_API_KEY`.

## Scheduled Loop Types

- `weekly_pipeline_review`
- `weekly_content_ideas`
- `monthly_revenue_summary`
- `quality_improvement_review`
- `delivery_readiness_check`
- `stale_opportunity_follow_up`
- `prompt_improvement_review`
- `pilot_weekly_review`

## Safety Rules

OpenClaw may draft, summarize, and prepare work. It must not execute:

- External sending
- Deletion
- Deployment
- Payment
- Client data export
- Production database migration

Those actions must become `approval_requests` with `Pending` status first.

Approving a request in the Factory app records a human decision. It does not
execute the external action automatically.

## Example Prompts

Create a draft AI Skills for Managers proposal for a Cambodian bank, 2 days,
25 managers. Do not send it. Save it and ask me for review.

Give me this week's proposal pipeline summary.

Check low-scoring training packages and suggest improvements.

Run the weekly pipeline review loop and summarize the recommended next actions.

Run the stale opportunity follow-up loop. Draft messages only; do not send them.

Run the delivery readiness check for upcoming DG Academy training projects.

Run the pilot weekly review and recommend next Codex tasks. Do not change code,
deploy, send messages, or export client data.

Prepare an export request for the selected proposal, but do not export or send
client data until Sopheap approves.

## Example Request

```bash
curl -X POST https://your-app.vercel.app/api/orchestrator/create-package \
  -H "Authorization: Bearer $ORCHESTRATOR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "courseTitle": "AI Skills for Managers",
    "audience": "25 managers",
    "duration": "2 days",
    "client": "Cambodian bank",
    "promise": "Managers leave with practical AI use cases and a 30-day adoption plan",
    "context": "Banking operations, service quality, risk and governance",
    "tone": "Executive, practical, Cambodia corporate training"
  }'
```

Response includes a saved draft package and an approval request for review.

## Example Loop Request

```bash
curl -X POST https://your-app.vercel.app/api/loops/run \
  -H "Authorization: Bearer $ORCHESTRATOR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "loopType": "weekly_pipeline_review",
    "input": {
      "requestedBy": "OpenClaw",
      "note": "Internal weekly operating review"
    }
  }'
```

The response includes the saved loop run, summary, recommendations, and output.
It does not execute any external action.
