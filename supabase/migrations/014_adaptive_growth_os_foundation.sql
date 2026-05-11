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
