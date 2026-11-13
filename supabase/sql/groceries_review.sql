-- STAGING-ONLY, requires independently validated families/profiles/auth.
-- UPDATE-based archival avoids Realtime DELETE payloads, which do not honor SELECT RLS.
-- Never apply to the production project before Parent A / Child A / Parent B RLS tests.
begin;
create table if not exists public.groceries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  item text not null check (char_length(btrim(item)) between 1 and 120),
  completed boolean not null default false,
  added_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  archived_at timestamptz,
  constraint groceries_archive_requires_completion check (archived_at is null or completed),
  constraint groceries_completed_at_consistency check
    ((completed and completed_at is not null) or (not completed and completed_at is null))
);
create index if not exists groceries_family_created_idx
  on public.groceries (family_id, created_at desc, id desc);
create index if not exists groceries_active_family_created_idx
  on public.groceries (family_id, created_at desc, id desc)
  where archived_at is null;
alter table public.groceries enable row level security;
revoke all on public.groceries from public, anon, authenticated;
grant select,insert on public.groceries to authenticated;
drop policy if exists "groceries_family_select" on public.groceries;
create policy "groceries_family_select" on public.groceries
  for select to authenticated
  using (private.live_portal_session() is not null and private.is_family_member(family_id));
drop policy if exists "groceries_family_insert" on public.groceries;
create policy "groceries_family_insert" on public.groceries
  for insert to authenticated
  with check (
    private.live_portal_session() is not null
    and private.is_family_member(family_id)
    and added_by = (select auth.uid())
    and completed = false
    and completed_at is null
    and archived_at is null
  );
drop policy if exists "groceries_family_update" on public.groceries;
create policy "groceries_family_update" on public.groceries
  for update to authenticated
  using (private.live_portal_session() is not null and private.is_family_member(family_id))
  with check (private.live_portal_session() is not null and private.is_family_member(family_id));
-- No client DELETE policy: Supabase Postgres Changes DELETE payloads bypass row RLS.
-- Archive completed records with an UPDATE instead, so Realtime respects SELECT RLS.
-- Restrict which fields can be changed: no user may transfer a grocery item to
-- another household, change its owner, or forge a new creation timestamp.
revoke update on public.groceries from authenticated;
grant update(completed,completed_at,archived_at) on public.groceries to authenticated;
do $$
begin
  if not exists (select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename='groceries') then
    alter publication supabase_realtime add table public.groceries;
  end if;
end $$;
commit;
