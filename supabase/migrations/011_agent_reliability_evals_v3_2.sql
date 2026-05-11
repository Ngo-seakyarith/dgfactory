create table if not exists public.eval_datasets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  target_agent text not null check (
    target_agent in (
      'course_package',
      'proposal',
      'pricing_narrative',
      'slide_outline',
      'workbook',
      'follow_up',
      'delivery_report',
      'qa_review',
      'improvement_suggestion'
    )
  ),
  status text not null default 'Draft' check (
    status in ('Draft', 'Active', 'Archived')
  ),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.eval_datasets enable row level security;

create table if not exists public.eval_examples (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.eval_datasets(id) on delete cascade,
  input jsonb not null default '{}'::jsonb,
  expected_output_summary text,
  rubric jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}'::text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.eval_examples enable row level security;

create table if not exists public.eval_runs (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid references public.eval_datasets(id) on delete set null,
  target_agent text not null check (
    target_agent in (
      'course_package',
      'proposal',
      'pricing_narrative',
      'slide_outline',
      'workbook',
      'follow_up',
      'delivery_report',
      'qa_review',
      'improvement_suggestion'
    )
  ),
  model_name text not null default 'mock',
  status text not null default 'Running' check (
    status in ('Running', 'Completed', 'Failed')
  ),
  average_score numeric not null default 0,
  started_at timestamptz default now(),
  completed_at timestamptz,
  summary text
);

alter table public.eval_runs enable row level security;

create table if not exists public.eval_results (
  id uuid primary key default gen_random_uuid(),
  eval_run_id uuid not null references public.eval_runs(id) on delete cascade,
  eval_example_id uuid references public.eval_examples(id) on delete set null,
  score numeric not null default 0,
  passed boolean not null default false,
  strengths text[] not null default '{}'::text[],
  weaknesses text[] not null default '{}'::text[],
  regression_risk text not null default '',
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.eval_results enable row level security;

create table if not exists public.agent_traces (
  id uuid primary key default gen_random_uuid(),
  workflow_id text,
  agent_name text not null,
  task_type text not null check (
    task_type in (
      'course_package',
      'proposal',
      'pricing_narrative',
      'slide_outline',
      'workbook',
      'follow_up',
      'delivery_report',
      'qa_review',
      'improvement_suggestion'
    )
  ),
  input_summary text not null default '',
  output_summary text not null default '',
  status text not null default 'Completed' check (
    status in ('Completed', 'Failed', 'Mock')
  ),
  duration_ms numeric,
  created_at timestamptz default now()
);

alter table public.agent_traces enable row level security;

create index if not exists idx_eval_datasets_target_agent
  on public.eval_datasets(target_agent);

create index if not exists idx_eval_datasets_status
  on public.eval_datasets(status);

create index if not exists idx_eval_examples_dataset_id
  on public.eval_examples(dataset_id);

create index if not exists idx_eval_examples_tags
  on public.eval_examples using gin(tags);

create index if not exists idx_eval_runs_dataset_id
  on public.eval_runs(dataset_id);

create index if not exists idx_eval_runs_started_at
  on public.eval_runs(started_at desc);

create index if not exists idx_eval_results_run_id
  on public.eval_results(eval_run_id);

create index if not exists idx_eval_results_passed
  on public.eval_results(passed);

create index if not exists idx_agent_traces_workflow_id
  on public.agent_traces(workflow_id);

create index if not exists idx_agent_traces_agent_name
  on public.agent_traces(agent_name);

create index if not exists idx_agent_traces_created_at
  on public.agent_traces(created_at desc);
