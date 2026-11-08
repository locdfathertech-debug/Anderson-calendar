-- Run after supabase/migrations/20261108154017_parent_portal_session_grants.sql. Disposable fixtures; no Auth invites sent.
begin;
create temp table pin_qa as select gen_random_uuid() family,gen_random_uuid() other_family,gen_random_uuid() parent,gen_random_uuid() child,gen_random_uuid() outsider,gen_random_uuid() sid,gen_random_uuid() sid2,gen_random_uuid() child_sid,gen_random_uuid() other_sid,gen_random_uuid() event_id,gen_random_uuid() chore_id,null::jsonb response,null::text token,null::text second_token;
grant select,update on pin_qa to authenticated;
insert into public.families(id,name) select family,'Rollback PIN QA' from pin_qa union all select other_family,'Other rollback family' from pin_qa;
insert into auth.users(id,email,email_confirmed_at) select parent,'pin-parent-'||parent||'@example.invalid',now() from pin_qa union all select child,'pin-child-'||child||'@example.invalid',now() from pin_qa union all select outsider,'pin-other-'||outsider||'@example.invalid',now() from pin_qa;
update public.profiles p set family_id=q.family,role=case when p.id=q.parent then 'super_admin' else 'member' end from pin_qa q where p.id in(q.parent,q.child);
update public.profiles p set family_id=q.other_family,role='super_admin' from pin_qa q where p.id=q.outsider;
insert into auth.sessions(id,user_id,created_at,updated_at) select sid,parent,now(),now() from pin_qa union all select sid2,parent,now(),now() from pin_qa union all select child_sid,child,now(),now() from pin_qa union all select other_sid,outsider,now(),now() from pin_qa;
insert into public.planner_records(id,family_id,kind,data) select event_id,family,'event','{"title":"Keep original"}'::jsonb from pin_qa union all select chore_id,family,'chore',jsonb_build_object('title','Assigned chore','assigned_user_id',child::text,'status','open') from pin_qa;
insert into public.planner_records(family_id,kind,data) select family,'member','{"title":"Child profile","role":"Parent"}'::jsonb from pin_qa union all select family,'budget','{"title":"Private budget"}'::jsonb from pin_qa;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select parent::text from pin_qa),true),set_config('request.jwt.claims',(select jsonb_build_object('sub',parent,'session_id',sid,'role','authenticated')::text from pin_qa),true),set_config('request.headers','{}',true);
do $$ declare n int; begin
 if (public.parent_portal_status()->>'configured')::boolean then raise exception 'Unexpected configured PIN'; end if;
 if private.can_manage_family((select family from pin_qa)) then raise exception 'Unconfigured parent bypass'; end if;
 begin insert into public.planner_records(family_id,kind,data) select family,'event','{"title":"Forbidden"}'::jsonb from pin_qa; raise exception 'Locked insert allowed'; exception when insufficient_privilege then null; end;
 update public.planner_records set data='{"title":"Changed"}' where id=(select event_id from pin_qa); get diagnostics n=row_count; if n<>0 then raise exception 'Locked update allowed'; end if;
 delete from public.planner_records where id=(select event_id from pin_qa); get diagnostics n=row_count; if n<>0 then raise exception 'Locked delete allowed'; end if;
 if exists(select 1 from public.planner_records where family_id=(select family from pin_qa) and kind='budget') then raise exception 'Locked budget read'; end if;
 begin perform public.set_family_role((select child from pin_qa),'admin'); raise exception 'Locked role RPC allowed'; exception when insufficient_privilege then null; end;
 begin perform 1 from private.family_portal_security; raise exception 'Private hash readable'; exception when insufficient_privilege then null; end;
 begin perform public.set_parent_pin('1234'); raise exception 'Short PIN accepted'; exception when invalid_parameter_value then null; end;
end $$;
update pin_qa set response=public.set_parent_pin('593817');
update pin_qa set token=response->>'token';
do $$ begin if private.can_manage_family((select family from pin_qa)) then raise exception 'Issuing token unlocked without header'; end if; end $$;
select set_config('request.headers',(select jsonb_build_object('x-parent-unlock',token)::text from pin_qa),true);
do $$ begin
 if not private.can_manage_family((select family from pin_qa)) then raise exception 'Valid setup token denied'; end if;
 if not (public.parent_portal_status()->>'unlocked')::boolean then raise exception 'Status not unlocked'; end if;
 update public.planner_records set data='{"title":"Parent changed"}' where id=(select event_id from pin_qa);
 if not found then raise exception 'Unlocked write denied'; end if;
 insert into public.family_access(email,family_id,role) select 'pin-test-'||child||'@example.invalid',family,'member' from pin_qa;
 perform public.set_family_role((select child from pin_qa),'admin');
 perform public.set_family_role((select child from pin_qa),'member');
end $$;
-- Same account, different real Auth session cannot replay first token.
select set_config('request.jwt.claims',(select jsonb_build_object('sub',parent,'session_id',sid2,'role','authenticated')::text from pin_qa),true);
do $$ begin if private.can_manage_family((select family from pin_qa)) then raise exception 'Cross-session replay'; end if; end $$;
update pin_qa set response=public.unlock_parent_portal('593817');
update pin_qa set second_token=response->>'token';
select set_config('request.jwt.claims',(select jsonb_build_object('sub',parent,'session_id',sid,'role','authenticated')::text from pin_qa),true);
select public.lock_parent_portal();
do $$ begin
 if private.can_manage_family((select family from pin_qa)) then raise exception 'Lock did not revoke'; end if;
 begin perform public.set_parent_pin('827364'); raise exception 'Locked configured PIN changed'; exception when insufficient_privilege then null; end;
