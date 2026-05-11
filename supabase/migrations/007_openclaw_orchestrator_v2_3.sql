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

create table if not exists public.orchestrator_logs (
  id uuid primary key default gen_random_uuid(),
  command text not null,
  payload jsonb not null default '{}'::jsonb,
  result_summary text not null default '',
  status text not null default 'Completed',
  created_at timestamptz default now()
);

alter table public.orchestrator_logs enable row level security;

create index if not exists idx_orchestrator_logs_command
  on public.orchestrator_logs(command);

create index if not exists idx_orchestrator_logs_created_at
  on public.orchestrator_logs(created_at desc);
