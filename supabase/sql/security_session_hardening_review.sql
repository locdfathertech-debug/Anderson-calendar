-- ISOLATED STAGING REVIEW — never execute on production without explicit
-- release approval, backed-up migration plan and authenticated isolation QA.
-- Close the gap where a revoked Supabase session's still-valid JWT can use
-- family-scoped shared read policies or submit a child chore.
begin;

create or replace function private.is_family_member(target_family uuid)
returns boolean language sql stable security definer set search_path=''
as $audit$
  select private.live_portal_session() is not null
    and exists (
      select 1 from public.profiles p
      where p.id=(select auth.uid()) and p.family_id=target_family
    );
$audit$;

-- The existing profiles policy permits own-record SELECT based solely on
-- auth.uid(). Require a live session, including after explicit sign-out.
drop policy if exists "profiles are private to owner and super admin" on public.profiles;
create policy "profiles are private to owner and super admin" on public.profiles
for select to authenticated using (
  private.live_portal_session() is not null
  and (id=(select auth.uid()) or private.is_super_admin(family_id))
);

-- An authenticated, revoked token must not create families even if its
-- email was once verified. Preserve existing registration validations.
create or replace function public.create_family(family_name text)
returns uuid language plpgsql security definer set search_path=''
as $audit$
declare
  caller uuid:=auth.uid();
  current_family uuid;
  new_family uuid;
  clean_name text:=btrim(family_name);
begin
  if private.live_portal_session() is null or caller is null or not exists (
    select 1 from auth.users where id=caller and email is not null
      and email_confirmed_at is not null and coalesce(is_anonymous,false)=false
      and deleted_at is null and (banned_until is null or banned_until<now())
  ) then
    raise exception 'Verify your email before setting up a family.' using errcode='42501';
  end if;
  if clean_name is null or length(clean_name) not between 1 and 120 then
    raise exception 'Family name must contain 1 to 120 characters.' using errcode='22023';
  end if;
  select family_id into current_family from public.profiles where id=caller for update;
  if not found then raise exception 'Your profile is unavailable.' using errcode='P0002'; end if;
  if current_family is not null then raise exception 'You already belong to a family.' using errcode='23505'; end if;
  insert into public.families(name) values(clean_name) returning id into new_family;
  update public.profiles set family_id=new_family,role='super_admin',
    email=(select lower(email) from auth.users where id=caller) where id=caller;
  return new_family;
end;
$audit$;

create or replace function public.accept_family_authorization()
returns uuid language plpgsql security definer set search_path=''
as $audit$
declare
  caller uuid:=auth.uid();
  verified_email text;
  current_family uuid;
  authorized_family uuid;
  authorized_role text;
begin
  if private.live_portal_session() is null then
    raise exception 'Verified sign-in required.' using errcode='42501';
  end if;
  select lower(email) into verified_email from auth.users
  where id=caller and email_confirmed_at is not null and email is not null
    and coalesce(is_anonymous,false)=false and deleted_at is null
    and (banned_until is null or banned_until<now());
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
$audit$;

-- Restore only the intentional auth role EXECUTE privileges after rewriting.
revoke all on function private.is_family_member(uuid) from public,anon,authenticated;
grant execute on function private.is_family_member(uuid) to authenticated;
revoke all on function public.create_family(text) from public,anon,authenticated;
grant execute on function public.create_family(text) to authenticated;
revoke all on function public.accept_family_authorization() from public,anon,authenticated;
grant execute on function public.accept_family_authorization() to authenticated;
commit;
