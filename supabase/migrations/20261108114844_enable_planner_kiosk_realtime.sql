-- Reuse the family-scoped planner table; preserve existing RLS and grants.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'planner_records') then
    alter publication supabase_realtime add table public.planner_records;
  end if;
end $$;
