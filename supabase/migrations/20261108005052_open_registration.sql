-- Registration creates an identity. Family membership requires verified onboarding.
alter table public.profiles alter column family_id drop not null;
alter table public.profiles alter column email drop not null;
alter table public.profiles add constraint unattached_profile_is_member
  check (family_id is not null or role = 'member');

create or replace function public.bootstrap_family_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, email, family_id, role)
  values (new.id, lower(new.email), null, 'member');
  return new;
end;
$$;
revoke all on function public.bootstrap_family_profile() from public, anon, authenticated;

-- Recover any Auth identities that predate the profile trigger.
insert into public.profiles(id,email,family_id,role)
select id,lower(email),null,'member' from auth.users
on conflict(id) do nothing;

create or replace function public.create_family(family_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  current_family uuid;
  new_family uuid;
  clean_name text := btrim(family_name);
begin
  if caller is null or not exists (
    select 1 from auth.users where id=caller and email is not null
      and email_confirmed_at is not null and coalesce(is_anonymous,false)=false
      and deleted_at is null and (banned_until is null or banned_until < now())
  ) then
    raise exception 'Verify your email before setting up a family.' using errcode='42501';
  end if;
  if clean_name is null or length(clean_name) not between 1 and 120 then
    raise exception 'Family name must contain 1 to 120 characters.' using errcode='22023';
  end if;
  select family_id into current_family from public.profiles where id=caller for update;
  if not found then raise exception 'Your profile is unavailable.' using errcode='P0002'; end if;
  if current_family is not null then
    raise exception 'You already belong to a family.' using errcode='23505';
  end if;
  insert into public.families(name) values(clean_name) returning id into new_family;
  update public.profiles set family_id=new_family,role='super_admin',
    email=(select lower(email) from auth.users where id=caller) where id=caller;
  return new_family;
end;
$$;
revoke all on function public.create_family(text) from public,anon;
grant execute on function public.create_family(text) to authenticated;

create or replace function public.accept_family_authorization()
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  verified_email text;
  current_family uuid;
  authorized_family uuid;
  authorized_role text;
begin
  select lower(email) into verified_email from auth.users
  where id=caller and email_confirmed_at is not null and email is not null
    and coalesce(is_anonymous,false)=false and deleted_at is null
    and (banned_until is null or banned_until < now());
  if verified_email is null then
    raise exception 'Verify your email before joining a family.' using errcode='42501';
  end if;
  select family_id into current_family from public.profiles where id=caller for update;
  if not found then raise exception 'Your profile is unavailable.' using errcode='P0002'; end if;
  if current_family is not null then
    raise exception 'You already belong to a family.' using errcode='23505';
  end if;
  select family_id,role into authorized_family,authorized_role
    from public.family_access where email=verified_email for update;
  if not found then
    raise exception 'Ask a parent to authorize this exact sign-in email in their family portal.' using errcode='42501';
  end if;
  update public.profiles set family_id=authorized_family,role=authorized_role,email=verified_email where id=caller;
  delete from public.family_access where email=verified_email;
  return authorized_family;
end;
$$;
revoke all on function public.accept_family_authorization() from public,anon;
grant execute on function public.accept_family_authorization() to authenticated;