end $$;
-- Wrong attempts return failures without raising and persist across RPC calls/sessions.
update pin_qa set response=public.unlock_parent_portal('000000');
update pin_qa set response=public.unlock_parent_portal('000000');
select set_config('request.jwt.claims',(select jsonb_build_object('sub',parent,'session_id',sid2,'role','authenticated')::text from pin_qa),true);
update pin_qa set response=public.unlock_parent_portal('000000');
update pin_qa set response=public.unlock_parent_portal('000000');
update pin_qa set response=public.unlock_parent_portal('000000');
update pin_qa set response=public.unlock_parent_portal('593817');
do $$ begin if (select (response->>'ok')::boolean or (response->>'retry_after')::integer<=0 from pin_qa) then raise exception 'Correct PIN bypassed lockout'; end if; end $$;
reset role;
do $$ begin if not exists(select 1 from private.parent_pin_attempts a join pin_qa q on q.family=a.family_id and q.parent=a.user_id where a.failures=5 and a.locked_until>statement_timestamp()) then raise exception 'Failure counters not persisted'; end if; end $$;
update private.parent_pin_attempts set locked_until=statement_timestamp()-interval '1 second' where family_id=(select family from pin_qa);
set local role authenticated;
update pin_qa set response=public.unlock_parent_portal('593817');
update pin_qa set token=response->>'token';
select set_config('request.headers',(select jsonb_build_object('x-parent-unlock',token)::text from pin_qa),true);
do $$ begin if not private.can_manage_family((select family from pin_qa)) then raise exception 'Unlock after lockout failed'; end if; end $$;
-- PIN change invalidates all previous session grants.
update pin_qa set response=public.set_parent_pin('827364');
update pin_qa set token=response->>'token';
select set_config('request.jwt.claims',(select jsonb_build_object('sub',parent,'session_id',sid2,'role','authenticated')::text from pin_qa),true),set_config('request.headers',(select jsonb_build_object('x-parent-unlock',second_token)::text from pin_qa),true);
do $$ begin if private.can_manage_family((select family from pin_qa)) then raise exception 'Other-session token survived PIN change'; end if; end $$;
select set_config('request.headers',(select jsonb_build_object('x-parent-unlock',token)::text from pin_qa),true);
do $$ begin if not private.can_manage_family((select family from pin_qa)) then raise exception 'New rotation token denied'; end if; end $$;
-- Children know the PIN and have a display profile labelled Parent, but cannot elevate.
select set_config('request.jwt.claim.sub',(select child::text from pin_qa),true),set_config('request.jwt.claims',(select jsonb_build_object('sub',child,'session_id',child_sid,'role','authenticated')::text from pin_qa),true),set_config('request.headers',(select jsonb_build_object('x-parent-unlock',token)::text from pin_qa),true);
do $$ begin
 if private.can_manage_family((select family from pin_qa)) then raise exception 'Child replayed parent token'; end if;
 begin perform public.unlock_parent_portal('827364'); raise exception 'Child unlocked'; exception when insufficient_privilege then null; end;
 begin perform public.set_parent_pin('827364'); raise exception 'Child set PIN'; exception when insufficient_privilege then null; end;
 if (public.parent_portal_status()->>'is_parent')::boolean then raise exception 'Display role promoted Auth role'; end if;
 perform public.submit_planner_chore((select chore_id from pin_qa));
 if not exists(select 1 from public.planner_records where id=(select chore_id from pin_qa) and data->>'status'='submitted') then raise exception 'Own chore submission broken'; end if;
end $$;
-- Other family's parent cannot replay token or manage first family.
select set_config('request.jwt.claim.sub',(select outsider::text from pin_qa),true),set_config('request.jwt.claims',(select jsonb_build_object('sub',outsider,'session_id',other_sid,'role','authenticated')::text from pin_qa),true);
do $$ begin if private.can_manage_family((select family from pin_qa)) then raise exception 'Cross-family token bypass'; end if; end $$;
-- Expiry and deleted Auth sessions independently deny elevation.
reset role;
update private.parent_portal_grants set expires_at=statement_timestamp()-interval '1 second' where session_id=(select sid2 from pin_qa);
set local role authenticated;
select set_config('request.jwt.claim.sub',(select parent::text from pin_qa),true),set_config('request.jwt.claims',(select jsonb_build_object('sub',parent,'session_id',sid2,'role','authenticated')::text from pin_qa),true);
do $$ begin if private.can_manage_family((select family from pin_qa)) then raise exception 'Expired grant accepted'; end if; end $$;
update pin_qa set response=public.unlock_parent_portal('827364');
update pin_qa set token=response->>'token';
select set_config('request.headers',(select jsonb_build_object('x-parent-unlock',token)::text from pin_qa),true);
reset role;
delete from auth.sessions where id=(select sid2 from pin_qa);
set local role authenticated;
do $$ begin
 if private.can_manage_family((select family from pin_qa)) then raise exception 'Deleted session accepted'; end if;
 begin perform public.unlock_parent_portal('827364'); raise exception 'Deleted session unlocked'; exception when insufficient_privilege then null; end;
 if has_function_privilege('anon','public.unlock_parent_portal(text)','execute') then raise exception 'Anon RPC execute'; end if;
end $$;
reset role;
rollback;
select 'PASS: locked direct CRUD; first setup; header grants; role RPC; PIN throttling across sessions; PIN rotation; child display-role isolation and own chores; cross-family/session replay; expiry; revoked sessions; private hashes; anon ACL. All fixtures rolled back.' as result;
