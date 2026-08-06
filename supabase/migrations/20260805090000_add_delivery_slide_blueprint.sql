alter table public.delivery_materials
  add column if not exists blueprint jsonb;

comment on column public.delivery_materials.blueprint is
  'User-controlled linear module and learning-block structure for slide generation. Used only when material_type is slides.';
