-- Parent Portal: server-enforced, session-bound elevation. Apply as database owner.
-- No default PIN. The first verified parent configures a 6–12 digit PIN.
create table if not exists private.family_portal_security (
  family_id uuid primary key references public.families(id) on delete cascade,
  pin_hash text not null,
  updated_at timestamptz not null default statement_timestamp()
);
create table if not exists private.parent_portal_grants (
  session_id uuid primary key references auth.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  token_hash bytea not null,
  expires_at timestamptz not null
);
create index if not exists parent_portal_grants_family_idx on private.parent_portal_grants(family_id);
create index if not exists parent_portal_grants_user_idx on private.parent_portal_grants(user_id);
create table if not exists private.parent_pin_attempts (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  failures integer not null default 0 check (failures >= 0),
  locked_until timestamptz,
  primary key(family_id,user_id)
);
create index if not exists parent_pin_attempts_user_idx on private.parent_pin_attempts(user_id);
alter table private.family_portal_security enable row level security;
alter table private.parent_portal_grants enable row level security;
alter table private.parent_pin_attempts enable row level security;
revoke all on private.family_portal_security,private.parent_portal_grants,private.parent_pin_attempts from public,anon,authenticated;

create or replace function private.live_portal_session() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare sid text := auth.jwt()->>'session_id'; result uuid;
begin
  if auth.uid() is null or sid is null or sid !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then return null; end if;
  select s.id into result from auth.sessions s join auth.users u on u.id=s.user_id
  where s.id=sid::uuid and s.user_id=auth.uid()
    and (s.not_after is null or s.not_after>statement_timestamp())
    and u.email is not null and u.email_confirmed_at is not null
    and not coalesce(u.is_anonymous,false) and u.deleted_at is null
    and (u.banned_until is null or u.banned_until<=statement_timestamp());
  return result;
end $$;

