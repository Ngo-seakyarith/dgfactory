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
  contact_position text,
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

create table if not exists public.intelligent_system_proposals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null,
  title text not null,
  solution_type text not null default 'Other' check (
    solution_type in (
      'Business Website',
      'Web Application',
      'Internal Business System',
      'Customer Portal',
      'E-commerce',
      'Data and Reporting System',
      'AI-enabled System',
      'Other'
    )
  ),
  brief jsonb not null default '{}'::jsonb,
  status text not null default 'Draft' check (
    status in (
      'Draft',
      'Analyzing',
      'Analysis Ready',
      'Reviewing',
      'Review Ready',
      'Generated',
      'Failed'
    )
  ),
  combined_analysis jsonb,
  analyst_review jsonb,
  proposal_content jsonb,
  commercial_inputs jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.intelligent_system_proposals enable row level security;

create index if not exists idx_intelligent_system_proposals_client_id
  on public.intelligent_system_proposals(client_id);
create index if not exists idx_intelligent_system_proposals_updated_at
  on public.intelligent_system_proposals(updated_at desc);
create index if not exists idx_intelligent_system_proposals_status
  on public.intelligent_system_proposals(status);
create index if not exists idx_intelligent_system_proposals_solution_type
  on public.intelligent_system_proposals(solution_type);

