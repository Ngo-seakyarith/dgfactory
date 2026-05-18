create table if not exists public.training_packages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  audience text not null,
  duration text not null,
  client text not null,
  promise text not null,
  context text,
  tone text,
  syllabus text not null,
  proposal text not null,
  commercial_proposal text not null default '',
  deck_outline text not null,
  workbook text not null,
  follow_up_email text not null,
  quality_checklist jsonb not null default '[]'::jsonb,
  pricing_inputs jsonb not null default '{}'::jsonb,
  pricing_outputs jsonb not null default '{}'::jsonb,
  generation_mode text default 'openai' check (generation_mode in ('openai')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.training_packages enable row level security;

create index if not exists idx_training_packages_updated_at
  on public.training_packages(updated_at desc);

create index if not exists idx_training_packages_client
  on public.training_packages(client);
