-- OPTIONAL REVIEW ONLY — do not apply until routine schema, RLS, staging
-- session QA, and administrative Cron installation/monitoring are approved.
-- Anderson's initial wall tablet and schedule use America/Chicago local days.
-- Add household timezone configuration before supporting other regions.
-- Source: https://supabase.com/docs/guides/cron/quickstart

-- ADMINISTRATOR PREREQUISITE (not automatically installed by base migration):
-- create extension pg_cron with schema pg_catalog;
-- grant usage on schema cron to postgres;
-- grant all privileges on all tables in schema cron to postgres;

create or replace function private.materialize_due_routines_central()
returns integer language plpgsql security definer set search_path=''
as $routinecron$
declare
  local_time timestamp := (now() at time zone 'America/Chicago');
  due_day date := local_time::date;
  t record;
  new_chore uuid;
  inserted integer := 0;
begin
  -- Do not assign before 05:00 family-local time.
  if extract(hour from local_time)<5 then return 0; end if;
  for t in
    select r.* from public.routine_templates r
      where r.enabled and due_day >= r.begins_on
        and (r.ends_on is null or due_day <= r.ends_on)
        and extract(dow from due_day)::smallint=any(r.weekdays)
        and exists(select 1 from public.profiles p
          where p.id=r.assigned_user_id and p.family_id=r.family_id)
    order by r.id
  loop
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(t.id::text||'/'||due_day::text,0));
    if exists(select 1 from public.routine_occurrences o
      where o.template_id=t.id and o.due_date=due_day) then continue; end if;
    insert into public.planner_records(family_id,kind,data,created_by)
      values(t.family_id,'chore',pg_catalog.jsonb_build_object(
        'title',t.title,'member',t.member_name,
        'assigned_user_id',t.assigned_user_id::text,
        'date',due_day::text,'status','open',
        'amount',t.amount,'points',t.points,
        'routine_template_id',t.id::text,'time_of_day',t.time_of_day
      ),t.created_by)
      returning id into new_chore;
    insert into public.routine_occurrences(family_id,template_id,due_date,chore_id)
      values(t.family_id,t.id,due_day,new_chore);
    inserted:=inserted+1;
  end loop;
  return inserted;
end
$routinecron$;
-- The privileged database Cron runner is the only intended invoker.
revoke all on function private.materialize_due_routines_central() from public, anon, authenticated;

-- Run only AFTER verifying this function from a restricted, disposable
-- staging database and observing its job_run_details under operator review:
-- select cron.schedule(
--   'anderson-due-routines-central',
--   '*/30 * * * *',
--   $$select private.materialize_due_routines_central();$$
-- );
--
-- Rollback of scheduler only (does not remove completed chores):
-- select cron.unschedule('anderson-due-routines-central');
-- drop function private.materialize_due_routines_central();
