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