create or replace function private.parent_portal_unlocked(target_family uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare token text; sid uuid := private.live_portal_session();
begin
  if sid is null then return false; end if;
  begin
    token := nullif(current_setting('request.headers',true),'')::jsonb->>'x-parent-unlock';
  exception when invalid_text_representation then return false; end;
  if token is null or token !~ '^[0-9a-f]{64}$' then return false; end if;
  return exists (
    select 1 from private.parent_portal_grants g join public.profiles p on p.id=g.user_id
    where g.session_id=sid and g.user_id=auth.uid() and g.family_id=target_family
      and p.family_id=target_family and p.role in ('admin','super_admin')
      and g.expires_at>statement_timestamp()
      and g.token_hash=extensions.digest(token,'sha256')
  );
end $$;

create or replace function private.can_manage_family(target_family uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.parent_portal_unlocked(target_family);
$$;
create or replace function private.is_super_admin(target_family uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.parent_portal_unlocked(target_family) and exists (
    select 1 from public.profiles where id=auth.uid() and family_id=target_family and role='super_admin'
  );
$$;

-- Internal issuance is owner-only. Plaintext tokens are returned once, never stored.
create or replace function private.issue_parent_grant(family uuid, caller uuid, sid uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare token text := encode(extensions.gen_random_bytes(32),'hex'); expiry timestamptz := statement_timestamp()+interval '15 minutes';
begin
  insert into private.parent_portal_grants(session_id,user_id,family_id,token_hash,expires_at)
  values(sid,caller,family,extensions.digest(token,'sha256'),expiry)
  on conflict(session_id) do update set user_id=excluded.user_id,family_id=excluded.family_id,token_hash=excluded.token_hash,expires_at=excluded.expires_at;
  return jsonb_build_object('ok',true,'token',token,'expires_at',expiry);
end $$;
revoke all on function private.issue_parent_grant(uuid,uuid,uuid) from public,anon,authenticated;

create or replace function private.parent_portal_status() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare family uuid; parent boolean; unlocked boolean; expiry timestamptz;
begin
  if private.live_portal_session() is null then raise exception 'Verified sign-in required' using errcode='42501'; end if;
  select p.family_id,p.role in ('admin','super_admin') into family,parent from public.profiles p where p.id=auth.uid();
  unlocked := coalesce(parent,false) and private.parent_portal_unlocked(family);
  if unlocked then select g.expires_at into expiry from private.parent_portal_grants g where g.session_id=private.live_portal_session(); end if;
  return jsonb_build_object('is_parent',coalesce(parent,false),'configured',exists(select 1 from private.family_portal_security s where s.family_id=family),'unlocked',unlocked,'expires_at',expiry);
end $$;

create or replace function private.set_parent_pin(new_pin text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare family uuid; sid uuid := private.live_portal_session();
begin
  if sid is null then raise exception 'Verified sign-in required' using errcode='42501'; end if;
  select p.family_id into family from public.profiles p where p.id=auth.uid() and p.role in ('admin','super_admin');
  if family is null then raise exception 'Parent access required' using errcode='42501'; end if;
  if new_pin is null or new_pin !~ '^[0-9]{6,12}$' then raise exception 'PIN must contain 6 to 12 digits' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('parent-portal:'||family::text,0));
  if exists(select 1 from private.family_portal_security s where s.family_id=family) and not private.parent_portal_unlocked(family) then
    raise exception 'Unlock Parent Portal before changing PIN' using errcode='42501';
  end if;
  insert into private.family_portal_security(family_id,pin_hash) values(family,extensions.crypt(new_pin,extensions.gen_salt('bf',10)))
  on conflict(family_id) do update set pin_hash=excluded.pin_hash,updated_at=statement_timestamp();
  delete from private.parent_portal_grants g where g.family_id=family;
  delete from private.parent_pin_attempts a where a.family_id=family;
  return private.issue_parent_grant(family,auth.uid(),sid);
end $$;

create or replace function private.unlock_parent_portal(pin text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare family uuid; sid uuid := private.live_portal_session(); hashed text; failure_count integer; until_time timestamptz;
begin
  if sid is null then raise exception 'Verified sign-in required' using errcode='42501'; end if;
  select p.family_id into family from public.profiles p where p.id=auth.uid() and p.role in ('admin','super_admin');
  if family is null then raise exception 'Parent access required' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('parent-portal:'||family::text,0));
  select s.pin_hash into hashed from private.family_portal_security s where s.family_id=family;
  if hashed is null then return jsonb_build_object('ok',false,'configured',false); end if;
  insert into private.parent_pin_attempts(family_id,user_id) values(family,auth.uid()) on conflict do nothing;
  select a.failures,a.locked_until into failure_count,until_time from private.parent_pin_attempts a where a.family_id=family and a.user_id=auth.uid() for update;
  if until_time>statement_timestamp() then
    return jsonb_build_object('ok',false,'retry_after',ceil(extract(epoch from until_time-statement_timestamp()))::integer);
  end if;
  if until_time is not null then failure_count:=0; end if;
  if pin is null or pin !~ '^[0-9]{6,12}$' or extensions.crypt(pin,hashed)<>hashed then
    failure_count:=failure_count+1;
    until_time:=case when failure_count>=5 then statement_timestamp()+interval '5 minutes' else null end;
    update private.parent_pin_attempts a set failures=failure_count,locked_until=until_time where a.family_id=family and a.user_id=auth.uid();
    -- Return, rather than raise: persist failed attempts when the RPC commits.
    return jsonb_build_object('ok',false,'retry_after',case when until_time is null then 0 else 300 end);
  end if;
  delete from private.parent_pin_attempts a where a.family_id=family and a.user_id=auth.uid();
  return private.issue_parent_grant(family,auth.uid(),sid);
end $$;

create or replace function private.lock_parent_portal() returns void
language plpgsql volatile security definer set search_path = '' as $$
declare sid uuid := private.live_portal_session();
begin
  if sid is null then raise exception 'Verified sign-in required' using errcode='42501'; end if;
  delete from private.parent_portal_grants g where g.session_id=sid and g.user_id=auth.uid();
end $$;

-- Exposed invoker wrappers; private implementations are not in the API schema.
create or replace function public.parent_portal_status() returns jsonb language sql stable security invoker set search_path='' as $$ select private.parent_portal_status(); $$;
create or replace function public.set_parent_pin(new_pin text) returns jsonb language sql volatile security invoker set search_path='' as $$ select private.set_parent_pin(new_pin); $$;
create or replace function public.unlock_parent_portal(pin text) returns jsonb language sql volatile security invoker set search_path='' as $$ select private.unlock_parent_portal(pin); $$;
create or replace function public.lock_parent_portal() returns void language sql volatile security invoker set search_path='' as $$ select private.lock_parent_portal(); $$;

create or replace function public.set_family_role(target_user_id uuid,new_role text) returns void
language plpgsql security definer set search_path='' as $$
declare actor_family uuid := private.current_family_id();
begin
  if auth.uid() is null or actor_family is null or not private.is_super_admin(actor_family) then raise exception 'Unlocked family owner required' using errcode='42501'; end if;
  if new_role not in ('member','admin') or new_role is null then raise exception 'Invalid role' using errcode='22023'; end if;
  if target_user_id=auth.uid() then raise exception 'Cannot change own role' using errcode='42501'; end if;
  update public.profiles set role=new_role where id=target_user_id and family_id=actor_family and role<>'super_admin';
  if not found then raise exception 'Family member not found' using errcode='P0002'; end if;
end $$;

revoke all on function private.live_portal_session(),private.parent_portal_unlocked(uuid),private.can_manage_family(uuid),private.is_super_admin(uuid),private.parent_portal_status(),private.set_parent_pin(text),private.unlock_parent_portal(text),private.lock_parent_portal() from public,anon;
grant execute on function private.live_portal_session(),private.parent_portal_unlocked(uuid),private.can_manage_family(uuid),private.is_super_admin(uuid),private.parent_portal_status(),private.set_parent_pin(text),private.unlock_parent_portal(text),private.lock_parent_portal() to authenticated;
revoke all on function public.parent_portal_status(),public.set_parent_pin(text),public.unlock_parent_portal(text),public.lock_parent_portal(),public.set_family_role(uuid,text) from public,anon;
grant execute on function public.parent_portal_status(),public.set_parent_pin(text),public.unlock_parent_portal(text),public.lock_parent_portal(),public.set_family_role(uuid,text) to authenticated;
