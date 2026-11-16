-- STAGING REVIEW ONLY. Never apply before authenticated two-family acceptance.
-- Templates carry recurrence; instances are ordinary planner_records chores.
begin;
create table if not exists public.routine_templates (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  time_of_day text not null check (time_of_day in ('morning','evening')),
  weekdays smallint[] not null default array[0,1,2,3,4,5,6]::smallint[],
  assigned_user_id uuid not null references auth.users(id),
  member_name text not null check (char_length(btrim(member_name)) between 1 and 120),
  amount numeric(9,2) not null default 0 check (amount between 0 and 10000),
  points integer not null default 0 check (points between 0 and 10000),
  begins_on date not null default current_date,
  ends_on date,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users(id),
  constraint routine_weekdays_valid check (
    cardinality(weekdays) between 1 and 7 and
    weekdays <@ array[0,1,2,3,4,5,6]::smallint[]
  ),
  constraint routine_dates_valid check (ends_on is null or ends_on >= begins_on)
);
create index if not exists routine_templates_family_idx on public.routine_templates (family_id,enabled);
alter table public.routine_templates enable row level security;
revoke all on public.routine_templates from public, anon, authenticated;
grant select,insert,update on public.routine_templates to authenticated;

drop policy if exists "routine_templates_read_own" on public.routine_templates;
create policy "routine_templates_read_own" on public.routine_templates
for select to authenticated using (
  private.live_portal_session() is not null and private.is_family_member(family_id)
);
drop policy if exists "routine_templates_parent_insert" on public.routine_templates;
create policy "routine_templates_parent_insert" on public.routine_templates
for insert to authenticated with check (
  private.can_manage_family(family_id) and created_by=auth.uid() and
  exists(select 1 from public.profiles p
         where p.id=assigned_user_id and p.family_id=routine_templates.family_id)
);
drop policy if exists "routine_templates_parent_update" on public.routine_templates;
create policy "routine_templates_parent_update" on public.routine_templates
for update to authenticated using (private.can_manage_family(family_id))
with check (
  private.can_manage_family(family_id) and
  exists(select 1 from public.profiles p
         where p.id=assigned_user_id and p.family_id=routine_templates.family_id)
);
-- Edits may change only the enabled flag. To change cadence/assignment, create
-- a new template (avoid retroactively changing already generated records).
revoke update on public.routine_templates from authenticated;
grant update(enabled) on public.routine_templates to authenticated;

create table if not exists public.routine_occurrences (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  template_id uuid not null references public.routine_templates(id) on delete cascade,
  due_date date not null,
  chore_id uuid not null unique references public.planner_records(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(template_id,due_date)
);
create index if not exists routine_occurrences_family_due_idx
  on public.routine_occurrences(family_id,due_date);
alter table public.routine_occurrences enable row level security;
revoke all on public.routine_occurrences from public, anon, authenticated;
grant select on public.routine_occurrences to authenticated;
drop policy if exists "routine_occurrences_read_own" on public.routine_occurrences;
create policy "routine_occurrences_read_own" on public.routine_occurrences
for select to authenticated using (
  private.live_portal_session() is not null and private.is_family_member(family_id)
);

-- Family-scoped INSERT and UPDATE deliveries; no client DELETE events.
do $
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime'
    and schemaname='public' and tablename='routine_templates') then
    alter publication supabase_realtime add table public.routine_templates;
  end if;
end $;

-- Parent-triggered, transaction-atomic materialization. Chores enter the
-- EXISTING open -> submitted -> approved -> paid workflow; no auto payouts.
create or replace function public.materialize_family_routines(target_day date)
returns integer
language plpgsql security definer set search_path=''
as $routine$
declare
  v_family uuid := private.current_family_id();
  v_template record;
  v_chore uuid;
  v_added int := 0;
begin
  if private.live_portal_session() is null or v_family is null
      or not private.can_manage_family(v_family) then
    raise exception 'Parent unlock required' using errcode='42501';
  end if;
  if target_day is null or target_day < current_date - 1
       or target_day > current_date + 31 then
    raise exception 'Invalid routine date';
  end if;
  for v_template in
    select t.* from public.routine_templates t
    where t.family_id=v_family and t.enabled
      and target_day >= t.begins_on and (t.ends_on is null or target_day<=t.ends_on)
      and extract(dow from target_day)::smallint = any(t.weekdays)
      and exists(select 1 from public.profiles p
         where p.id=t.assigned_user_id and p.family_id=v_family)
    order by t.id
  loop
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(v_template.id::text || '/' || target_day::text, 0)
    );
    if exists(select 1 from public.routine_occurrences o
              where o.template_id=v_template.id and o.due_date=target_day) then
      continue;
    end if;
    insert into public.planner_records(family_id,kind,data,created_by)
    values(v_family,'chore',
      pg_catalog.jsonb_build_object(
        'title',v_template.title,
        'member',v_template.member_name,
        'assigned_user_id',v_template.assigned_user_id::text,
        'date',target_day::text,
        'status','open',
        'amount',v_template.amount,
        'points',v_template.points,
        'routine_template_id',v_template.id::text,
        'time_of_day',v_template.time_of_day
      ),auth.uid())
    returning id into v_chore;
    insert into public.routine_occurrences(family_id,template_id,due_date,chore_id)
    values(v_family,v_template.id,target_day,v_chore);
    v_added:=v_added+1;
  end loop;
  return v_added;
end
$routine$;
revoke all on function public.materialize_family_routines(date) from public, anon;
grant execute on function public.materialize_family_routines(date) to authenticated;
commit;
