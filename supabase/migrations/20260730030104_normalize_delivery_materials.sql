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
