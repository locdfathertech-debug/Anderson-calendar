-- Run after parent_portal_session_grants. Disposable fixtures; no invitations.
-- The thumbnail is synthetic test data, not a real user's photo.
begin;
create temp table photo_qa as
select gen_random_uuid() family, gen_random_uuid() other_family,
  gen_random_uuid() parent, gen_random_uuid() child, gen_random_uuid() outsider,
  gen_random_uuid() parent_sid, gen_random_uuid() child_sid,
  gen_random_uuid() other_sid, gen_random_uuid() member_id,
  'data:image/jpeg;base64,/9j/AAAA'::text thumbnail,
  null::jsonb response, null::text parent_token;
grant select, update on photo_qa to authenticated;
insert into public.families(id,name)
select family,'Rollback profile photo QA' from photo_qa
union all select other_family,'Other rollback photo family' from photo_qa;
insert into auth.users(id,email,email_confirmed_at)
select parent,'photo-parent-'||parent||'@example.invalid',now() from photo_qa
union all select child,'photo-child-'||child||'@example.invalid',now() from photo_qa
union all select outsider,'photo-other-'||outsider||'@example.invalid',now() from photo_qa;
update public.profiles p set family_id=q.family,
  role=case when p.id=q.parent then 'super_admin' else 'member' end
from photo_qa q where p.id in(q.parent,q.child);
update public.profiles p set family_id=q.other_family,role='super_admin'
from photo_qa q where p.id=q.outsider;
insert into auth.sessions(id,user_id,created_at,updated_at)
select parent_sid,parent,now(),now() from photo_qa
union all select child_sid,child,now(),now() from photo_qa
union all select other_sid,outsider,now(),now() from photo_qa;

set local role authenticated;
select set_config('request.jwt.claim.sub',(select parent::text from photo_qa),true),
  set_config('request.jwt.claims',(select jsonb_build_object('sub',parent,'session_id',parent_sid,'role','authenticated')::text from photo_qa),true),
  set_config('request.headers','{}',true);
update photo_qa set response=public.set_parent_pin('684291');
update photo_qa set parent_token=response->>'token';
select set_config('request.headers',(select jsonb_build_object('x-parent-unlock',parent_token)::text from photo_qa),true);
do $$ begin
  if not private.can_manage_family((select family from photo_qa)) then
    raise exception 'Unlocked parent required for photo test';
  end if;
  insert into public.planner_records(id,family_id,kind,data)
    select member_id,family,'member',jsonb_build_object('title','Photo QA child','role','Child','color','amber','avatar_url',thumbnail)
    from photo_qa;
  if not exists(select 1 from public.planner_records r join photo_qa q on q.member_id=r.id
    where r.data->>'avatar_url'=q.thumbnail) then
    raise exception 'Parent thumbnail round trip failed';
  end if;
  -- Updating an existing thumbnail follows the same elevated parent policy.
  update public.planner_records set data=jsonb_set(data,'{avatar_url}',to_jsonb((select thumbnail from photo_qa)))
    where id=(select member_id from photo_qa);
  if not found then raise exception 'Unlocked parent thumbnail update denied'; end if;
end $$;

-- Locking revokes the parent grant even if the client retains its old header.
select public.lock_parent_portal();
do $$ declare affected integer; begin
  if private.can_manage_family((select family from photo_qa)) then raise exception 'Parent remained unlocked'; end if;
  update public.planner_records set data=jsonb_set(data,'{avatar_url}','"data:image/jpeg;base64,/9j/LOCKED"')
    where id=(select member_id from photo_qa);
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Locked parent changed thumbnail'; end if;
  begin
    insert into public.planner_records(family_id,kind,data)
      select family,'member',jsonb_build_object('title','Forbidden locked photo','avatar_url',thumbnail) from photo_qa;
    raise exception 'Locked parent inserted thumbnail';
  exception when insufficient_privilege then null; end;
  if not exists(select 1 from public.planner_records r join photo_qa q on q.member_id=r.id
    where r.data->>'avatar_url'=q.thumbnail) then raise exception 'Locked parent shared thumbnail read failed'; end if;
end $$;

-- A child can display the family thumbnail but cannot replace or insert one.
select set_config('request.jwt.claim.sub',(select child::text from photo_qa),true),
  set_config('request.jwt.claims',(select jsonb_build_object('sub',child,'session_id',child_sid,'role','authenticated')::text from photo_qa),true),
  set_config('request.headers',(select jsonb_build_object('x-parent-unlock',parent_token)::text from photo_qa),true);
do $$ declare affected integer; begin
  if not exists(select 1 from public.planner_records r join photo_qa q on q.member_id=r.id
    where r.data->>'avatar_url'=q.thumbnail) then raise exception 'Same-family child thumbnail read failed'; end if;
  update public.planner_records set data=jsonb_set(data,'{avatar_url}','"data:image/jpeg;base64,/9j/CHILD"')
    where id=(select member_id from photo_qa);
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Child changed thumbnail'; end if;
  begin
    insert into public.planner_records(family_id,kind,data)
      select family,'member',jsonb_build_object('title','Forbidden child photo','avatar_url',thumbnail) from photo_qa;
    raise exception 'Child inserted thumbnail';
  exception when insufficient_privilege then null; end;
end $$;

-- Even an unlocked parent from another household cannot read/write this photo.
select set_config('request.jwt.claim.sub',(select outsider::text from photo_qa),true),
  set_config('request.jwt.claims',(select jsonb_build_object('sub',outsider,'session_id',other_sid,'role','authenticated')::text from photo_qa),true),
  set_config('request.headers','{}',true);
update photo_qa set response=public.set_parent_pin('937426');
select set_config('request.headers',(select jsonb_build_object('x-parent-unlock',response->>'token')::text from photo_qa),true);
do $$ declare affected integer; begin
  if not private.can_manage_family((select other_family from photo_qa)) then raise exception 'Other parent setup failed'; end if;
  if exists(select 1 from public.planner_records where id=(select member_id from photo_qa)) then raise exception 'Cross-family thumbnail read'; end if;
  update public.planner_records set data=jsonb_set(data,'{avatar_url}','"data:image/jpeg;base64,/9j/OTHER"')
    where id=(select member_id from photo_qa);
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Other family parent changed thumbnail'; end if;
  begin
    insert into public.planner_records(family_id,kind,data)
      select family,'member',jsonb_build_object('title','Forbidden cross-family photo','avatar_url',thumbnail) from photo_qa;
    raise exception 'Other family parent inserted thumbnail';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  if not exists(select 1 from public.planner_records r join photo_qa q on q.member_id=r.id
    where r.data->>'avatar_url'=q.thumbnail) then raise exception 'Thumbnail changed during denied writes'; end if;
end $$;
rollback;
select 'PASS: unlocked parent thumbnail insert/update; exact parent/child shared reads; locked parent, child, and unlocked outsider write denial; cross-family read denial. All fixtures rolled back.' as result;
