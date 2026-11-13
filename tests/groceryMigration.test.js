import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync(new URL("../supabase/sql/groceries_review.sql", import.meta.url),"utf8");
test("grocery migration requires family membership and live Supabase Auth session",()=>{
  assert.match(sql,/alter table public\.groceries enable row level security/i);
  assert.match(sql,/private\.live_portal_session\(\) is not null/i);
  assert.match(sql,/private\.is_family_member\(family_id\)/i);
  assert.match(sql,/added_by = \(select auth\.uid\(\)\)/i);
  assert.match(sql,/family_id uuid not null references public\.families\(id\)/i);
  assert.match(sql,/revoke all on public\.groceries from public, anon/i);
});
test("grocery migration limits update columns and publishes realtime",()=>{
  assert.match(sql,/grant update\(completed,completed_at\) on public\.groceries to authenticated/i);
  assert.match(sql,/alter publication supabase_realtime add table public\.groceries/i);
  assert.match(sql,/char_length\(btrim\(item\)\) between 1 and 120/i);
});
