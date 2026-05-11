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
