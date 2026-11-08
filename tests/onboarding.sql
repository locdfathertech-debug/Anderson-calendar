begin;
create temp table onboarding_qa as select gen_random_uuid() owner_id,gen_random_uuid() child_id,gen_random_uuid() outsider_id,gen_random_uuid() unverified_id;
grant select on onboarding_qa to authenticated;
-- Exercise auth.users trigger insertion with rollback-only data. No email is sent.
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
select owner_id,'owner-'||owner_id||'@example.invalid',now(),'{"role":"super_admin","family_id":"00000000-0000-0000-0000-000000000001"}'::jsonb from onboarding_qa
union all select child_id,'child-'||child_id||'@example.invalid',now(),'{"role":"super_admin"}'::jsonb from onboarding_qa
union all select outsider_id,'outsider-'||outsider_id||'@example.invalid',now(),'{}'::jsonb from onboarding_qa
union all select unverified_id,'unverified-'||unverified_id||'@example.invalid',null,'{}'::jsonb from onboarding_qa;
reset role;
do $$begin
 if (select count(*) from public.profiles where id in (select owner_id from onboarding_qa union all select child_id from onboarding_qa union all select outsider_id from onboarding_qa union all select unverified_id from onboarding_qa) and family_id is null and role='member') <> 4
 then raise exception 'New user profile or metadata isolation failed';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select unverified_id::text from onboarding_qa),true);
do $$begin
 begin perform public.create_family('Blocked');raise exception 'Unverified user created family';exception when insufficient_privilege then null;end;
 begin perform public.accept_family_authorization();raise exception 'Unverified user joined family';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',(select owner_id::text from onboarding_qa),true);
do $$declare f uuid;begin
 f:=public.create_family('QA family');
 if not exists(select 1 from public.profiles where id=auth.uid() and family_id=f and role='super_admin') then raise exception 'Owner creation failed';end if;
 begin perform public.create_family('Duplicate');raise exception 'Duplicate onboarding succeeded';exception when unique_violation then null;end;
 insert into public.family_access(email,family_id,role)
 select 'child-'||child_id||'@example.invalid',f,'member' from onboarding_qa;
 insert into public.planner_records(family_id,kind,data) values(f,'event','{"title":"Private plan","date":"2026-11-08"}');
end $$;
select set_config('request.jwt.claim.sub',(select outsider_id::text from onboarding_qa),true);
do $$begin
 if exists(select 1 from public.families) or exists(select 1 from public.planner_records) then raise exception 'Unattached account accessed a family';end if;
 begin perform public.accept_family_authorization();raise exception 'Outsider joined without authorization';exception when insufficient_privilege then null;end;
 perform public.create_family('Different family');
 if exists(select 1 from public.planner_records) then raise exception 'Different family leaked records';end if;
end $$;
select set_config('request.jwt.claim.sub',(select child_id::text from onboarding_qa),true);
do $$begin
 perform public.accept_family_authorization();
 if not exists(select 1 from public.profiles where id=auth.uid() and role='member' and family_id is not null) then raise exception 'Join role assignment failed';end if;
 if (select count(*) from public.planner_records) <> 1 then raise exception 'Joined family read failed';end if;
 begin perform public.set_family_role(auth.uid(),'admin');raise exception 'Member elevated role';exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$begin
 if exists(select 1 from public.family_access where email=(select 'child-'||child_id||'@example.invalid' from onboarding_qa)) then raise exception 'Authorization was not consumed';end if;
end $$;
set local role anon;
do $$begin
 begin perform public.create_family('Anonymous');raise exception 'Anonymous create permitted';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: Auth trigger user insert, metadata isolation, verification, family creation, duplicate prevention, authorization consumption, tenant isolation, role protection, anonymous denial; test data rolled back' as result;
