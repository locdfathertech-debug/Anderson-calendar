import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync(new URL("../supabase/sql/recurring_routines_review.sql",import.meta.url),"utf8");
test("routine tables are scoped by family membership, live sessions and parent PIN",()=>{
  assert.match(sql,/alter table public\.routine_templates enable row level security/i);
  assert.match(sql,/alter table public\.routine_occurrences enable row level security/i);
  assert.match(sql,/private\.live_portal_session\(\) is not null/i);
  assert.match(sql,/private\.is_family_member\(family_id\)/i);
  assert.match(sql,/private\.can_manage_family\(family_id\)/i);
  assert.match(sql,/assigned_user_id uuid not null references auth\.users\(id\)/i);
  assert.match(sql,/p\.id=assigned_user_id and p\.family_id=routine_templates\.family_id/i);
  assert.match(sql,/revoke all on public\.routine_occurrences from public, anon, authenticated/i);
});
test("server-only generation verifies parent and prevents repeated due instances",()=>{
  assert.match(sql,/create or replace function public\.materialize_family_routines\(target_day date\)/i);
  assert.match(sql,/security definer set search_path=''/i);
  assert.match(sql,/private\.can_manage_family\(v_family\)/i);
  assert.match(sql,/unique\(template_id,due_date\)/i);
  assert.match(sql,/pg_advisory_xact_lock/i);
  assert.match(sql,/status','open'/i);
  assert.match(sql,/grant execute on function public\.materialize_family_routines\(date\) to authenticated/i);
  assert.doesNotMatch(sql,/grant\s+delete\b[^;]*to authenticated/i);
});
test("templates can only be paused after creation, no client status/payment changes",()=>{
  assert.match(sql,/grant update\(enabled\) on public\.routine_templates to authenticated/i);
  assert.doesNotMatch(sql,/grant update\([^)]*amount[^)]*\)/i);
  assert.match(sql,/returns integer/i);
});

test("realtime publication block uses valid PostgreSQL dollar quoting",()=>{
  assert.match(sql,/do \\$\\$[\\s\\S]*?end \\$\\$;/i);
  assert.doesNotMatch(sql,/\\bdo \\$(?!\\$)/i);
  assert.match(sql,/alter publication supabase_realtime add table public\\.routine_templates/i);
});
test("only authenticated actors receive the parent-authorized function",()=>{
  assert.match(sql,/revoke all on function public\\.materialize_family_routines\\(date\\) from public, anon, authenticated/i);
  assert.match(sql,/grant execute on function public\\.materialize_family_routines\\(date\\) to authenticated/i);
});
