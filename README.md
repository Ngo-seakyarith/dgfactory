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

Each saved training package is linked to one CRM opportunity through `opportunities.linked_package_id`. Generated packages also link their delivery project to that opportunity. Pipeline and Delivery share one status list, and changing either linked record synchronizes the other.

## Proposal From Syllabus

`/packages/from-syllabus` accepts one English `.docx`, `.pptx`, or text-based `.pdf` syllabus up to 10 MB. The server normalizes Word headings, paragraphs, lists, tables, headers, and footers; PowerPoint slide text, tables, and speaker notes; and readable PDF page text into the same source-block contract before the existing background generation job runs.

Images are ignored. Legacy Office files, macro-enabled files, encrypted documents, corrupted files, scanned PDFs, and image-only PDFs are rejected with a readable error. Uploaded source files remain private in the `syllabus-proposal-inputs` Supabase Storage bucket and follow the existing import cleanup lifecycle.
