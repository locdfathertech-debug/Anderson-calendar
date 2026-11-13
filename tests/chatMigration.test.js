import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// This is a static guard, NOT a substitute for authenticated multi-tenant
// RLS/Realtime acceptance in the isolated Supabase staging project.
const migration = readFileSync(new URL("../supabase/sql/family_chat_review.sql",import.meta.url),"utf8");

test("chat migration requires signed-in identity, current family and RLS",()=>{
  assert.match(migration,/alter table public\.family_messages enable row level security/i);
  assert.match(migration,/sender_id\s*=\s*\(select auth\.uid\(\)\)/i);
  assert.match(migration,/private\.is_family_member\(family_id\)/i);
  assert.match(migration,/private\.live_portal_session\(\) is not null/i);
  assert.match(migration,/for select to authenticated/i);
  assert.match(migration,/for insert to authenticated/i);
  assert.match(migration,/revoke all on public\.family_messages from public, anon/i);
});
test("chat message length, limited privileges and tenant history index remain",()=>{
  assert.match(migration,/char_length\(btrim\(body\)\) between 1 and 2000/i);
  assert.match(migration,/grant select, insert on public\.family_messages to authenticated/i);
  assert.doesNotMatch(migration,/grant\s+(?:all|update|delete|truncate|references)\b[^;]*to authenticated/i);
  assert.match(migration,/family_messages_family_created_idx/i);
  assert.match(migration,/alter publication supabase_realtime add table public\.family_messages/i);
});
