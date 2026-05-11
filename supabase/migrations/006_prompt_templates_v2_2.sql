create table if not exists public.prompt_templates (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  version numeric not null default 1,
  title text not null,
  system_prompt text not null,
  user_prompt_template text not null,
  output_schema jsonb not null default '{}'::jsonb,
  status text not null default 'Draft' check (status in ('Draft', 'Active', 'Archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(agent_name, version)
);

alter table public.prompt_templates enable row level security;

create index if not exists idx_prompt_templates_agent_name
  on public.prompt_templates(agent_name);

create index if not exists idx_prompt_templates_status
  on public.prompt_templates(status);

create table if not exists public.prompt_template_changes (
  id uuid primary key default gen_random_uuid(),
  prompt_template_id uuid not null references public.prompt_templates(id) on delete cascade,
  old_version numeric not null default 0,
  new_version numeric not null,
  change_summary text not null,
  reason text not null default '',
  approved_by text,
  created_at timestamptz default now()
);

alter table public.prompt_template_changes enable row level security;

create index if not exists idx_prompt_template_changes_template_id
  on public.prompt_template_changes(prompt_template_id);
