update public.training_packages
set generation_mode = 'openai'
where generation_mode is null or generation_mode = 'mock';

alter table public.training_packages
  alter column generation_mode set default 'openai';

alter table public.training_packages
  drop constraint if exists training_packages_generation_mode_check;

alter table public.training_packages
  add constraint training_packages_generation_mode_check
  check (generation_mode in ('openai'));

update public.eval_runs
set model_name = ''
where model_name = 'mock';

alter table public.eval_runs
  alter column model_name set default '';

update public.agent_traces
set status = 'Completed'
where status = 'Mock';

alter table public.agent_traces
  drop constraint if exists agent_traces_status_check;

alter table public.agent_traces
  add constraint agent_traces_status_check
  check (status in ('Completed', 'Failed'));

alter table public.eval_datasets
  drop constraint if exists eval_datasets_target_agent_check;

alter table public.eval_datasets
  add constraint eval_datasets_target_agent_check
  check (
    target_agent in (
      'course_package',
      'proposal',
      'pricing_narrative',
      'slide_outline',
      'workbook',
      'follow_up',
      'delivery_report',
      'qa_review',
      'improvement_suggestion',
      'offer_mutation',
      'offer_replication',
      'improvement_opportunity',
      'adaptive_growth_recommendations',
      'master_workflow',
      'market_sensing',
      'experiment_design',
      'fitness_evaluation',
      'selection_recommendation',
      'expansion_strategy',
      'learning_genome',
      'extinction_recommendation'
    )
  );

alter table public.eval_runs
  drop constraint if exists eval_runs_target_agent_check;

alter table public.eval_runs
  add constraint eval_runs_target_agent_check
  check (
    target_agent in (
      'course_package',
      'proposal',
      'pricing_narrative',
      'slide_outline',
      'workbook',
      'follow_up',
      'delivery_report',
      'qa_review',
      'improvement_suggestion',
      'offer_mutation',
      'offer_replication',
      'improvement_opportunity',
      'adaptive_growth_recommendations',
      'master_workflow',
      'market_sensing',
      'experiment_design',
      'fitness_evaluation',
      'selection_recommendation',
      'expansion_strategy',
      'learning_genome',
      'extinction_recommendation'
    )
  );

alter table public.agent_traces
  drop constraint if exists agent_traces_task_type_check;

alter table public.agent_traces
  add constraint agent_traces_task_type_check
  check (
    task_type in (
      'course_package',
      'proposal',
      'pricing_narrative',
      'slide_outline',
      'workbook',
      'follow_up',
      'delivery_report',
      'qa_review',
      'improvement_suggestion',
      'offer_mutation',
      'offer_replication',
      'improvement_opportunity',
      'adaptive_growth_recommendations',
      'master_workflow',
      'market_sensing',
      'experiment_design',
      'fitness_evaluation',
      'selection_recommendation',
      'expansion_strategy',
      'learning_genome',
      'extinction_recommendation'
    )
  );

update public.improvement_opportunities
set status = 'Approved'
where status = 'Converted to PRD';

alter table public.improvement_opportunities
  drop constraint if exists improvement_opportunities_status_check;

alter table public.improvement_opportunities
  add constraint improvement_opportunities_status_check
  check (
    status in (
      'Suggested',
      'Approved',
      'Sent to Codex',
      'Implemented',
      'Rejected'
    )
  );
