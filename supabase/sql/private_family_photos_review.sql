-- REVIEW ONLY. Do not apply to the production Supabase project until
-- authenticated family-isolation and Parent PIN grant tests pass.
-- Parent-gated uploads depend on Storage forwarding x-parent-unlock in request.headers.
-- Expected object key: <family-uuid>/<random-uuid>.jpg.
begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('family-photos', 'family-photos', false, 262144, array['image/jpeg'])
on conflict (id) do update set
  public = false,
  file_size_limit = 262144,
  allowed_mime_types = array['image/jpeg'];

drop policy if exists "Family photos private read" on storage.objects;
create policy "Family photos private read" on storage.objects
for select to authenticated
using (
  bucket_id = 'family-photos'
  and (storage.foldername(name))[1] = private.current_family_id()::text
  and private.is_family_member(private.current_family_id())
);

drop policy if exists "Parent-only family photo upload" on storage.objects;
create policy "Parent-only family photo upload" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'family-photos'
  and (storage.foldername(name))[1] = private.current_family_id()::text
  and storage.filename(name) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.jpg$'
  and owner_id = (select auth.uid()::text)
  and private.can_manage_family(private.current_family_id())
);
-- No UPDATE/DELETE policies: photo uploads use immutable random keys; old
-- objects require a separate audited/authorized cleanup process.
commit;
