create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.organizations enable row level security;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  default_organization_id uuid references public.organizations(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role text not null check (role in ('Admin', 'Sales', 'Trainer', 'Viewer')),
  status text not null default 'Active' check (status in ('Active', 'Invited', 'Suspended')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, organization_id)
);

alter table public.organization_memberships enable row level security;

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'organization_id', '')::uuid,
    (select p.default_organization_id from public.profiles p where p.id = auth.uid()),
    (
      select om.organization_id
      from public.organization_memberships om
      where om.user_id = auth.uid()
        and om.status = 'Active'
      order by om.created_at asc
      limit 1
    )
  )
$$;

create or replace function public.has_org_role(role_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.organization_id = public.current_org_id()
      and om.status = 'Active'
      and om.role = role_name
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_org_role('Admin')
$$;

create or replace function public.can_view_internal_notes()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_org_role('Admin')
$$;

create or replace function public.can_view_margin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_org_role('Admin')
$$;

insert into public.organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'DG Academy', 'dg-academy')
on conflict (id) do nothing;

alter table public.clients add column if not exists organization_id uuid references public.organizations(id);
alter table public.opportunities add column if not exists organization_id uuid references public.organizations(id);
alter table public.training_packages add column if not exists organization_id uuid references public.organizations(id);
alter table public.delivery_projects add column if not exists organization_id uuid references public.organizations(id);
alter table public.knowledge_documents add column if not exists organization_id uuid references public.organizations(id);
alter table public.knowledge_chunks add column if not exists organization_id uuid references public.organizations(id);
alter table public.prompt_templates add column if not exists organization_id uuid references public.organizations(id);
alter table public.approval_requests add column if not exists organization_id uuid references public.organizations(id);
alter table public.audit_logs add column if not exists organization_id uuid references public.organizations(id);
alter table public.loop_runs add column if not exists organization_id uuid references public.organizations(id);
alter table public.market_signals add column if not exists organization_id uuid references public.organizations(id);
alter table public.offer_variants add column if not exists organization_id uuid references public.organizations(id);
alter table public.growth_experiments add column if not exists organization_id uuid references public.organizations(id);
alter table public.experiment_metrics add column if not exists organization_id uuid references public.organizations(id);
alter table public.selection_decisions add column if not exists organization_id uuid references public.organizations(id);
alter table public.learning_genome_items add column if not exists organization_id uuid references public.organizations(id);
alter table public.improvement_opportunities add column if not exists organization_id uuid references public.organizations(id);
alter table public.eval_datasets add column if not exists organization_id uuid references public.organizations(id);
alter table public.eval_examples add column if not exists organization_id uuid references public.organizations(id);
alter table public.eval_runs add column if not exists organization_id uuid references public.organizations(id);
alter table public.eval_results add column if not exists organization_id uuid references public.organizations(id);

update public.clients set organization_id = '00000000-0000-0000-0000-000000000001' where organization_id is null;
update public.opportunities set organization_id = '00000000-0000-0000-0000-000000000001' where organization_id is null;
update public.training_packages set organization_id = '00000000-0000-0000-0000-000000000001' where organization_id is null;
update public.delivery_projects set organization_id = '00000000-0000-0000-0000-000000000001' where organization_id is null;
update public.knowledge_documents set organization_id = '00000000-0000-0000-0000-000000000001' where organization_id is null;
update public.knowledge_chunks set organization_id = '00000000-0000-0000-0000-000000000001' where organization_id is null;
update public.prompt_templates set organization_id = '00000000-0000-0000-0000-000000000001' where organization_id is null;
update public.approval_requests set organization_id = '00000000-0000-0000-0000-000000000001' where organization_id is null;
update public.audit_logs set organization_id = '00000000-0000-0000-0000-000000000001' where organization_id is null;
update public.loop_runs set organization_id = '00000000-0000-0000-0000-000000000001' where organization_id is null;
update public.market_signals set organization_id = '00000000-0000-0000-0000-000000000001' where organization_id is null;
update public.offer_variants set organization_id = '00000000-0000-0000-0000-000000000001' where organization_id is null;
update public.growth_experiments set organization_id = '00000000-0000-0000-0000-000000000001' where organization_id is null;
update public.experiment_metrics set organization_id = '00000000-0000-0000-0000-000000000001' where organization_id is null;
update public.selection_decisions set organization_id = '00000000-0000-0000-0000-000000000001' where organization_id is null;
update public.learning_genome_items set organization_id = '00000000-0000-0000-0000-000000000001' where organization_id is null;
update public.improvement_opportunities set organization_id = '00000000-0000-0000-0000-000000000001' where organization_id is null;
update public.eval_datasets set organization_id = '00000000-0000-0000-0000-000000000001' where organization_id is null;
update public.eval_examples set organization_id = '00000000-0000-0000-0000-000000000001' where organization_id is null;
update public.eval_runs set organization_id = '00000000-0000-0000-0000-000000000001' where organization_id is null;
update public.eval_results set organization_id = '00000000-0000-0000-0000-000000000001' where organization_id is null;

