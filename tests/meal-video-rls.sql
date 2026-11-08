begin;
create temp table video_qa as select gen_random_uuid() family, gen_random_uuid() parent,gen_random_uuid() parent_sid, gen_random_uuid() child, gen_random_uuid() outsider;
grant select on video_qa to authenticated;
insert into public.families(id,name) select family,'Rollback video QA' from video_qa;
insert into public.family_access(email,family_id,role)
select 'video-parent-'||parent||'@example.invalid',family,'admin' from video_qa union all
select 'video-child-'||child||'@example.invalid',family,'member' from video_qa;
insert into auth.users(id,email,email_confirmed_at)
select parent,'video-parent-'||parent||'@example.invalid',now() from video_qa union all
select child,'video-child-'||child||'@example.invalid',now() from video_qa;
insert into auth.sessions(id,user_id,created_at,updated_at) select parent_sid,parent,now(),now() from video_qa;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select parent::text from video_qa),true);
select public.accept_family_authorization();
select set_config('request.jwt.claims',(select jsonb_build_object('sub',parent,'session_id',parent_sid,'role','authenticated')::text from video_qa),true);
select set_config('request.headers',jsonb_build_object('x-parent-unlock',public.set_parent_pin('654987')->>'token')::text,true);
insert into public.planner_records(family_id,kind,data)
select family,'meal',jsonb_build_object('title','QA dinner','date',current_date::text,'type','Dinner','video_url','https://www.youtube.com/watch?v=LXb3EKWsInQ') from video_qa;
insert into public.planner_records(family_id,kind,data)
select family,'event',jsonb_build_object('title','QA event','date',current_date::text,'category',category,'video_url','https://vimeo.com/76979871') from video_qa cross join unnest(array['Work','Daycare','Activities']) as category;
select set_config('request.jwt.claim.sub',(select child::text from video_qa),true);
select public.accept_family_authorization();
do $$ declare n int; begin
 select count(*) into n from public.planner_records where kind in ('meal','event');
 if n<>4 then raise exception 'Child cannot read family dinner and layers'; end if;
 update public.planner_records set data=jsonb_set(data,'{video_url}','"https://example.com/changed.mp4"'::jsonb) where kind='meal';
 get diagnostics n=row_count; if n<>0 then raise exception 'Child edited recipe'; end if;
 begin
  insert into public.planner_records(family_id,kind,data) select family,'meal','{"title":"Unauthorized meal"}'::jsonb from video_qa;
  raise exception 'Child inserted a meal';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',(select outsider::text from video_qa),true);
do $$ begin if exists(select 1 from public.planner_records) then raise exception 'Cross-family video leak'; end if; end $$;
reset role;
rollback;
select 'PASS: parent meal/event authoring, child read-only video access, category persistence, cross-family isolation; rolled back' as result;
