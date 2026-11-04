create schema if not exists private;
grant usage on schema private to authenticated;
alter function public.current_family_id() set schema private;
alter function public.current_family_role() set schema private;
alter function public.is_family_member(uuid) set schema private;
alter function public.can_manage_family(uuid) set schema private;
alter function public.is_super_admin(uuid) set schema private;

create table public.family_access (
 email text primary key check(email=lower(email) and email like '%@%'),
 family_id uuid not null references public.families(id) on delete cascade,
 role text not null default 'member' check(role in ('member','admin')),
 created_at timestamptz not null default now()
);
create index family_access_family on public.family_access(family_id);
alter table public.family_access enable row level security;
create policy "Super admins manage family access" on public.family_access for all to authenticated
 using(private.is_super_admin(family_id)) with check(private.is_super_admin(family_id));
revoke all on public.family_access from anon;
grant select,insert,update,delete on public.family_access to authenticated;

create or replace function public.bootstrap_family_profile()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare assigned_role text; assigned_family uuid;
begin
 select a.role,a.family_id into assigned_role,assigned_family from public.family_access a where a.email=lower(new.email);
 if assigned_family is null and lower(new.email) in ('locdfathertech@gmail.com','kapreceh88@outlook.com') then
  select f.id into assigned_family from public.families f where f.name='Anderson family' limit 1;
  assigned_role:=case when lower(new.email)='locdfathertech@gmail.com' then 'super_admin' else 'admin' end;
 end if;
 if assigned_family is null then raise exception 'This family is invite-only. Ask a parent to authorize your email first.' using errcode='42501'; end if;
 insert into public.profiles(id,family_id,email,role) values(new.id,assigned_family,lower(new.email),assigned_role);
 return new;
end;
$$;
revoke all on function public.bootstrap_family_profile() from public,anon,authenticated;

create or replace function public.set_family_role(target_user_id uuid,new_role text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare actor_family uuid;
begin
 actor_family:=private.current_family_id();
 if (select auth.uid()) is null or actor_family is null or private.current_family_role()<>'super_admin' then raise exception 'Only a super administrator can manage roles' using errcode='42501'; end if;
 if new_role not in ('member','admin') then raise exception 'Invalid role' using errcode='22023'; end if;
 if target_user_id=(select auth.uid()) then raise exception 'Cannot change your own role' using errcode='42501'; end if;
 update public.profiles set role=new_role where id=target_user_id and family_id=actor_family and role<>'super_admin';
 if not found then raise exception 'Profile unavailable' using errcode='P0002'; end if;
end;
$$;
revoke all on function public.set_family_role(uuid,text) from public,anon;
grant execute on function public.set_family_role(uuid,text) to authenticated;
create or replace function public.submit_planner_chore(record_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if (select auth.uid()) is null then raise exception 'Sign in required' using errcode='42501'; end if;
 update public.planner_records set data=jsonb_set(data,'{status}','"submitted"'::jsonb)
 where id=record_id and kind='chore' and private.is_family_member(family_id)
 and data->>'assigned_user_id'=(select auth.uid())::text and data->>'status'='open';
 if not found then raise exception 'Chore unavailable or not assigned to you' using errcode='42501'; end if;
end;
$$;
revoke all on function public.submit_planner_chore(uuid) from public,anon;
grant execute on function public.submit_planner_chore(uuid) to authenticated;
