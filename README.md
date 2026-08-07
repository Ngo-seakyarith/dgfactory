# DG Academy Training Factory

Standalone Next.js application for creating and operating DG Academy training packages and delivery projects.

## Development

Use Bun for dependency management and project scripts:

```bash
bun install --frozen-lockfile
bun run dev
```

Before handing off production changes, run:

```bash
bun run lint
bun run typecheck
bun run build
```

## Database

Supabase is required for persisted production behavior. The bootstrap schema is in `schema.sql`, and incremental production migrations are stored in `supabase/migrations`.

Delivery material content is normalized in `public.delivery_materials`, with one row per delivery project and material type. The composite primary key `(delivery_project_id, material_type)` allows Slides, Workbook, Facilitator Guide, and Prompt Library jobs to save independently. `public.generation_jobs` remains the source of generation status.

The legacy `delivery_projects.materials` JSON column is retained temporarily as a compatibility snapshot. Database triggers synchronize both representations during rollout and rollback. New application code reads and writes `delivery_materials`; a later migration can remove the triggers and legacy column after all deployed versions use the normalized table.

Each saved training package is linked to one CRM opportunity through `opportunities.linked_package_id`. Generated packages also link their delivery project to that opportunity. Delivery can advance an early opportunity to `Proposal Sent`, but `Won` remains a human sales decision.
