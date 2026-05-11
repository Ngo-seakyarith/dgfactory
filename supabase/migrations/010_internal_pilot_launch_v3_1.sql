alter table public.loop_runs drop constraint if exists loop_runs_loop_type_check;

alter table public.loop_runs
  add constraint loop_runs_loop_type_check check (
    loop_type in (
      'weekly_pipeline_review',
      'weekly_content_ideas',
      'monthly_revenue_summary',
      'quality_improvement_review',
      'delivery_readiness_check',
      'stale_opportunity_follow_up',
      'prompt_improvement_review',
      'pilot_weekly_review'
    )
  );

create table if not exists public.pilot_goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  target_number numeric not null default 0,
  current_number numeric not null default 0,
  status text not null default 'At Risk' check (
    status in ('On Track', 'At Risk', 'Completed')
  ),
  notes text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.pilot_goals enable row level security;

create table if not exists public.pilot_issues (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  severity text not null default 'Medium' check (
    severity in ('Low', 'Medium', 'High', 'Critical')
  ),
  status text not null default 'Open' check (
    status in ('Open', 'In Review', 'Fixed', 'Won''t Fix', 'Closed')
  ),
  related_page text,
  related_package_id uuid,
  related_opportunity_id uuid,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.pilot_issues enable row level security;

create table if not exists public.pilot_feedback (
  id uuid primary key default gen_random_uuid(),
  rating numeric not null default 3 check (rating >= 1 and rating <= 5),
  what_worked text not null default '',
  what_was_confusing text not null default '',
  what_should_improve text not null default '',
  urgency text not null default 'Medium' check (
    urgency in ('Low', 'Medium', 'High', 'Critical')
  ),
  related_feature text not null default '',
  related_page text,
  related_package_id uuid,
  related_opportunity_id uuid,
  created_by text,
  created_at timestamptz default now()
);

alter table public.pilot_feedback enable row level security;

create index if not exists idx_pilot_goals_status
  on public.pilot_goals(status);

create index if not exists idx_pilot_issues_status
  on public.pilot_issues(status);

create index if not exists idx_pilot_issues_severity
  on public.pilot_issues(severity);

create index if not exists idx_pilot_issues_updated_at
  on public.pilot_issues(updated_at desc);

create index if not exists idx_pilot_feedback_created_at
  on public.pilot_feedback(created_at desc);

create index if not exists idx_pilot_feedback_related_package
  on public.pilot_feedback(related_package_id);
