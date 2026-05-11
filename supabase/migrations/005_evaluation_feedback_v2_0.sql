create table if not exists public.output_evaluations (
  id uuid primary key default gen_random_uuid(),
  package_id uuid references public.training_packages(id) on delete set null,
  delivery_project_id uuid references public.delivery_projects(id) on delete set null,
  output_type text not null check (
    output_type in (
      'syllabus',
      'proposal',
      'deck',
      'workbook',
      'commercial_proposal',
      'follow_up_email',
      'delivery_report',
      'full_package'
    )
  ),
  score numeric not null default 0 check (score >= 0 and score <= 100),
  reviewer_type text not null check (
    reviewer_type in (
      'AI_QA',
      'Sopheap',
      'Trainer',
      'Client',
      'Learner',
      'Internal Team'
    )
  ),
  feedback text not null default '',
  strengths text[] not null default '{}'::text[],
  weaknesses text[] not null default '{}'::text[],
  improvement_suggestions text[] not null default '{}'::text[],
  risks text[] not null default '{}'::text[],
  created_at timestamptz default now()
);

alter table public.output_evaluations enable row level security;

create index if not exists idx_output_evaluations_package_id
  on public.output_evaluations(package_id);

create index if not exists idx_output_evaluations_delivery_project_id
  on public.output_evaluations(delivery_project_id);

create index if not exists idx_output_evaluations_output_type
  on public.output_evaluations(output_type);

create index if not exists idx_output_evaluations_created_at
  on public.output_evaluations(created_at desc);

create table if not exists public.prompt_improvement_suggestions (
  id uuid primary key default gen_random_uuid(),
  source_evaluation_id uuid references public.output_evaluations(id) on delete set null,
  target_agent text not null,
  current_prompt_summary text not null default '',
  suggested_change text not null,
  reason text not null default '',
  status text not null default 'Suggested' check (
    status in ('Suggested', 'Approved', 'Rejected', 'Implemented')
  ),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.prompt_improvement_suggestions enable row level security;

create index if not exists idx_prompt_improvement_suggestions_status
  on public.prompt_improvement_suggestions(status);

create index if not exists idx_prompt_improvement_suggestions_evaluation
  on public.prompt_improvement_suggestions(source_evaluation_id);
