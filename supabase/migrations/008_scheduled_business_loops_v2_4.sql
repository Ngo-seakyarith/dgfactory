create table if not exists public.loop_runs (
  id uuid primary key default gen_random_uuid(),
  loop_type text not null check (
    loop_type in (
      'weekly_pipeline_review',
      'weekly_content_ideas',
      'monthly_revenue_summary',
      'quality_improvement_review',
      'delivery_readiness_check',
      'stale_opportunity_follow_up',
      'prompt_improvement_review'
    )
  ),
  status text not null default 'Running' check (
    status in ('Running', 'Completed', 'Failed')
  ),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  summary text not null default '',
  recommendations text[] not null default '{}'::text[],
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.loop_runs enable row level security;

create index if not exists idx_loop_runs_loop_type
  on public.loop_runs(loop_type);

create index if not exists idx_loop_runs_status
  on public.loop_runs(status);

create index if not exists idx_loop_runs_created_at
  on public.loop_runs(created_at desc);