create table if not exists public.intelligent_system_files (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.intelligent_system_proposals(id) on delete cascade,
  original_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  sha256 text not null default '',
  parse_status text not null default 'Uploaded' check (
    parse_status in ('Uploaded', 'Analyzing', 'Ready', 'Failed')
  ),
  analysis_snapshot jsonb,
  error_message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.intelligent_system_files enable row level security;

create index if not exists idx_intelligent_system_files_proposal_id
  on public.intelligent_system_files(proposal_id);
create index if not exists idx_intelligent_system_files_parse_status
  on public.intelligent_system_files(parse_status);
create unique index if not exists idx_intelligent_system_files_project_sha256
  on public.intelligent_system_files(proposal_id, sha256)
  where sha256 <> '';

create table if not exists public.syllabus_imports (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'Uploaded' check (
    status in ('Uploaded', 'Processing', 'Needs Input', 'Finalizing', 'Completed', 'Failed')
  ),
  original_name text not null,
  storage_path text unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  sha256 text not null default '',
  pricing_inputs jsonb not null default '{}'::jsonb,
  mapping jsonb,
  corrections jsonb not null default '{}'::jsonb,
  missing_fields text[] not null default '{}',
  package_id uuid unique references public.training_packages(id) on delete set null,
  error_message text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.syllabus_imports enable row level security;

create index if not exists idx_syllabus_imports_status_updated
  on public.syllabus_imports(status, updated_at desc);

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null check (
    job_type in (
      'training_package',
      'system_discovery',
      'system_proposal',
      'solution_review',
      'solution_proposal',
      'delivery_material',
      'evaluation_questions',
      'delivery_report',
      'syllabus_proposal'
    )
  ),
  resource_type text not null,
  resource_id uuid not null,
  target text not null default '',
  status text not null default 'Queued' check (
    status in ('Queued', 'Running', 'Completed', 'Failed')
  ),
  workflow_run_id text not null default '',
  payload jsonb not null default '{}'::jsonb,
  error_message text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_by_actor text not null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.generation_jobs enable row level security;

create index if not exists idx_generation_jobs_resource
  on public.generation_jobs(resource_type, resource_id, created_at desc);
create index if not exists idx_generation_jobs_status
  on public.generation_jobs(status, created_at desc);
create unique index if not exists idx_generation_jobs_active_unique
  on public.generation_jobs(job_type, resource_id, target)
  where status in ('Queued', 'Running');

revoke all on table public.intelligent_system_proposals from anon, authenticated;
revoke all on table public.intelligent_system_files from anon, authenticated;
revoke all on table public.syllabus_imports from anon, authenticated;
revoke all on table public.generation_jobs from anon, authenticated;
grant all on table public.intelligent_system_proposals to service_role;
grant all on table public.intelligent_system_files to service_role;
grant all on table public.syllabus_imports to service_role;
grant all on table public.generation_jobs to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'solution-proposal-inputs',
  'solution-proposal-inputs',
  false,
  10485760,
  array[
    'text/csv',
    'application/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'syllabus-proposal-inputs',
  'syllabus-proposal-inputs',
  false,
  10485760,
  array[
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/pdf',
    'application/octet-stream'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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
      'Syllabus Sent',
      'Proposal Sent',
      'Negotiation',
      'Won',
      'Prepared',
      'Delivered',
      'Lost',
      'Dormant'
    )
  ),
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

-- One pipeline opportunity per training package.
create unique index if not exists idx_opportunities_linked_package_unique
  on public.opportunities(linked_package_id)
  where linked_package_id is not null;

create table if not exists public.delivery_projects (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references public.opportunities(id) on delete set null,
  package_id uuid references public.training_packages(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  delivery_status text not null default 'Syllabus Sent' check (
    delivery_status in (
      'Lead',
      'Discovery',
      'Syllabus Sent',
      'Proposal Sent',
      'Negotiation',
      'Won',
      'Prepared',
      'Delivered',
      'Lost',
      'Dormant'
    )
  ),
  training_date date,
  location text,
  trainer_name text,
  participant_count numeric default 0,
  notes text,
  evaluation jsonb not null default '{}'::jsonb,
  materials jsonb not null default '{}'::jsonb,
  post_training_report text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.delivery_projects enable row level security;

create table if not exists public.delivery_materials (
  delivery_project_id uuid not null
    references public.delivery_projects(id) on delete cascade,
  material_type text not null check (
    material_type in ('slides', 'workbook', 'facilitatorGuide', 'promptLibrary')
  ),
  content text not null default '',
  generation_job_id uuid
    references public.generation_jobs(id) on delete set null,
  model text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (delivery_project_id, material_type)
);

alter table public.delivery_materials enable row level security;

revoke all on table public.delivery_materials
  from public, anon, authenticated;
grant select, insert, update, delete on table public.delivery_materials
  to service_role;

create index if not exists idx_delivery_materials_generation_job
  on public.delivery_materials(generation_job_id)
  where generation_job_id is not null;

insert into public.delivery_materials (
  delivery_project_id,
  material_type,
  content
)
select
  project.id,
  material.material_type,
  material.content
from public.delivery_projects as project
cross join lateral (
  values
    ('slides', coalesce(project.materials->>'slides', '')),
    ('workbook', coalesce(project.materials->>'workbook', '')),
    ('facilitatorGuide', coalesce(project.materials->>'facilitatorGuide', '')),
    ('promptLibrary', coalesce(project.materials->>'promptLibrary', ''))
) as material(material_type, content)
where btrim(material.content) <> ''
on conflict (delivery_project_id, material_type) do nothing;

comment on column public.delivery_projects.materials is
  'Deprecated compatibility snapshot. Generated materials are stored in public.delivery_materials.';


create schema if not exists private;

create or replace function private.sync_delivery_materials_from_legacy()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  insert into public.delivery_materials (
    delivery_project_id,
    material_type,
    content,
    generation_job_id,
    model,
    updated_at
  )
  select
    new.id,
    material.material_type,
    material.content,
    null,
    '',
    coalesce(new.updated_at, now())
  from (
    values
      ('slides', coalesce(new.materials->>'slides', '')),
      ('workbook', coalesce(new.materials->>'workbook', '')),
      ('facilitatorGuide', coalesce(new.materials->>'facilitatorGuide', '')),
      ('promptLibrary', coalesce(new.materials->>'promptLibrary', ''))
  ) as material(material_type, content)
  on conflict (delivery_project_id, material_type) do update
  set
    content = excluded.content,
    generation_job_id = case
      when public.delivery_materials.content is distinct from excluded.content
        then null
      else public.delivery_materials.generation_job_id
    end,
    model = case
      when public.delivery_materials.content is distinct from excluded.content
        then ''
      else public.delivery_materials.model
    end,
    updated_at = case
      when public.delivery_materials.content is distinct from excluded.content
        then excluded.updated_at
      else public.delivery_materials.updated_at
    end;

  return new;
end;
$$;

create or replace function private.sync_legacy_delivery_materials()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  update public.delivery_projects
  set
    materials = jsonb_set(
      coalesce(materials, '{}'::jsonb),
      array[new.material_type],
      to_jsonb(new.content),
      true
    ),
    updated_at = greatest(
      coalesce(updated_at, new.updated_at),
      new.updated_at
    )
  where id = new.delivery_project_id;

  return new;
end;
$$;

revoke all on function private.sync_delivery_materials_from_legacy()
  from public, anon, authenticated;
revoke all on function private.sync_legacy_delivery_materials()
  from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.sync_delivery_materials_from_legacy()
  to service_role;
grant execute on function private.sync_legacy_delivery_materials()
  to service_role;

drop trigger if exists sync_delivery_materials_from_legacy
  on public.delivery_projects;
create trigger sync_delivery_materials_from_legacy
after insert or update of materials on public.delivery_projects
for each row
execute function private.sync_delivery_materials_from_legacy();

drop trigger if exists sync_legacy_delivery_materials
  on public.delivery_materials;
create trigger sync_legacy_delivery_materials
after insert or update of content on public.delivery_materials
for each row
execute function private.sync_legacy_delivery_materials();


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

create table if not exists public.evaluation_forms (
  id uuid primary key default gen_random_uuid(),
  delivery_project_id uuid not null references public.delivery_projects(id) on delete cascade,
  form_type text not null default 'post_training' check (form_type in ('pre_training', 'post_training')),
  title text not null,
  intro text not null default '',
  status text not null default 'Draft' check (status in ('Draft', 'Open', 'Closed')),
  questions jsonb not null default '[]'::jsonb,
  access_token_hash text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.evaluation_forms enable row level security;

create unique index if not exists idx_evaluation_forms_delivery_project_type
  on public.evaluation_forms(delivery_project_id, form_type);

create index if not exists idx_evaluation_forms_token_hash
  on public.evaluation_forms(access_token_hash);

create table if not exists public.evaluation_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.evaluation_forms(id) on delete cascade,
  respondent_name text not null default '',
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.evaluation_responses enable row level security;

create index if not exists idx_evaluation_responses_form_id
  on public.evaluation_responses(form_id);

create index if not exists idx_evaluation_responses_created_at
  on public.evaluation_responses(created_at desc);

create index if not exists idx_delivery_projects_opportunity_id
  on public.delivery_projects(opportunity_id);

create index if not exists idx_delivery_tasks_project_id
  on public.delivery_tasks(delivery_project_id);

create index if not exists idx_delivery_tasks_status
  on public.delivery_tasks(status);

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
