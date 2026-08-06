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

Slide rows also store a compact `blueprint` JSONB selection containing the training type and included content preset IDs. All presets for the inferred course type are selected by default, so slides can be generated immediately. Users only choose which content types to include. The Brain Layer reads the saved package syllabus and decides module names, objectives, sequence, slide titles, slide count, and timing. AI training presets follow practical DG Academy patterns such as prompt frameworks, weak-to-strong examples, live demonstrations, guided practice, output verification, role labs, reusable prompt cards, and workflow canvases. Preset generation guidance stays server-side and is not stored in the blueprint.

The legacy `delivery_projects.materials` JSON column is retained temporarily as a compatibility snapshot. Database triggers synchronize both representations during rollout and rollback. New application code reads and writes `delivery_materials`; a later migration can remove the triggers and legacy column after all deployed versions use the normalized table.
