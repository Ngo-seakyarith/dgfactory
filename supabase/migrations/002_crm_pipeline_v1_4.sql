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

create index if not exists idx_opportunities_status
  on public.opportunities(status);

create index if not exists idx_opportunities_client_id
  on public.opportunities(client_id);

create index if not exists idx_opportunities_follow_up
  on public.opportunities(next_follow_up_date);

create index if not exists idx_opportunities_linked_package
  on public.opportunities(linked_package_id);
