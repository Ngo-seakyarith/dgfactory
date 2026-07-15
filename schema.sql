-- Auth and app access.

create type public.user_access_status as enum ('Pending', 'Approved');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  access_status public.user_access_status not null default 'Pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url, access_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    'Pending'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sector text,
  contact_person text,
  email text,
  phone text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.clients enable row level security;

create table if not exists public.training_packages (
  id uuid primary key default gen_random_uuid(),
  course_title text not null,
  target_learners text not null,
  duration text not null,
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null,
  program_goal text not null,
  special_requirements text,
  syllabus text not null,
  proposal_content jsonb not null,
  proposal_brief jsonb not null default '{}'::jsonb,
  pricing_inputs jsonb not null default '{}'::jsonb,
  knowledge_used jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.training_packages enable row level security;

create index if not exists idx_training_packages_updated_at
  on public.training_packages(updated_at desc);

create index if not exists idx_training_packages_client_name
  on public.training_packages(client_name);

create index if not exists idx_training_packages_client_id
  on public.training_packages(client_id);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  training_need text,
  estimated_value numeric default 0,
  status text not null default 'Lead' check (
    status in (
      'Lead',
      'Discovery',
      'Proposal Draft',
      'Proposal Sent',
      'Negotiation',
      'Won',
      'Lost',
      'Dormant'
    )
  ),
  probability_percent numeric default 25,
  expected_close_date date,
  next_follow_up_date date,
  notes text,
  linked_package_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.opportunities enable row level security;

create index if not exists idx_clients_updated_at
  on public.clients(updated_at desc);

create unique index if not exists idx_clients_normalized_name_unique
  on public.clients(lower(btrim(name)));

create index if not exists idx_opportunities_status
  on public.opportunities(status);

create index if not exists idx_opportunities_client_id
  on public.opportunities(client_id);

create index if not exists idx_opportunities_follow_up
  on public.opportunities(next_follow_up_date);

create index if not exists idx_opportunities_linked_package
  on public.opportunities(linked_package_id);

create table if not exists public.delivery_projects (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references public.opportunities(id) on delete set null,
  package_id uuid references public.training_packages(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  delivery_status text not null default 'Planning' check (
    delivery_status in (
      'Planning',
      'Materials Preparation',
      'Confirmed',
      'Delivered',
      'Report Sent',
      'Completed',
      'Cancelled'
    )
  ),
  training_date date,
  location text,
  trainer_name text,
  participant_count numeric default 0,
  notes text,
  evaluation jsonb not null default '{}'::jsonb,
  post_training_report text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.delivery_projects enable row level security;

create table if not exists public.delivery_tasks (
  id uuid primary key default gen_random_uuid(),
  delivery_project_id uuid not null references public.delivery_projects(id) on delete cascade,
  title text not null,
  category text not null default 'Materials' check (
    category in (
      'Client Confirmation',
      'Materials',
      'Logistics',
      'Trainer Preparation',
      'Attendance',
      'Evaluation',
      'Certificates',
      'Post-training Report',
      'Follow-up'
    )
  ),
  status text not null default 'Open' check (status in ('Open', 'In Progress', 'Done')),
  due_date date,
  owner text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.delivery_tasks enable row level security;

create index if not exists idx_delivery_projects_status
  on public.delivery_projects(delivery_status);

create index if not exists idx_delivery_projects_training_date
  on public.delivery_projects(training_date);

create index if not exists idx_delivery_projects_client_id
  on public.delivery_projects(client_id);

create index if not exists idx_delivery_projects_opportunity_id
  on public.delivery_projects(opportunity_id);

create index if not exists idx_delivery_tasks_project_id
  on public.delivery_tasks(delivery_project_id);

create index if not exists idx_delivery_tasks_status
  on public.delivery_tasks(status);

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

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by text not null,
  action_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'Pending' check (
    status in ('Pending', 'Approved', 'Rejected', 'Expired')
  ),
  risk_level text not null default 'Medium' check (
    risk_level in ('Low', 'Medium', 'High')
  ),
  human_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.approval_requests enable row level security;

create index if not exists idx_approval_requests_status
  on public.approval_requests(status);

create index if not exists idx_approval_requests_created_at
  on public.approval_requests(created_at desc);

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

create table if not exists public.improvement_opportunities (
  id uuid primary key default gen_random_uuid(),
  source_type text not null default 'Other' check (
    source_type in (
      'User Feedback',
      'Pilot Issue',
      'QA Review',
      'Failed Export',
      'Failed Offer',
      'Winning Offer',
      'Business Loop',
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
      'improvement_suggestion',
      'offer_mutation',
      'offer_replication',
      'improvement_opportunity',
      'adaptive_growth_recommendations',
      'master_workflow',
      'market_sensing',
      'experiment_design',
      'fitness_evaluation',
      'selection_recommendation',
      'expansion_strategy',
      'learning_genome',
      'extinction_recommendation'
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
      'improvement_suggestion',
      'offer_mutation',
      'offer_replication',
      'improvement_opportunity',
      'adaptive_growth_recommendations',
      'master_workflow',
      'market_sensing',
      'experiment_design',
      'fitness_evaluation',
      'selection_recommendation',
      'expansion_strategy',
      'learning_genome',
      'extinction_recommendation'
    )
  ),
  model_name text not null default '',
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
      'improvement_suggestion',
      'offer_mutation',
      'offer_replication',
      'improvement_opportunity',
      'adaptive_growth_recommendations',
      'master_workflow',
      'market_sensing',
      'experiment_design',
      'fitness_evaluation',
      'selection_recommendation',
      'expansion_strategy',
      'learning_genome',
      'extinction_recommendation'
    )
  ),
  input_summary text not null default '',
  output_summary text not null default '',
  status text not null default 'Completed' check (
    status in ('Completed', 'Failed')
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

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  entity_type text not null,
  entity_id text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.audit_logs enable row level security;

create index if not exists idx_audit_logs_actor
  on public.audit_logs(actor);

create index if not exists idx_audit_logs_action
  on public.audit_logs(action);

create index if not exists idx_audit_logs_entity
  on public.audit_logs(entity_type, entity_id);

create index if not exists idx_audit_logs_created_at
  on public.audit_logs(created_at desc);

create table if not exists public.client_portal_access (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  contact_email text not null,
  access_token_hash text not null unique,
  status text not null default 'Active' check (
    status in ('Active', 'Revoked', 'Expired')
  ),
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.client_portal_access enable row level security;

create table if not exists public.client_portal_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  item_type text not null check (
    item_type in (
      'Proposal',
      'Syllabus',
      'Training Plan',
      'Delivery Report',
      'Feedback Form',
      'Invoice Placeholder'
    )
  ),
  item_id uuid not null,
  title text not null,
  visibility text not null default 'Hidden' check (
    visibility in ('Client Visible', 'Hidden')
  ),
  status text not null default 'Draft' check (
    status in ('Draft', 'Published', 'Archived')
  ),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.client_portal_items enable row level security;

create table if not exists public.client_feedback (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  related_item_type text not null,
  related_item_id uuid not null,
  rating numeric,
  comments text not null default '',
  requested_changes text not null default '',
  decision_status text check (
    decision_status is null or
    decision_status in ('Reviewing', 'Needs Revision', 'Approved', 'Not Approved')
  ),
  next_step_preference text not null default '',
  created_at timestamptz default now()
);

alter table public.client_feedback enable row level security;

create index if not exists idx_client_portal_access_client_id
  on public.client_portal_access(client_id);

create index if not exists idx_client_portal_access_token_hash
  on public.client_portal_access(access_token_hash);

create index if not exists idx_client_portal_access_status
  on public.client_portal_access(status);

create index if not exists idx_client_portal_items_client_id
  on public.client_portal_items(client_id);

create index if not exists idx_client_portal_items_published
  on public.client_portal_items(client_id, status, visibility);

create index if not exists idx_client_portal_items_item
  on public.client_portal_items(item_type, item_id);

create index if not exists idx_client_feedback_client_id
  on public.client_feedback(client_id);

create index if not exists idx_client_feedback_related_item
  on public.client_feedback(related_item_type, related_item_id);

create index if not exists idx_client_feedback_created_at
  on public.client_feedback(created_at desc);
create table if not exists public.market_signals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  source_type text not null default 'Other' check (
    source_type in (
      'Client Conversation',
      'LinkedIn',
      'Competitor',
      'Policy',
      'News',
      'Internal Observation',
      'Training Feedback',
      'Sales Call',
      'Partner',
      'Other'
    )
  ),
  source_name text,
  sector text,
  audience text,
  urgency_score numeric,
  confidence_score numeric,
  tags text[] not null default '{}'::text[],
  status text not null default 'New' check (
    status in ('New', 'Reviewed', 'Converted to Offer', 'Archived')
  ),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.market_signals enable row level security;

create table if not exists public.offer_variants (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid references public.market_signals(id) on delete set null,
  title text not null,
  description text not null default '',
  target_audience text not null default '',
  sector text,
  format text not null default 'Workshop' check (
    format in (
      'Briefing',
      'Workshop',
      'Masterclass',
      'Online Cohort',
      'In-house Training',
      'Coaching Package',
      'Digital Product',
      'Consulting Package',
      'Other'
    )
  ),
  duration text,
  promise text not null default '',
  price_assumption numeric,
  status text not null default 'Draft' check (
    status in ('Draft', 'Testing', 'Selected', 'Iterating', 'Scaling', 'Parked', 'Killed')
  ),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.offer_variants enable row level security;

create table if not exists public.growth_experiments (
  id uuid primary key default gen_random_uuid(),
  offer_variant_id uuid not null references public.offer_variants(id) on delete cascade,
  hypothesis text not null default '',
  test_method text not null default '',
  channel text,
  start_date date,
  end_date date,
  success_criteria text not null default '',
  owner text,
  status text not null default 'Planned' check (
    status in ('Planned', 'Running', 'Completed', 'Paused', 'Cancelled')
  ),
  notes text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.growth_experiments enable row level security;

create table if not exists public.experiment_metrics (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.growth_experiments(id) on delete cascade,
  impressions numeric not null default 0,
  inquiries numeric not null default 0,
  meetings numeric not null default 0,
  proposals_sent numeric not null default 0,
  deals_won numeric not null default 0,
  revenue numeric not null default 0,
  estimated_margin numeric,
  delivery_quality_score numeric,
  client_interest_score numeric,
  strategic_fit_score numeric,
  reusability_score numeric,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.experiment_metrics enable row level security;

create table if not exists public.selection_decisions (
  id uuid primary key default gen_random_uuid(),
  offer_variant_id uuid not null references public.offer_variants(id) on delete cascade,
  experiment_id uuid references public.growth_experiments(id) on delete set null,
  decision text not null check (
    decision in ('Scale', 'Iterate', 'Park', 'Kill', 'Bundle', 'Partner', 'Productize')
  ),
  fitness_score numeric not null default 0,
  rationale text not null default '',
  next_action text not null default '',
  decided_by text,
  created_at timestamptz default now()
);

alter table public.selection_decisions enable row level security;

create table if not exists public.learning_genome_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'Other' check (
    type in (
      'Winning Pattern',
      'Failed Pattern',
      'Proposal Language',
      'Pricing Insight',
      'Client Objection',
      'Sector Insight',
      'Delivery Lesson',
      'Prompt Improvement',
      'Sales Message',
      'Training Activity',
      'Other'
    )
  ),
  content text not null default '',
  source_offer_variant_id uuid references public.offer_variants(id) on delete set null,
  source_experiment_id uuid references public.growth_experiments(id) on delete set null,
  tags text[] not null default '{}'::text[],
  confidence_score numeric,
  status text not null default 'Draft' check (
    status in ('Draft', 'Active', 'Archived')
  ),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.learning_genome_items enable row level security;

create index if not exists idx_market_signals_status on public.market_signals(status);
create index if not exists idx_market_signals_source_type on public.market_signals(source_type);
create index if not exists idx_market_signals_tags on public.market_signals using gin(tags);
create index if not exists idx_offer_variants_signal_id on public.offer_variants(signal_id);
create index if not exists idx_offer_variants_status on public.offer_variants(status);
create index if not exists idx_offer_variants_format on public.offer_variants(format);
create index if not exists idx_growth_experiments_offer_variant_id on public.growth_experiments(offer_variant_id);
create index if not exists idx_growth_experiments_status on public.growth_experiments(status);
create index if not exists idx_experiment_metrics_experiment_id on public.experiment_metrics(experiment_id);
create index if not exists idx_selection_decisions_offer_variant_id on public.selection_decisions(offer_variant_id);
create index if not exists idx_selection_decisions_fitness_score on public.selection_decisions(fitness_score desc);
create index if not exists idx_learning_genome_items_status on public.learning_genome_items(status);
create index if not exists idx_learning_genome_items_type on public.learning_genome_items(type);
create index if not exists idx_learning_genome_items_tags on public.learning_genome_items using gin(tags);
