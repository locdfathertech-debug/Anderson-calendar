-- FamilyWall schema and authorization for the Anderson family.
-- Run in Supabase SQL Editor. Auth is invite-only: only the two approved emails
-- can receive a profile. No client-supplied role values are trusted.

create extension if not exists pgcrypto;

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
insert into public.families (id, name)
values ('a8bd9190-79a4-4f4d-8fe1-000000000001', 'Anderson family')
on conflict (id) do nothing;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  email text not null unique,
  role text not null check (role in ('member', 'admin', 'super_admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (length(title) between 1 and 160), event_date date not null,
  event_time text not null default 'All day', assigned_to text not null default 'Family', place text not null default '',
  created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.chores (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (length(title) between 1 and 160), due_date date not null default current_date,
  assigned_to text not null default 'Family', completed boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.vacations (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (length(title) between 1 and 160), date_label text not null default '', image_url text not null default '',
  created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
  member_name text not null default 'Mia', subject text not null check (length(subject) between 1 and 100),
  grade text not null check (length(grade) between 1 and 12), created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);

create or replace function public.bootstrap_family_profile()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare assigned_role text;
begin
  assigned_role := case lower(coalesce(new.email, ''))
    when 'locdfathertech@gmail.com' then 'super_admin'
    when 'kapreceh88@outlook.com' then 'admin'
    else null
  end;
  if assigned_role is null then
    raise exception 'This family is invite-only. Contact the family administrator.' using errcode = '42501';
  end if;
  insert into public.profiles (id, family_id, email, role)
  values (new.id, 'a8bd9190-79a4-4f4d-8fe1-000000000001', lower(new.email), assigned_role);
  return new;
end;
$$;
revoke all on function public.bootstrap_family_profile() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_family_profile on auth.users;
create trigger on_auth_user_created_family_profile after insert on auth.users
for each row execute function public.bootstrap_family_profile();

create or replace function public.current_family_id()
returns uuid language sql stable security definer set search_path = public, pg_temp as $$
  select family_id from public.profiles where id = (select auth.uid()) limit 1
$$;
create or replace function public.current_family_role()
returns text language sql stable security definer set search_path = public, pg_temp as $$
  select role from public.profiles where id = (select auth.uid()) limit 1
$$;
create or replace function public.is_family_member(target_family uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and family_id = target_family)
$$;
create or replace function public.can_manage_family(target_family uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and family_id = target_family and role in ('admin','super_admin'))
$$;
create or replace function public.is_super_admin(target_family uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and family_id = target_family and role = 'super_admin')
$$;
revoke all on function public.current_family_id() from public, anon;
revoke all on function public.current_family_role() from public, anon;
revoke all on function public.is_family_member(uuid) from public, anon;
revoke all on function public.can_manage_family(uuid) from public, anon;
revoke all on function public.is_super_admin(uuid) from public, anon;
grant execute on function public.current_family_id(), public.current_family_role(), public.is_family_member(uuid), public.can_manage_family(uuid), public.is_super_admin(uuid) to authenticated;

create or replace function public.set_family_role(target_user_id uuid, new_role text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare actor_family uuid;
begin
  actor_family := public.current_family_id();
  if actor_family is null or public.current_family_role() <> 'super_admin' then
    raise exception 'Only a super administrator can manage roles.' using errcode = '42501';
  end if;
  if new_role not in ('member','admin') then
    raise exception 'Role must be member or admin.' using errcode = '22023';
  end if;
  if target_user_id = (select auth.uid()) then
    raise exception 'You cannot change your own role.' using errcode = '42501';
  end if;
  update public.profiles set role = new_role where id = target_user_id and family_id = actor_family;
  if not found then raise exception 'Family profile not found.' using errcode = 'P0002'; end if;
end;
$$;
revoke all on function public.set_family_role(uuid, text) from public, anon;
grant execute on function public.set_family_role(uuid, text) to authenticated;

alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.chores enable row level security;
alter table public.vacations enable row level security;
alter table public.grades enable row level security;

create policy "family members read their family" on public.families for select to authenticated using (public.is_family_member(id));
create policy "profiles are private to owner and super admin" on public.profiles for select to authenticated using (id = (select auth.uid()) or public.is_super_admin(family_id));

create policy "family members read events" on public.events for select to authenticated using (public.is_family_member(family_id));
create policy "admins manage events" on public.events for all to authenticated using (public.can_manage_family(family_id)) with check (public.can_manage_family(family_id));
create policy "family members read chores" on public.chores for select to authenticated using (public.is_family_member(family_id));
create policy "admins manage chores" on public.chores for all to authenticated using (public.can_manage_family(family_id)) with check (public.can_manage_family(family_id));
create policy "family members read vacations" on public.vacations for select to authenticated using (public.is_family_member(family_id));
create policy "admins manage vacations" on public.vacations for all to authenticated using (public.can_manage_family(family_id)) with check (public.can_manage_family(family_id));
create policy "admins read grades" on public.grades for select to authenticated using (public.can_manage_family(family_id));
create policy "admins manage grades" on public.grades for all to authenticated using (public.can_manage_family(family_id)) with check (public.can_manage_family(family_id));

grant select on public.families, public.profiles, public.events, public.chores, public.vacations, public.grades to authenticated;
grant insert, update, delete on public.events, public.chores, public.vacations, public.grades to authenticated;

-- Keep client role changes behind the security-definer RPC above.
revoke insert, update, delete on public.profiles, public.families from anon, authenticated;
