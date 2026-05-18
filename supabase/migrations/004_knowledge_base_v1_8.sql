alter table public.training_packages
  add column if not exists knowledge_used jsonb not null default '[]'::jsonb;

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'Other' check (
    type in (
      'Framework',
      'Proposal',
      'Case Study',
      'Exercise',
      'Pricing Note',
      'Sector Insight',
      'Client Note',
      'SOP',
      'Prompt Template',
      'Other'
    )
  ),
  content text not null,
  tags text[] not null default '{}'::text[],
  source text,
  visibility text not null default 'Internal' check (visibility in ('Internal', 'Client-safe')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.knowledge_documents enable row level security;

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  chunk_index numeric not null default 0,
  content text not null,
  -- Stored as JSON until pgvector is enabled in the target Supabase project.
  embedding jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.knowledge_chunks enable row level security;

create index if not exists idx_knowledge_documents_updated_at
  on public.knowledge_documents(updated_at desc);

create index if not exists idx_knowledge_documents_type
  on public.knowledge_documents(type);

create index if not exists idx_knowledge_documents_visibility
  on public.knowledge_documents(visibility);

create index if not exists idx_knowledge_documents_tags
  on public.knowledge_documents using gin(tags);

create index if not exists idx_knowledge_chunks_document_id
  on public.knowledge_chunks(document_id);
