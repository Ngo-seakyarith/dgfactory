# Supabase RLS Verification

This document verifies the V3.6 production security foundation for DG Academy AI Training Production Factory.

## Migration

Concrete RLS policies live in:

- `supabase/migrations/016_enterprise_auth_rls_hardening_v3_6.sql`

The migration adds:

- `organizations`
- `profiles`
- `organization_memberships`
- `organization_id` columns on core business, agentic, eval, approval, and growth tables
- helper functions:
  - `current_org_id()`
  - `has_org_role(role_name text)`
  - `is_admin()`
  - `can_view_internal_notes()`
  - `can_view_margin()`

## Protected Tables

The migration enables RLS and creates concrete policies for:

- `profiles`
- `organizations`
- `organization_memberships`
- `clients`
- `opportunities`
- `training_packages`
- `delivery_projects`
- `knowledge_documents`
- `knowledge_chunks`
- `prompt_templates`
- `approval_requests`
- `audit_logs`
- `loop_runs`
- `market_signals`
- `offer_variants`
- `growth_experiments`
- `experiment_metrics`
- `selection_decisions`
- `learning_genome_items`
- `improvement_opportunities`
- `eval_datasets`
- `eval_examples`
- `eval_runs`
- `eval_results`

## Role Policy Summary

Admin:

- Can access rows inside the assigned organization.
- Can manage prompt templates, approvals, audit logs, evals, loops, and selection decisions.
- Can view internal notes and margin helper-gated data.

Sales:

- Can access clients, opportunities, training packages, market signals, offers, experiments, and experiment metrics inside the assigned organization.
- Cannot manage prompt templates, approval decisions, audit logs, or eval datasets.

Trainer:

- Can access delivery projects, training packages, knowledge documents, knowledge chunks, and learning genome items inside the assigned organization.
- Cannot access prompt templates, approval decisions, audit logs, or internal pricing controls.

Viewer:

- Has read-only access to allowed operational records inside the assigned organization.
- Knowledge access is limited to `Client-safe` documents and chunks.
- Cannot write or approve.

## Cross-Organization Protection

Every protected business table has an `organization_id`.

Policies require:

```sql
organization_id = public.current_org_id()
```

This blocks access to another organization's rows for browser/API users relying on Supabase Auth JWT context.

## Internal Data Protection

- Prompt templates are admin-only.
- Approval requests are admin-only.
- Audit logs are admin-read only.
- Viewer knowledge access is limited to `Client-safe`.
- Client exports are still protected in application code by `src/lib/security/exportSafety.ts`.
- Internal margin and notes protection is enforced through server-side export rules and helper functions. Postgres RLS is row-level, so column-level margin hiding should use server routes, restricted views, or separate internal-only tables if DG Academy later stores margin fields directly in Supabase columns.

## Orchestrator and Service Role

- Browser code must never receive `SUPABASE_SERVICE_ROLE_KEY`.
- OpenClaw/orchestrator endpoints use API-key auth and server-side code only.
- Risky orchestrator actions must create approval requests before execution.

## Manual Verification Checklist

1. Apply migrations in a Supabase staging project.
2. Create two organizations.
3. Create one user membership per role: Admin, Sales, Trainer, Viewer.
4. Verify each role can read/write only the table groups above.
5. Verify cross-organization reads return no rows.
6. Verify Viewer cannot read `Internal` knowledge documents.
7. Verify non-admin users cannot read or write `prompt_templates`.
8. Verify non-admin users cannot read `audit_logs`.
9. Verify selection decisions can be written only by Admin.
10. Verify app export endpoints still block internal notes and margin language by default.

## Known Limitations

- Local development still supports fallback storage when Supabase is not configured.
- Middleware can require a Supabase session cookie, but full production deployment should validate sessions and memberships on every sensitive server route before relying on browser Supabase access.
- Column-level internal margin protection is enforced by app/export rules in this version; move sensitive margins to admin-only tables or views if storing detailed margins in Supabase becomes required.
