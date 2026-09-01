+create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null,
  feature text not null,
  environment text not null check (environment in ('production', 'development')),
  model_id text not null,
  provider text not null,
  status text not null check (status in ('SUCCESS', 'ERROR')),
  attempt_number smallint not null default 1 check (attempt_number > 0),
  input_tokens bigint,
  output_tokens bigint,
  reasoning_tokens bigint,
  cached_input_tokens bigint,
  total_tokens bigint,
  cost_usd numeric(20, 10),
  latency_ms integer not null check (latency_ms >= 0),
  error_type text,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.ai_usage_events enable row level security;

revoke all on table public.ai_usage_events from public, anon, authenticated;
grant select, insert, update, delete on table public.ai_usage_events to service_role;

create index if not exists idx_ai_usage_events_started_at
  on public.ai_usage_events(started_at desc);
create index if not exists idx_ai_usage_events_operation_started
  on public.ai_usage_events(operation_id, started_at);
create index if not exists idx_ai_usage_events_feature_started
  on public.ai_usage_events(feature, started_at desc);
create index if not exists idx_ai_usage_events_status_started
  on public.ai_usage_events(status, started_at desc);
create index if not exists idx_ai_usage_events_model_started
  on public.ai_usage_events(model_id, started_at desc);
