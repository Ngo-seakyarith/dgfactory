create table if not exists public.security_audits (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'Not Checked' check (
    status in ('Not Checked', 'Passed', 'Failed', 'Needs Review', 'Waived')
  ),
  auditor text,
  summary text,
  risk_score numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.security_audits enable row level security;

create table if not exists public.security_audit_items (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.security_audits(id) on delete cascade,
  category text not null,
  title text not null,
  description text not null default '',
  status text not null default 'Not Checked' check (
    status in ('Not Checked', 'Passed', 'Failed', 'Needs Review', 'Waived')
  ),
  severity text not null default 'Medium' check (
    severity in ('Low', 'Medium', 'High', 'Critical')
  ),
  evidence text,
  recommendation text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.security_audit_items enable row level security;

create index if not exists idx_security_audits_status
  on public.security_audits(status);

create index if not exists idx_security_audits_created_at
  on public.security_audits(created_at desc);

create index if not exists idx_security_audit_items_audit_id
  on public.security_audit_items(audit_id);

create index if not exists idx_security_audit_items_status
  on public.security_audit_items(status);

create index if not exists idx_security_audit_items_severity
  on public.security_audit_items(severity);
