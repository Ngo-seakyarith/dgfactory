# DG Academy Training Factory

Standalone Next.js application for creating DG Academy training packages, importing external syllabuses, preparing delivery, managing clients and pipeline work, and producing intelligent system proposals.

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

Supabase is required for persisted production behavior. The authoritative schema snapshot is [`schema.sql`](schema.sql), with a browser-friendly mirror in [`database-schema-visual.html`](database-schema-visual.html).

The retained database surface is deliberately small: profiles, clients, client projects, training packages, syllabus imports, intelligent system proposals and files, delivery projects and tasks, delivery materials, evaluation forms and responses, generation jobs, and audit logs.

Delivery material content is normalized in `public.delivery_materials`, with one row per delivery project and material type. The composite primary key `(delivery_project_id, material_type)` allows Slides, Workbook, Facilitator Guide, and Prompt Library jobs to save independently. `public.generation_jobs` remains the source of generation status.

The legacy `delivery_projects.materials` JSON column is retained temporarily as a compatibility snapshot. Database triggers synchronize both representations during rollout and rollback. New application code reads and writes `delivery_materials`; a later migration can remove the triggers and legacy column after all deployed versions use the normalized table.

The Clients & Pipeline workspace at `/pipeline` groups training and system work beneath each client. Client contact and relationship details and individual work stages, target/actual USD values, payment dates, timing, and notes are edited inline. Each linked proposal appears once. The database keeps company records in `clients` and independent training/system records in `client_projects`; account ownership comes from `clients.account_owner`. Work without an assigned client remains accessible. Old client and project URLs redirect into this workspace. Actual revenue and payment dates are entered manually; a contract does not imply payment.

Projects and proposals share five stages: Prospects, Warm, Hot, Contracted, and Delivered. One project can link one training or intelligent-system proposal. Proposal generation from a project carries its ID through draft save and inherits the project's stage; standalone proposals create project records automatically. The server-only `track_client_proposal` function serializes linking and prevents duplicates. Database triggers keep linked projects synchronized when a proposal or delivery changes. Existing proposals are backfilled without deleting records; spreadsheet data is not automatically imported.

Generated training packages create Delivery only when Contracted. Contracted drafts create Delivery after successful generation. Delivered training and reopened deliveries update their linked proposal and project together. A delivery must be deleted before its training project can leave Contracted or Delivered. Intelligent-system proposals have no training Delivery. Project deletion never deletes proposals or deliveries; delete its linked proposal first. Unlinked Delivered projects cannot create another proposal.

Project queries use the `client-projects` TanStack Query key family. Proposal, client, delivery, and project mutations invalidate these caches. Project edits use the existing debounced autosave, with editable fields kept in React state.

Clients & Pipeline uses TanStack Table for client sorting, combined search/owner/stage filtering, detail expansion, optional columns, and client-level pagination. Client IDs remain stable row keys; previously visited editors remain mounted while filtered or paginated out, preserving unsaved drafts. Autosave and background refetches do not reset the page or expansion state. Incoming bookmarks and newly created records reveal their containing page. Mobile uses a two-column summary without overwriting desktop column preferences.

## Intelligent System Proposals

`/solution-proposals` creates proposals for websites, web applications, internal systems, customer portals, e-commerce, data systems, and AI-enabled systems. Client, project title, and solution type are searchable columns; evolving discovery requirements remain in the existing `brief` JSONB column.

The workflow is Project Brief, Solution Review, then Proposal. Solution Review works from the brief alone. Excel and CSV uploads are optional supporting evidence for data-heavy projects and remain private in the `solution-proposal-inputs` Supabase Storage bucket. The Brain Layer receives only deterministic profiles and masked samples, never complete raw rows.

Background tasks use `solution_review` and `solution_proposal`. The proposal task returns strict, Zod-validated semantic JSON rather than Markdown, HTML, or Word XML. Paragraphs, lists, capabilities, and implementation phases form one document model shared by the browser preview, copy action, and DOCX export. Commercial terms, cover details, DG Academy branding, and the authorized signatory are added deterministically after generation, so the model cannot invent them.

The DOCX exporter patches semantic Word paragraphs into `public/document-templates/digital-solution-proposal.docx`. This keeps the document editable in Microsoft Word while the template owns branding, cover layout, footer, and signature. Existing fixed-shape proposal JSON is normalized to the current document model when loaded, so no database migration is required. Regenerate the checked-in template with `bun run generate:document-templates` and run the focused export check with `bun run verify:digital-solution-docx`.

Existing `/system-proposals` browser links redirect to the renamed feature.

## Proposal From Syllabus

`/packages/from-syllabus` accepts one English `.docx`, `.pptx`, or text-based `.pdf` syllabus up to 10 MB. The server normalizes Word headings, paragraphs, lists, tables, headers, and footers; PowerPoint slide text, tables, and speaker notes; and readable PDF page text into the same source-block contract before the existing background generation job runs.

Images are ignored. Legacy Office files, macro-enabled files, encrypted documents, corrupted files, scanned PDFs, and image-only PDFs are rejected with a readable error. Uploaded source files remain private in the `syllabus-proposal-inputs` Supabase Storage bucket and follow the existing import cleanup lifecycle.

## Markdown Rendering

Markdown previews, Markdown-based DOCX materials and reports, and legacy proposal/slide readers share TanStack Markdown parsing through `src/lib/markdown.ts`. The React renderer and DOCX adapter consume the same semantic nodes for headings, nested lists, tables, and inline formatting. Raw HTML is disabled, unsafe links are removed, remote images remain text labels, and leading DG material metadata stays hidden.

Structured training proposals, intelligent-system proposals, and version-2 slide/material plans keep their existing schemas, stored markers, and branded exporters. TanStack Markdown is pinned to `0.0.15` while its API is pre-1.0; parser and export regression tests should pass before upgrading it.

## Brain Layer

All AI generation routes through `src/lib/brain`. Agent instructions and strict Zod output schemas are version-controlled with the application; the runtime does not resolve prompts from database tables. Deterministic code remains responsible for pricing, client matching, trainer profiles, document structure, branding, and exports.

Long-running package, syllabus-import, solution-proposal, delivery-material, evaluation-question, and delivery-report generation uses `public.generation_jobs`. Jobs persist progress and errors independently of the browser page so users can navigate away and return without cancelling work.

## Product Routes

- `/pipeline` is the default workspace and shows projects in board or table views; `/pipeline/new` and `/pipeline/[id]` create and edit projects.
- `/dashboard` uses TanStack Charts for monthly training fees and project-stage counts, reusing the existing package, delivery, and project queries. Delivered and Contracted fees stay separate; these are proposal fees, not payment records. Monthly grouping uses the Delivery training date, or an exact ISO proposal training date when no Delivery date is recorded. Ambiguous or missing dates appear separately and never fall back to creation/update timestamps. Year selection, typed chart tooltips, focus summaries, and month selection retain the original training rows.
- `/packages` and `/packages/from-syllabus` manage training packages and external syllabus imports.
- `/delivery` manages preparation, materials, pre/post-training evaluation forms, responses, and reports.
- `/solution-proposals` manages intelligent system discovery and proposals.
- `/clients` manages contacts, account ownership, relationship history, next actions, projects, and linked package and system-proposal records.
- `/evaluate/[token]` is the public, token-protected participant evaluation route.

Authentication uses Google sign-in through Supabase. A profile remains `Pending` until an internal operator changes its access state to `Approved`; only approved users can access internal product routes.
