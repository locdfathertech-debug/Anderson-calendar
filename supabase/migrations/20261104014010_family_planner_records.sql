-- Shared planner modules. Existing FamilyWall tables are retained.
create table public.planner_records (
 id uuid primary key default gen_random_uuid(),
 family_id uuid not null references public.families(id) on delete cascade,
 kind text not null check (kind in ('event','chore','meal','pantry','shopping','study','grade','trip','budget','transaction','member','photo')),
 data jsonb not null check (jsonb_typeof(data) = 'object' and length(data->>'title') between 1 and 500),
 created_at timestamptz not null default now(),
 created_by uuid default auth.uid() references auth.users(id),
 constraint nonnegative_amount check (not(data ? 'amount') or ((data->>'amount')::numeric >= 0 and (data->>'amount')::numeric <= 100000000)),
 constraint chore_status check (kind <> 'chore' or coalesce(data->>'status','open') in ('open','submitted','approved','paid')),
 constraint photo_https check (kind <> 'photo' or data->>'url' ~ '^https://')
);
create index planner_family_kind on public.planner_records(family_id,kind);
create index planner_created_by on public.planner_records(created_by);
alter table public.planner_records enable row level security;
create policy "Members read shared plans, parents read private records" on public.planner_records
 for select to authenticated using (public.is_family_member(family_id) and (kind not in ('budget','transaction','grade') or public.can_manage_family(family_id)));
create policy "Parents manage plans" on public.planner_records for all to authenticated
 using(public.can_manage_family(family_id)) with check(public.can_manage_family(family_id));
revoke all on public.planner_records from anon;
grant select,insert,update,delete on public.planner_records to authenticated;

-- Narrow mutation allows a child to submit only their own open chore.
-- The caller cannot change the reward, assignee, family, or payment state.
create or replace function public.submit_planner_chore(record_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if (select auth.uid()) is null then raise exception 'Sign in required' using errcode='42501'; end if;
 update public.planner_records set data=jsonb_set(data,'{status}','"submitted"'::jsonb)
 where id=record_id and kind='chore' and public.is_family_member(family_id)
 and data->>'assigned_user_id'=(select auth.uid())::text and data->>'status'='open';
 if not found then raise exception 'Chore is unavailable or is not assigned to you' using errcode='42501'; end if;
end;
$$;
revoke all on function public.submit_planner_chore(uuid) from public,anon;
grant execute on function public.submit_planner_chore(uuid) to authenticated;

-- Provision existing authorized accounts without creating or emailing users.
insert into public.profiles(id,family_id,email,role)
select u.id, f.id, lower(u.email), case when lower(u.email)='locdfathertech@gmail.com' then 'super_admin' else 'admin' end
from auth.users u cross join public.families f
where f.name='Anderson family' and lower(u.email) in ('locdfathertech@gmail.com','kapreceh88@outlook.com')
on conflict(id) do nothing;
