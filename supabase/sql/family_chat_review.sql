-- Review-only migration. Apply to isolated staging and pass two-family RLS
-- and authenticated acceptance before promoting to production.
-- Existing app uses families/profiles/planner_records, NOT family_members.
begin;

create table if not exists public.family_messages (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists family_messages_family_created_idx
  on public.family_messages(family_id, created_at desc, id desc);
create index if not exists family_messages_sender_idx
  on public.family_messages(sender_id);

alter table public.family_messages enable row level security;
revoke all on public.family_messages from public, anon;
grant select, insert on public.family_messages to authenticated;

drop policy if exists "family_messages_read_own_family" on public.family_messages;
create policy "family_messages_read_own_family" on public.family_messages
  for select to authenticated
  using (private.live_portal_session() is not null and private.is_family_member(family_id));

drop policy if exists "family_messages_post_as_self" on public.family_messages;
create policy "family_messages_post_as_self" on public.family_messages
  for insert to authenticated
  with check (
    private.live_portal_session() is not null
    and sender_id = (select auth.uid())
    and private.is_family_member(family_id)
  );

-- No UPDATE, DELETE, or AI/system impersonation grants for browser clients.
-- AI responses are local suggestions; server-originated AI messages, scheduled
-- alerts and payouts require an independently authenticated backend in future.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public' and tablename='family_messages'
  ) then
    alter publication supabase_realtime add table public.family_messages;
  end if;
end $$;
commit;
