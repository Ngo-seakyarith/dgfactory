drop table if exists public.orchestrator_logs;

update public.improvement_opportunities
set source_type = 'Business Loop'
where source_type = 'OpenClaw Loop';

alter table public.improvement_opportunities
  drop constraint if exists improvement_opportunities_source_type_check;

alter table public.improvement_opportunities
  add constraint improvement_opportunities_source_type_check check (
    source_type in (
      'User Feedback',
      'Pilot Issue',
      'QA Review',
      'Security Audit',
      'Failed Export',
      'Failed Offer',
      'Winning Offer',
      'Business Loop',
      'Learning Genome',
      'Eval Failure',
      'Other'
    )
  );
