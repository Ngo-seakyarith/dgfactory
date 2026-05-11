do $$
declare
  constraint_name text;
begin
  select conname
    into constraint_name
  from pg_constraint
  where conrelid = 'public.loop_runs'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%weekly_pipeline_review%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.loop_runs drop constraint %I', constraint_name);
  end if;
end $$;

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
      'pilot_weekly_review',
      'weekly_market_sensing',
      'weekly_offer_mutation',
      'weekly_experiment_review',
      'weekly_selection_review',
      'weekly_replication_review',
      'monthly_learning_genome_update',
      'quarterly_expansion_strategy'
    )
  );

create table if not exists public.improvement_opportunities (
  id uuid primary key default gen_random_uuid(),
  source_type text not null default 'Other' check (
    source_type in (
      'User Feedback',
      'Pilot Issue',
      'QA Review',
      'Security Audit',
      'Failed Export',
      'Failed Offer',
      'Winning Offer',
      'OpenClaw Loop',
      'Learning Genome',
      'Eval Failure',
      'Other'
    )
  ),
  source_id uuid,
  title text not null,
  description text not null default '',
  category text not null default 'Other' check (
    category in (
      'Product Feature',
      'Bug Fix',
      'Prompt Improvement',
      'Template Improvement',
      'Agent Improvement',
      'UX Improvement',
      'Security Improvement',
      'Business Model Improvement',
      'Documentation',
      'Other'
    )
  ),
  priority numeric not null default 3,
  status text not null default 'Suggested' check (
    status in (
      'Suggested',
      'Approved',
      'Converted to PRD',
      'Sent to Codex',
      'Implemented',
      'Rejected'
    )
  ),
  recommended_action text not null default '',
  codex_prompt text,
  suggested_files text[] not null default '{}'::text[],
  acceptance_criteria text[] not null default '{}'::text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.improvement_opportunities enable row level security;

create index if not exists idx_improvement_opportunities_status
  on public.improvement_opportunities(status);

create index if not exists idx_improvement_opportunities_source_type
  on public.improvement_opportunities(source_type);

create index if not exists idx_improvement_opportunities_priority
  on public.improvement_opportunities(priority);
