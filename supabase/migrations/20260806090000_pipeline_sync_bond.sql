-- Guarantee the one-to-one training package -> opportunity relationship.
create unique index if not exists idx_opportunities_linked_package_unique
  on public.opportunities(linked_package_id)
  where linked_package_id is not null;