create index if not exists idx_clients_org on public.clients(organization_id);
create index if not exists idx_training_packages_org on public.training_packages(organization_id);
create index if not exists idx_opportunities_org on public.opportunities(organization_id);
create index if not exists idx_delivery_projects_org on public.delivery_projects(organization_id);
create index if not exists idx_knowledge_documents_org on public.knowledge_documents(organization_id);
create index if not exists idx_offer_variants_org on public.offer_variants(organization_id);

alter table public.clients enable row level security;
alter table public.opportunities enable row level security;
alter table public.training_packages enable row level security;
alter table public.delivery_projects enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.prompt_templates enable row level security;
alter table public.approval_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.loop_runs enable row level security;
alter table public.market_signals enable row level security;
alter table public.offer_variants enable row level security;
alter table public.growth_experiments enable row level security;
alter table public.experiment_metrics enable row level security;
alter table public.selection_decisions enable row level security;
alter table public.learning_genome_items enable row level security;
alter table public.improvement_opportunities enable row level security;
alter table public.eval_datasets enable row level security;
alter table public.eval_examples enable row level security;
alter table public.eval_runs enable row level security;
alter table public.eval_results enable row level security;

drop policy if exists "organizations member read" on public.organizations;
create policy "organizations member read"
on public.organizations for select to authenticated
using (
  exists (
    select 1 from public.organization_memberships om
    where om.organization_id = organizations.id
      and om.user_id = auth.uid()
      and om.status = 'Active'
  )
);

drop policy if exists "profiles own or admin read" on public.profiles;
create policy "profiles own or admin read"
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "memberships member read" on public.organization_memberships;
create policy "memberships member read"
on public.organization_memberships for select to authenticated
using (
  user_id = auth.uid()
  or (
    organization_id = public.current_org_id()
    and public.is_admin()
  )
);

