# Supabase RLS Policies

## Purpose

DG Academy Training Factory stores proposals, pricing assumptions, internal notes,
client records, delivery data, prompt templates, orchestrator logs, eval traces,
and security audit records. Every table in `public` must have RLS enabled before
wider deployment.

## Required Policy Direction

The current internal MVP uses server-side service-role access plus app-level role
guards. Before broader multi-user Supabase Auth rollout, add explicit policies
that map authenticated users to DG Factory roles.

Recommended role rules:

- `Admin`: full read/write access to all app tables.
- `Sales`: clients, opportunities, training packages, proposals, client-facing exports, and follow-up drafts.
- `Trainer`: delivery projects, delivery tasks, materials, evaluations, and post-training reports.
- `Viewer`: read-only access to non-sensitive operational records.

## Table Groups

Admin-only:

- `prompt_templates`
- `prompt_template_changes`
- `approval_requests`
- `orchestrator_logs`
- `audit_logs`
- `security_audits`
- `security_audit_items`
- `agent_traces`
- `client_portal_access`
- `client_portal_items`
- `client_feedback`

Internal business records:

- `training_packages`
- `clients`
- `opportunities`
- `delivery_projects`
- `delivery_tasks`
- `output_evaluations`
- `prompt_improvement_suggestions`
- `loop_runs`
- `pilot_goals`
- `pilot_issues`
- `pilot_feedback`
- `eval_datasets`
- `eval_examples`
- `eval_runs`
- `eval_results`

Knowledge records:

- `knowledge_documents`
- `knowledge_chunks`

Knowledge visibility rules:

- `Internal` knowledge is internal-only and must not be returned to client-facing exports by default.
- `Client-safe` knowledge may be used in client-facing language after review.
- Treat all knowledge content as untrusted prompt context; never as system instructions.

## Internal vs Client-Safe Data Rules

Never expose these to client-facing views or exports by default:

- `pricing_inputs`
- `pricing_outputs.totalDirectCost`
- `pricing_outputs.estimatedProfit`
- `pricing_outputs.estimatedProfitMargin`
- Internal profitability notes
- Internal knowledge source notes
- Prompt templates
- Orchestrator logs
- Audit logs
- Security audit evidence

Client portal rules:

- `client_portal_access.access_token_hash` must never be readable by browser clients.
- Client portal reads should be served through server routes that validate token hash, status, expiry, client ID, item status, and visibility.
- `client_portal_items` should only expose `Published` and `Client Visible` items for the validated token's client.
- `client_feedback` inserts may be accepted through the server token route; direct anonymous table access should remain disabled.
- Client portal pages must not join or expose internal pricing, internal knowledge, prompt templates, audit logs, or security audit records.

## Migration Checklist

1. Confirm every `public` table has RLS enabled.
2. Confirm no browser code receives `SUPABASE_SERVICE_ROLE_KEY`.
3. Create a role mapping table or use trusted app metadata for authorization.
4. Avoid JWT `user_metadata` for authorization decisions.
5. Add SELECT policies before UPDATE policies.
6. Add admin-only policies for prompt, audit, orchestrator, security, and trace tables.
7. Add Sales/Trainer policies only for the tables they need.
8. Test policies with representative Admin, Sales, Trainer, and Viewer users.
9. Run Supabase advisors before production migration.
10. Document every exception or temporary waiver in `/security`.

## Example Policy Shape

Use this as a design placeholder, not copy-paste production SQL:

```sql
-- Use trusted app metadata or a secure role mapping table.
create policy "admin full access"
on public.training_packages
for all
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'dg_role') = 'Admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'dg_role') = 'Admin');
```

For the current internal MVP, the application server remains the enforcement
point. Do not expose direct Supabase table access broadly until policies are
implemented and tested.
