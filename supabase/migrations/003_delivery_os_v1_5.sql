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
