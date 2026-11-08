import test from 'node:test';
import assert from 'node:assert/strict';
import { setParentGrant, clearParentGrant, getParentToken, createParentFetch } from '../src/lib/parentAccess.js';
test('unlock token only accompanies this project REST requests and expires on lock', async () => {
  const requests = [];
  const fetcher = createParentFetch('https://family.supabase.co', async (_, init) => requests.push(init.headers));
  setParentGrant({ token: 'a'.repeat(64), expires_at: new Date(Date.now() + 60000).toISOString() });
  await fetcher('https://family.supabase.co/rest/v1/planner_records', { headers: { authorization: 'Bearer jwt' } });
  assert.equal(requests[0].get('x-parent-unlock'), 'a'.repeat(64));
  assert.equal(requests[0].get('authorization'), 'Bearer jwt');
  for (const url of ['https://family.supabase.co/auth/v1/user', 'https://other.supabase.co/rest/v1/data', 'https://example.com/video']) {
    await fetcher(url, { headers: { 'x-parent-unlock': 'forged' } });
    assert.equal(requests.at(-1).get('x-parent-unlock'), null);
  }
  assert.equal(getParentToken(Date.now() + 120000), null);
  setParentGrant({ token: 'b'.repeat(64), expires_at: new Date(Date.now() + 60000).toISOString() });
  clearParentGrant();
  await fetcher('https://family.supabase.co/rest/v1/planner_records');
  assert.equal(requests.at(-1).get('x-parent-unlock'), null);
  assert.throws(() => setParentGrant({ token: '1234', expires_at: new Date().toISOString() }));
});