drop policy if exists "memberships admin write" on public.organization_memberships;
create policy "memberships admin write"
on public.organization_memberships for all to authenticated
using (organization_id = public.current_org_id() and public.is_admin())
with check (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists "clients org sales read" on public.clients;
create policy "clients org sales read"
on public.clients for select to authenticated
using (
  organization_id = public.current_org_id()
  and (
    public.has_org_role('Admin')
    or public.has_org_role('Sales')
    or public.has_org_role('Viewer')
  )
);

drop policy if exists "clients org sales write" on public.clients;
create policy "clients org sales write"
on public.clients for all to authenticated
using (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Sales')))
with check (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Sales')));

drop policy if exists "opportunities org sales read" on public.opportunities;
create policy "opportunities org sales read"
on public.opportunities for select to authenticated
using (
  organization_id = public.current_org_id()
  and (public.has_org_role('Admin') or public.has_org_role('Sales') or public.has_org_role('Viewer'))
);

drop policy if exists "opportunities org sales write" on public.opportunities;
create policy "opportunities org sales write"
on public.opportunities for all to authenticated
using (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Sales')))
with check (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Sales')));

drop policy if exists "training packages org read" on public.training_packages;
create policy "training packages org read"
on public.training_packages for select to authenticated
using (
  organization_id = public.current_org_id()
  and (public.has_org_role('Admin') or public.has_org_role('Sales') or public.has_org_role('Trainer') or public.has_org_role('Viewer'))
);

drop policy if exists "training packages org write" on public.training_packages;
create policy "training packages org write"
on public.training_packages for all to authenticated
using (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Sales')))
with check (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Sales')));

drop policy if exists "delivery projects org trainer read" on public.delivery_projects;
create policy "delivery projects org trainer read"
on public.delivery_projects for select to authenticated
using (
  organization_id = public.current_org_id()
  and (public.has_org_role('Admin') or public.has_org_role('Trainer') or public.has_org_role('Viewer'))
);

drop policy if exists "delivery projects org trainer write" on public.delivery_projects;
create policy "delivery projects org trainer write"
on public.delivery_projects for all to authenticated
using (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Trainer')))
with check (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Trainer')));

drop policy if exists "knowledge documents org visibility read" on public.knowledge_documents;
create policy "knowledge documents org visibility read"
on public.knowledge_documents for select to authenticated
using (
  organization_id = public.current_org_id()
  and (
    public.has_org_role('Admin')
    or public.has_org_role('Trainer')
    or public.has_org_role('Sales')
    or (public.has_org_role('Viewer') and visibility = 'Client-safe')
  )
);

drop policy if exists "knowledge documents org write" on public.knowledge_documents;
create policy "knowledge documents org write"
on public.knowledge_documents for all to authenticated
using (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Trainer')))
with check (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Trainer')));

drop policy if exists "knowledge chunks org visibility read" on public.knowledge_chunks;
create policy "knowledge chunks org visibility read"
on public.knowledge_chunks for select to authenticated
using (
  organization_id = public.current_org_id()
  and exists (
    select 1 from public.knowledge_documents kd
    where kd.id = knowledge_chunks.document_id
      and kd.organization_id = public.current_org_id()
      and (
        public.has_org_role('Admin')
        or public.has_org_role('Trainer')
        or public.has_org_role('Sales')
        or (public.has_org_role('Viewer') and kd.visibility = 'Client-safe')
      )
  )
);

drop policy if exists "knowledge chunks org write" on public.knowledge_chunks;
create policy "knowledge chunks org write"
on public.knowledge_chunks for all to authenticated
using (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Trainer')))
with check (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Trainer')));

drop policy if exists "prompt templates admin only" on public.prompt_templates;
create policy "prompt templates admin only"
on public.prompt_templates for all to authenticated
using (organization_id = public.current_org_id() and public.is_admin())
with check (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists "approval requests admin only" on public.approval_requests;
create policy "approval requests admin only"
on public.approval_requests for all to authenticated
using (organization_id = public.current_org_id() and public.is_admin())
with check (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists "audit logs admin read" on public.audit_logs;
create policy "audit logs admin read"
on public.audit_logs for select to authenticated
using (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists "loop runs org read" on public.loop_runs;
create policy "loop runs org read"
on public.loop_runs for select to authenticated
using (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Sales') or public.has_org_role('Trainer') or public.has_org_role('Viewer')));

drop policy if exists "loop runs admin write" on public.loop_runs;
create policy "loop runs admin write"
on public.loop_runs for all to authenticated
using (organization_id = public.current_org_id() and public.is_admin())
with check (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists "adaptive growth org read" on public.market_signals;
create policy "adaptive growth org read"
on public.market_signals for select to authenticated
using (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Sales') or public.has_org_role('Viewer')));

drop policy if exists "adaptive growth org write" on public.market_signals;
create policy "adaptive growth org write"
on public.market_signals for all to authenticated
using (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Sales')))
with check (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Sales')));

drop policy if exists "offer variants org read" on public.offer_variants;
create policy "offer variants org read"
on public.offer_variants for select to authenticated
using (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Sales') or public.has_org_role('Trainer') or public.has_org_role('Viewer')));

drop policy if exists "offer variants org write" on public.offer_variants;
create policy "offer variants org write"
on public.offer_variants for all to authenticated
using (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Sales')))
with check (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Sales')));

drop policy if exists "experiments org read" on public.growth_experiments;
create policy "experiments org read"
on public.growth_experiments for select to authenticated
using (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Sales') or public.has_org_role('Viewer')));

drop policy if exists "experiments org write" on public.growth_experiments;
create policy "experiments org write"
on public.growth_experiments for all to authenticated
using (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Sales')))
with check (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Sales')));

drop policy if exists "experiment metrics org read" on public.experiment_metrics;
create policy "experiment metrics org read"
on public.experiment_metrics for select to authenticated
using (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Sales') or public.has_org_role('Viewer')));

drop policy if exists "experiment metrics org write" on public.experiment_metrics;
create policy "experiment metrics org write"
on public.experiment_metrics for all to authenticated
using (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Sales')))
with check (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Sales')));

drop policy if exists "selection decisions org read" on public.selection_decisions;
create policy "selection decisions org read"
on public.selection_decisions for select to authenticated
using (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Sales') or public.has_org_role('Viewer')));

drop policy if exists "selection decisions admin write" on public.selection_decisions;
create policy "selection decisions admin write"
on public.selection_decisions for all to authenticated
using (organization_id = public.current_org_id() and public.is_admin())
with check (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists "learning genome org visibility read" on public.learning_genome_items;
create policy "learning genome org visibility read"
on public.learning_genome_items for select to authenticated
using (
  organization_id = public.current_org_id()
  and (
    public.has_org_role('Admin')
    or public.has_org_role('Trainer')
    or public.has_org_role('Sales')
    or (public.has_org_role('Viewer') and status = 'Active')
  )
);

drop policy if exists "learning genome org write" on public.learning_genome_items;
create policy "learning genome org write"
on public.learning_genome_items for all to authenticated
using (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Trainer')))
with check (organization_id = public.current_org_id() and (public.has_org_role('Admin') or public.has_org_role('Trainer')));

drop policy if exists "improvement opportunities admin read" on public.improvement_opportunities;
create policy "improvement opportunities admin read"
on public.improvement_opportunities for select to authenticated
using (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists "improvement opportunities admin write" on public.improvement_opportunities;
create policy "improvement opportunities admin write"
on public.improvement_opportunities for all to authenticated
using (organization_id = public.current_org_id() and public.is_admin())
with check (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists "eval datasets org read" on public.eval_datasets;
create policy "eval datasets org read"
on public.eval_datasets for select to authenticated
using (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists "eval datasets admin write" on public.eval_datasets;
create policy "eval datasets admin write"
on public.eval_datasets for all to authenticated
using (organization_id = public.current_org_id() and public.is_admin())
with check (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists "eval examples org read" on public.eval_examples;
create policy "eval examples org read"
on public.eval_examples for select to authenticated
using (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists "eval examples admin write" on public.eval_examples;
create policy "eval examples admin write"
on public.eval_examples for all to authenticated
using (organization_id = public.current_org_id() and public.is_admin())
with check (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists "eval runs org read" on public.eval_runs;
create policy "eval runs org read"
on public.eval_runs for select to authenticated
using (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists "eval runs admin write" on public.eval_runs;
create policy "eval runs admin write"
on public.eval_runs for all to authenticated
using (organization_id = public.current_org_id() and public.is_admin())
with check (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists "eval results org read" on public.eval_results;
create policy "eval results org read"
on public.eval_results for select to authenticated
using (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists "eval results admin write" on public.eval_results;
create policy "eval results admin write"
on public.eval_results for all to authenticated
using (organization_id = public.current_org_id() and public.is_admin())
with check (organization_id = public.current_org_id() and public.is_admin());
